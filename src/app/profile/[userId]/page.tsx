export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCompletedSalesCount } from '@/lib/sales';
import { getSavedListingIds } from '@/lib/savedListings';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { WishlistDeepLinkGrid } from '@/components/wishlist/WishlistDeepLinkGrid';
import Link from 'next/link';
import type { Profile, Shoe, WishlistItem } from '@/types';

async function getPublicProfile(userId: string) {
  const supabase = createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) return null;

  const [shoesRes, wishlistRes] = await Promise.all([
    supabase
      .from('shoes')
      .select('*, shoe_images(*), shops(*), shoe_variants(*)')
      .eq('seller_id', profile.id)
      .eq('status', 'active')
      .eq('has_stock', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('wishlist_items')
      .select('*, wishlist_images(*), wishlist_offers(count)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    profile: profile as Profile,
    shoes: (shoesRes.data as Shoe[]) ?? [],
    wishlist: (wishlistRes.data as WishlistItem[]) ?? [],
  };
}

async function getCurrentProfile(): Promise<{ id: string; isAdmin: boolean; fbUsername: string | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, is_admin, fb_username').eq('user_id', user.id).single();
  return data ? { id: data.id, isAdmin: !!data.is_admin, fbUsername: data.fb_username ?? null } : null;
}

export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
  const [data, currentProfile] = await Promise.all([
    getPublicProfile(params.userId),
    getCurrentProfile(),
  ]);
  if (!data) notFound();

  const { profile, shoes, wishlist } = data;
  const completedSales = await getCompletedSalesCount(profile.id);
  const savedListingIds = await getSavedListingIds(currentProfile?.id ?? null, shoes.map(s => s.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 transition-colors">
        ← Back to Browse
      </Link>

      <div className="mb-8">
        <ProfileHeader profile={profile} listingCount={shoes.length} wishlistCount={wishlist.length} completedSales={completedSales} />
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Active Listings ({shoes.length})</h2>
        <ListingGrid
          shoes={shoes}
          currentProfileId={currentProfile?.id}
          currentProfileIsAdmin={currentProfile?.isAdmin}
          currentProfileFbUsername={currentProfile?.fbUsername}
          savedListingIds={savedListingIds}
          emptyMessage="No active listings."
        />
      </section>

      {wishlist.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-100 mb-4">Find My Pair ({wishlist.length})</h2>
          <WishlistDeepLinkGrid items={wishlist} />
        </section>
      )}
    </div>
  );
}
