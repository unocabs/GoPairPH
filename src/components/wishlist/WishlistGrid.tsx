'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WishlistCard } from './WishlistCard';
import { WishlistItemModal } from './WishlistItemModal';
import type { WishlistItem } from '@/types';

interface WishlistGridProps {
  items: WishlistItem[];
}

function getOfferCount(item: WishlistItem): number {
  const offers = item.wishlist_offers;
  if (!offers) return 0;
  if (Array.isArray(offers)) {
    const first = offers[0] as unknown;
    if (first && typeof first === 'object' && 'count' in (first as object)) {
      return (first as { count: number }).count ?? 0;
    }
  }
  return 0;
}

export function WishlistGrid({ items }: WishlistGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get('item');
  const [activeItem, setActiveItem] = useState<WishlistItem | null>(null);

  useEffect(() => {
    if (!activeId) {
      setActiveItem(null);
      return;
    }
    const inMemory = items.find(i => i.id === activeId);
    if (inMemory) {
      setActiveItem(inMemory);
      return;
    }
    // Deep-link to an item that wasn't in the loaded slice — hydrate from API.
    let cancelled = false;
    fetch(`/api/wishlist/${activeId}`)
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (!cancelled && body?.item) setActiveItem(body.item as WishlistItem);
      })
      .catch(() => { /* leave modal closed if hydration fails */ });
    return () => { cancelled = true; };
  }, [activeId, items]);

  function handleOpen(item: WishlistItem) {
    router.replace(`/wishlist?item=${item.id}`, { scroll: false });
  }

  function handleClose() {
    router.replace('/wishlist', { scroll: false });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <span className="text-4xl opacity-50">🔍</span>
        <p className="mt-3 text-gray-500">No wishlist items yet. Be the first to post what you&apos;re looking for!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <WishlistCard
            key={item.id}
            item={item}
            offerCount={getOfferCount(item)}
            onOpen={handleOpen}
          />
        ))}
      </div>
      {activeItem && (
        <WishlistItemModal initialItem={activeItem} onClose={handleClose} />
      )}
    </>
  );
}
