export const dynamic = 'force-dynamic';

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { WishlistGrid } from '@/components/wishlist/WishlistGrid';
import { Button } from '@/components/ui/Button';
import type { WishlistItem } from '@/types';

export const metadata: Metadata = {
  title: 'Shoe Wishlist',
  description: 'Runners looking for specific running shoes. Anyone can post a wish or add a link to an offer.',
  alternates: { canonical: '/wishlist' },
};

async function getWishlistItems(): Promise<WishlistItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('wishlist_items')
    .select('*, wishlist_images(*), wishlist_offers(count)')
    .order('created_at', { ascending: false })
    .limit(60);
  return (data as WishlistItem[]) ?? [];
}

export default async function WishlistPage() {
  const items = await getWishlistItems();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Shoe Wishlist</h1>
          <p className="text-sm text-gray-500 mt-1">Runners looking for specific shoes — got a lead? Drop a link.</p>
        </div>
        <Link href="/wishlist/new">
          <Button>+ Post Wishlist</Button>
        </Link>
      </div>

      <WishlistGrid items={items} />
    </div>
  );
}
