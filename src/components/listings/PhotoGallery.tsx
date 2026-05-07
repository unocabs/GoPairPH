'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { type ShoeImage } from '@/types';
import { getPublicUrl } from '@/lib/utils';

interface PhotoGalleryProps {
  images: ShoeImage[];
}

export function PhotoGallery({ images }: PhotoGalleryProps) {
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
      <div className="w-full h-[40vh] sm:h-[45vh] lg:h-auto lg:aspect-square rounded-xl bg-gray-900 flex items-center justify-center text-gray-700">
        <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
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
