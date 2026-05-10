'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SafeShopImage } from '@/components/shop/SafeShopImage';
import { getShopTheme } from '@/lib/shopTheme';
import type { ShopCarouselItem } from '@/types';

interface ShopCarouselProps {
  items: Array<ShopCarouselItem & { imageUrl: string; listingTitle?: string | null }>;
  accentColor: string;
  backgroundColor?: string;
}

export function ShopCarousel({ items, accentColor, backgroundColor }: ShopCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const theme = getShopTheme(backgroundColor, accentColor);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = window.setInterval(() => {
      setIndex(current => (current + 1) % items.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [items.length, paused]);

  if (items.length === 0) return null;

  const goTo = (nextIndex: number) => setIndex((nextIndex + items.length) % items.length);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div
        className="relative aspect-[16/7] min-h-[220px] overflow-hidden rounded-xl border shadow-xl shadow-black/20"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div
          className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map(item => {
            const image = (
              <SafeShopImage
                src={item.imageUrl}
                alt={item.listingTitle ?? 'Shop promotion'}
                className="h-full w-full object-cover"
                logoSize={96}
              />
            );

            return (
              <div key={item.image_storage_path} className="h-full min-w-full">
                {item.listing_id ? (
                  <Link href={`/listings/${item.listing_id}`} className="block h-full w-full">
                    {image}
                  </Link>
                ) : image}
              </div>
            );
          })}
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
              aria-label="Previous carousel image"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
              aria-label="Next carousel image"
            >
              <span aria-hidden="true">›</span>
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
              {items.map((item, itemIndex) => (
                <button
                  key={`${item.image_storage_path}-${itemIndex}`}
                  type="button"
                  onClick={() => goTo(itemIndex)}
                  className="h-2.5 w-2.5 rounded-full border border-white/40 transition"
                  style={{ backgroundColor: itemIndex === index ? theme.accent : 'rgba(255,255,255,0.35)' }}
                  aria-label={`Show carousel image ${itemIndex + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
