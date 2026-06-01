'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatRelativeDate, formatSize, getListingPath, getPublicUrl } from '@/lib/utils';
import type { Shoe } from '@/types';

interface ManualSaleHistoryCardProps {
  shoe: Shoe;
}

export function ManualSaleHistoryCard({ shoe }: ManualSaleHistoryCardProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imgUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path, 'shoe-images', { width: 160, quality: 55 }) : null;
  const label = shoe.status === 'donated' ? 'Marked donated' : 'Marked sold outside Go Pair PH';

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-800">
          {imgUrl ? (
            <Image src={imgUrl} alt={formatListingName(shoe.brand, shoe.model)} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <Link href={getListingPath(shoe)}>
            <p className="truncate text-sm font-semibold text-gray-200 transition-colors hover:text-teal-400">
              {formatListingName(shoe.brand, shoe.model)}
            </p>
            <p className="text-xs text-gray-500">{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type) || CONDITIONS[shoe.condition]}</p>
          </Link>
        </div>
        <div className="shrink-0 text-right">
          {shoe.listing_type === 'for_sale' && shoe.price_php ? (
            <p className="text-sm font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
          ) : (
            <p className="text-sm font-medium text-green-400">Free</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-800 pt-1 text-xs text-gray-500">
        <span>Manual status update</span>
        <span>{formatRelativeDate(shoe.updated_at)}</span>
      </div>
    </div>
  );
}
