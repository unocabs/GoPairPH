export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { ShopHeader } from '@/components/shop/ShopHeader';
import type { Shoe, Shop } from '@/types';

const RECENT_LIMIT = 8;

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

async function getRecentShopListings(shopId: string): Promise<Shoe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('shop_id', shopId)
    .eq('status', 'active')
    .eq('has_stock', true)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT * 2);
  const all = (data as Shoe[]) ?? [];
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return all
    .sort((a, b) => {
      const aPhoto = hasPhoto(a);
      const bPhoto = hasPhoto(b);
      if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, RECENT_LIMIT);
}

async function getShopListingCount(shopId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('shoes')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('status', 'active')
    .eq('has_stock', true);
  return count ?? 0;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const shop = await getShop(params.slug);
  if (!shop) return { title: 'Shop not found' };
  return {
    title: `${shop.name} — Go Pair PH`,
    description: shop.about ?? `Browse running shoes from ${shop.name} on Go Pair PH.`,
    alternates: { canonical: `/shop/${shop.slug}` },
  };
}

export default async function ShopLandingPage({ params }: { params: { slug: string } }) {
  const shop = await getShop(params.slug);
  if (!shop) notFound();

  const [recent, count] = await Promise.all([
    getRecentShopListings(shop.id),
    getShopListingCount(shop.id),
  ]);
  const offerCounts = await getOfferCounts(recent.map(s => s.id));

  return (
    <div>
      <ShopHeader shop={shop} listingCount={count} />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-100">Recent listings</h2>
          {count > RECENT_LIMIT && (
            <Link href={`/shop/${shop.slug}/listings`} className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
              View all →
            </Link>
          )}
        </div>
        <ListingGrid
          shoes={recent}
          offerCounts={offerCounts}
          emptyMessage="This shop hasn't posted any listings yet."
        />
      </section>
    </div>
  );
}
