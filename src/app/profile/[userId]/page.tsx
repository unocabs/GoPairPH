export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import Link from 'next/link';
import type { Profile, Shoe, WishlistItem } from '@/types';

async function getPublicProfile(userId: string) {
  const supabase = createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) return null;

  const [shoesRes, wishlistRes] = await Promise.all([
    supabase
      .from('shoes')
      .select('*, shoe_images(*)')
      .eq('seller_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('wishlist_items')
      .select('*, profiles(*), wishlist_images(*), wishlist_suggestions(count)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    profile: profile as Profile,
    shoes: (shoesRes.data as Shoe[]) ?? [],
    wishlist: (wishlistRes.data as WishlistItem[]) ?? [],
  };
}

async function getCurrentProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
}

export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
  const [data, currentProfileId] = await Promise.all([
    getPublicProfile(params.userId),
    getCurrentProfileId(),
  ]);
  if (!data) notFound();

  const { profile, shoes, wishlist } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 transition-colors">
        ← Back to Browse
      </Link>

      <div className="mb-8">
        <ProfileHeader profile={profile} listingCount={shoes.length} wishlistCount={wishlist.length} />
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Active Listings ({shoes.length})</h2>
        <ListingGrid shoes={shoes} currentProfileId={currentProfileId ?? undefined} emptyMessage="No active listings." />
      </section>

      {wishlist.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-100 mb-4">Wishlist ({wishlist.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map(item => (
              <WishlistCard
                key={item.id}
                item={item}
                isOwner={!!currentProfileId && item.user_id === currentProfileId}
                currentProfileId={currentProfileId ?? undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
