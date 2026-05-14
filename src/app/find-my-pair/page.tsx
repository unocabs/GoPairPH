export const dynamic = 'force-dynamic';

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { WishlistGrid } from '@/components/wishlist/WishlistGrid';
import { Button } from '@/components/ui/Button';
import type { WishlistItem } from '@/types';

export const metadata: Metadata = {
  title: 'Find My Pair',
  description: 'Looking for a specific running shoe? Post it here and let the community drop available links from Go Pair PH, Facebook Marketplace, shop pages, and more.',
  alternates: { canonical: '/find-my-pair' },
};

async function getPairRequests(): Promise<WishlistItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('wishlist_items')
    .select('*, wishlist_images(*), wishlist_offers(count)')
    .order('created_at', { ascending: false })
    .limit(60);
  return (data as WishlistItem[]) ?? [];
}

export default async function FindMyPairPage() {
  const items = await getPairRequests();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Find My Pair</h1>
          <p className="mt-1 text-sm text-gray-500">
            Looking for a specific running shoe? Post it here and let the community drop available links.
          </p>
        </div>
        <Link href="/find-my-pair/new">
          <Button>Post a Pair Request</Button>
        </Link>
      </div>

      <WishlistGrid items={items} />
    </div>
  );
}
