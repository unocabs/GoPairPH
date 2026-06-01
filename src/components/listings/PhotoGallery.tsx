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
  listingPath?: string;
  /** Optional overlay node (e.g. shop logo) rendered on top of the hero image. */
  overlay?: React.ReactNode;
}

export function PhotoGallery({ images, isOwner = false, listingPath, overlay }: PhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  async function handleCopyUrl(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!listingPath) return;

    const url = `${window.location.origin}${listingPath}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
    src: getPublicUrl(supabaseUrl, img.storage_path, 'shoe-images', { width: 1400, quality: 78 }),
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
        {overlay}
        {listingPath && (
          <CopyUrlOverlayButton copied={copied} onClick={handleCopyUrl} />
        )}
      </div>
    );
  }

  const safeIndex = Math.min(selectedIndex, sorted.length - 1);
  const main = sorted[safeIndex];

  return (
    <div className="space-y-3 min-w-0">
      <div className="relative w-full h-[40vh] sm:h-[45vh] lg:h-auto lg:aspect-square">
        <button
          onClick={() => setOpen(true)}
          className="relative w-full h-full overflow-hidden rounded-xl bg-gray-900 block"
        >
          <Image
            src={getPublicUrl(supabaseUrl, main.storage_path, 'shoe-images', { width: 1100, quality: 72 })}
            alt="Main shoe photo"
            fill
            className="object-cover hover:scale-105 transition-transform"
            sizes="(min-width: 1024px) 50vw, 100vw"
            quality={72}
            priority
          />
        </button>
        {overlay}
        {listingPath && (
          <CopyUrlOverlayButton copied={copied} onClick={handleCopyUrl} />
        )}
      </div>

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
                  src={getPublicUrl(supabaseUrl, img.storage_path, 'shoe-images', { width: 160, quality: 48 })}
                  alt={img.view_type}
                  fill
                  className="object-cover"
                  sizes="64px"
                  quality={45}
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

function CopyUrlOverlayButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy listing URL"
      title="Copy listing URL"
      className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/60 text-white shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:bg-black/80 sm:h-11 sm:w-11"
    >
      {copied ? (
        <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
}
