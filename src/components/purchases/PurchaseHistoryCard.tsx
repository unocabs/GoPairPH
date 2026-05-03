'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getPublicUrl, formatPrice, formatRelativeDate, formatSize } from '@/lib/utils';
import type { PurchaseRequest } from '@/types';

interface PurchaseHistoryCardProps {
  request: PurchaseRequest;
  currentProfileId: string;
}

export function PurchaseHistoryCard({ request, currentProfileId }: PurchaseHistoryCardProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const iWasBuyer = request.buyer_id === currentProfileId;
  const shoe = request.listing;
  const topImg = shoe?.shoe_images?.find(i => i.view_type === 'top') ?? shoe?.shoe_images?.[0];
  const imgUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;

  const otherProfile = iWasBuyer ? shoe?.profiles : request.profiles;
  const otherProfileId = iWasBuyer ? shoe?.seller_id : request.buyer_id;

  const isReserved = request.status === 'accepted';

  return (
    <div className={`rounded-xl border bg-gray-900 p-4 space-y-3 ${
      isReserved ? 'border-orange-800' : 'border-gray-800'
    }`}>
      {isReserved && (
        <div className="flex items-center gap-1.5 rounded-lg bg-orange-950 border border-orange-800 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-orange-300">Reserved for you — awaiting seller to mark as sold</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-800 shrink-0">
          {imgUrl ? (
            <Image src={imgUrl} alt={shoe?.model ?? ''} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {isReserved ? 'Reserved for you' : iWasBuyer ? 'You bought' : 'You sold'}
          </p>
          {shoe ? (
            <Link href={`/listings/${shoe.id}`}>
              <p className="text-sm font-semibold text-gray-200 truncate hover:text-teal-400 transition-colors">
                {shoe.brand} {shoe.model}
              </p>
              <p className="text-xs text-gray-500">{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</p>
            </Link>
          ) : (
            <p className="text-sm text-gray-500">—</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {request.offer_price_php != null ? (
            <>
              <p className="text-sm font-bold text-teal-400">{formatPrice(request.offer_price_php)}</p>
              {shoe?.price_php && shoe.price_php !== request.offer_price_php && (
                <p className="text-xs text-gray-500 line-through">{formatPrice(shoe.price_php)}</p>
              )}
            </>
          ) : (
            shoe?.price_php
              ? <p className="text-sm font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
              : <p className="text-sm font-medium text-green-400">Free</p>
          )}
        </div>
      </div>

      {request.message && (
        <p className="text-xs text-gray-500 italic">&quot;{request.message}&quot;</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-800">
        <span>
          {iWasBuyer ? 'From' : 'To'}{' '}
          {otherProfileId ? (
            <Link href={`/profile/${otherProfileId}`} className="text-teal-400 hover:text-teal-300">
              {otherProfile?.display_name ?? 'Unknown'}
            </Link>
          ) : 'Unknown'}
        </span>
        <span>{formatRelativeDate(request.created_at)}</span>
      </div>
    </div>
  );
}
