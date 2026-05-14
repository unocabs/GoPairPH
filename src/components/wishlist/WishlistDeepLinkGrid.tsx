'use client';

import { useRouter } from 'next/navigation';
import { WishlistCard } from './WishlistCard';
import type { WishlistItem } from '@/types';

function getOfferCount(item: WishlistItem): number {
  const offers = item.wishlist_offers;
  if (!offers || !Array.isArray(offers)) return 0;
  const first = offers[0] as unknown;
  if (first && typeof first === 'object' && 'count' in (first as object)) {
    return (first as { count: number }).count ?? 0;
  }
  return 0;
}

interface WishlistDeepLinkGridProps {
  items: WishlistItem[];
}

// Renders wishlist cards that route to /wishlist?item=<id> on click — for use
// in places like profile pages where we want to surface wishlist items but
// hand the user off to the canonical wishlist modal.
export function WishlistDeepLinkGrid({ items }: WishlistDeepLinkGridProps) {
  const router = useRouter();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <WishlistCard
          key={item.id}
          item={item}
          offerCount={getOfferCount(item)}
          onOpen={(it) => router.push(`/wishlist?item=${it.id}`)}
        />
      ))}
    </div>
  );
}
