export const dynamic = 'force-dynamic';

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { Button } from '@/components/ui/Button';
import type { WishlistItem } from '@/types';

export const metadata: Metadata = {
  title: 'Shoe Wishlist',
  description: 'Runners in Pampanga looking for specific running shoes. Suggest a match from your listings.',
  alternates: { canonical: '/wishlist' },
};

async function getWishlistItems(): Promise<WishlistItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('wishlist_items')
    .select('*, profiles(*), wishlist_images(*), wishlist_suggestions(count)')
    .order('created_at', { ascending: false })
    .limit(60);
  return (data as WishlistItem[]) ?? [];
}

async function getCurrentProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
}

export default async function WishlistPage() {
  const [items, currentProfileId] = await Promise.all([
    getWishlistItems(),
    getCurrentProfileId(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Shoe Wishlist</h1>
          <p className="text-sm text-gray-500 mt-1">Runners looking for specific shoes — got a match? Suggest it.</p>
        </div>
        {currentProfileId && (
          <Link href="/wishlist/new">
            <Button>+ Post Wishlist</Button>
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
          <span className="text-4xl opacity-50">🔍</span>
          <p className="mt-3 text-gray-500">No wishlist items yet. Be the first to post what you&apos;re looking for!</p>
          {currentProfileId && (
            <Link href="/wishlist/new" className="mt-4">
              <Button variant="outline">Post Wishlist Item</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <WishlistCard
              key={item.id}
              item={item}
              isOwner={!!currentProfileId && item.user_id === currentProfileId}
              currentProfileId={currentProfileId ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
