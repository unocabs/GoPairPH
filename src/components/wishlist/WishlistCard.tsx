'use client';

import Image from 'next/image';
import { type WishlistItem } from '@/types';
import { formatRelativeDate, formatSize, formatPrice, getPublicUrl } from '@/lib/utils';

interface WishlistCardProps {
  item: WishlistItem;
  offerCount: number;
  onOpen: (item: WishlistItem) => void;
}

function priceRangeLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min != null) return `${formatPrice(min)}+`;
  return `Up to ${formatPrice(max!)}`;
}

export function WishlistCard({ item, offerCount, onOpen }: WishlistCardProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const firstImg = item.wishlist_images?.[0];
  const imgUrl = firstImg ? getPublicUrl(supabaseUrl, firstImg.storage_path) : null;

  const sizeLabel = formatSize(item.size_eu, item.size_us, item.size_cm);
  const priceLabel = priceRangeLabel(item.price_min_php, item.price_max_php);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(item);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden cursor-pointer transition-all hover:border-gray-700 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      {imgUrl && (
        <div className="relative aspect-video bg-gray-800 border-b border-gray-800">
          <Image src={imgUrl} alt={`${item.brand} ${item.model}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        </div>
      )}

      <div className="p-4 space-y-3">
        <p className="font-semibold text-gray-100 truncate">{item.brand} {item.model}</p>

        <div className="space-y-1 text-sm">
          {item.color && (
            <p><span className="text-gray-500">Color:</span> <span className="text-gray-300">{item.color}</span></p>
          )}
          {sizeLabel && (
            <p><span className="text-gray-500">Size:</span> <span className="text-gray-300">{sizeLabel}</span></p>
          )}
          {priceLabel && (
            <p><span className="text-gray-500">Budget:</span> <span className="text-teal-400 font-medium">{priceLabel}</span></p>
          )}
          {item.location && (
            <p><span className="text-gray-500">Location:</span> <span className="text-gray-300">{item.location}</span></p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <span className={offerCount > 0
            ? 'inline-flex items-center gap-1.5 rounded-full bg-teal-950 border border-teal-800 px-2.5 py-1 text-xs font-medium text-teal-300'
            : 'text-xs text-gray-500'}>
            {offerCount > 0
              ? `${offerCount} offer${offerCount === 1 ? '' : 's'}`
              : 'No offers yet'}
          </span>
          <span className="text-xs text-gray-600">{formatRelativeDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
