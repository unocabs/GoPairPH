'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { type ShoeImage } from '@/types';
import { getPublicUrl } from '@/lib/utils';

interface PhotoGalleryProps {
  images: ShoeImage[];
  isOwner?: boolean;
}

export function PhotoGallery({ images, isOwner = false }: PhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Dedupe by view_type — the DB lacks a UNIQUE(shoe_id, view_type) constraint,
  // so historical duplicates exist. Keep the highest `order` (most recently added).
  const byViewType = new Map<string, ShoeImage>();
  for (const img of images) {
    const existing = byViewType.get(img.view_type);
    if (!existing || (img.order ?? 0) > (existing.order ?? 0)) {
      byViewType.set(img.view_type, img);
    }
  }
  const sorted = Array.from(byViewType.values()).sort((a: ShoeImage, b: ShoeImage) => {
    const order = ['top', 'sole', 'front', 'left', 'right', 'back'];
    return order.indexOf(a.view_type) - order.indexOf(b.view_type);
  });

  const slides = sorted.map(img => ({
    src: getPublicUrl(supabaseUrl, img.storage_path),
  }));

  if (sorted.length === 0) {
    return (
      <div className="relative w-full h-[40vh] sm:h-[45vh] lg:h-auto lg:aspect-square overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-800/60 ring-1 ring-gray-700">
          <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7.5A1.5 1.5 0 014.5 6h2.379a1.5 1.5 0 001.06-.44l1.122-1.12A1.5 1.5 0 0110.121 4h3.758a1.5 1.5 0 011.06.44l1.122 1.12a1.5 1.5 0 001.06.44H19.5A1.5 1.5 0 0121 7.5v10.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18V7.5z" />
            <circle cx="12" cy="13" r="3.5" strokeWidth={1.5} />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-400">No photos yet</p>
        {isOwner && (
          <div className="mt-3 max-w-xs space-y-2">
            <p className="text-xs text-gray-500">
              Buyers are much more likely to purchase listings with clear top and sole photos.
            </p>
            <p className="text-xs text-gray-500">
              To add photos, please delete this listing and create a new one.
            </p>
          </div>
        )}
      </div>
    );
  }

  const safeIndex = Math.min(selectedIndex, sorted.length - 1);
  const main = sorted[safeIndex];

  return (
    <div className="space-y-3 min-w-0">
      <button
        onClick={() => setOpen(true)}
        className="relative w-full h-[40vh] sm:h-[45vh] lg:h-auto lg:aspect-square overflow-hidden rounded-xl bg-gray-900 block"
      >
        <Image
          src={getPublicUrl(supabaseUrl, main.storage_path)}
          alt="Main shoe photo"
          fill
          className="object-cover hover:scale-105 transition-transform"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
      </button>

      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => {
            const isActive = i === safeIndex;
            return (
              <button
                key={img.id}
                onClick={() => setSelectedIndex(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  isActive ? 'border-teal-500' : 'border-gray-800 hover:border-teal-500'
                }`}
              >
                <Image
                  src={getPublicUrl(supabaseUrl, img.storage_path)}
                  alt={img.view_type}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
                <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                  <span className="rounded bg-black/50 px-1 text-[10px] text-white capitalize">{img.view_type}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides}
        index={safeIndex}
        on={{ view: ({ index }) => setSelectedIndex(index) }}
      />
    </div>
  );
}
