export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { getSavedListingIds } from '@/lib/savedListings';
import { ListingGrid } from '@/components/listings/ListingGrid';
import type { Shoe, Shop } from '@/types';

async function getShop(slug: string): Promise<Shop | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  return (data as Shop) ?? null;
}

async function getShopListings(shopId: string): Promise<Shoe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('shop_id', shopId)
    .eq('status', 'active')
    .eq('has_stock', true)
    .order('created_at', { ascending: false })
    .limit(120);
  const all = (data as Shoe[]) ?? [];
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return all.sort((a, b) => {
    const aPhoto = hasPhoto(a);
    const bPhoto = hasPhoto(b);
    if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function getCurrentProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.id ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const shop = await getShop(params.slug);
  if (!shop) return { title: 'Shop not found' };
  return {
    title: `Listings — ${shop.name}`,
    description: `All running-shoe listings from ${shop.name}.`,
    alternates: { canonical: `/shop/${shop.slug}/listings` },
  };
}

export default async function ShopListingsPage({ params }: { params: { slug: string } }) {
  const shop = await getShop(params.slug);
  if (!shop) notFound();

  const [listings, profileId] = await Promise.all([
    getShopListings(shop.id),
    getCurrentProfileId(),
  ]);
  const offerCounts = await getOfferCounts(listings.map(s => s.id));
  const savedListingIds = await getSavedListingIds(profileId, listings.map(s => s.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/shop/${shop.slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 transition-colors">
        ← Back to {shop.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">All listings — {shop.name}</h1>
      <ListingGrid
        shoes={listings}
        offerCounts={offerCounts}
        currentProfileId={profileId ?? undefined}
        savedListingIds={savedListingIds}
        emptyMessage="This shop hasn't posted any listings yet."
      />
    </div>
  );
}
