'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate, formatPrice, getPublicUrl, formatListingName, getListingPath } from '@/lib/utils';
import type { PurchaseRequest, PurchaseRequestStatus, Shoe } from '@/types';

interface SentOfferCardProps {
  request: PurchaseRequest;
  onChanged: (id: string) => void;
}

export function SentOfferCard({ request, onChanged }: SentOfferCardProps) {
  const [status, setStatus] = useState<PurchaseRequestStatus>(request.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const shoe = request.listing as Shoe | undefined;
  const seller = shoe?.profiles;
  const topImg = shoe?.shoe_images?.find(i => i.view_type === 'top') ?? shoe?.shoe_images?.[0];
  const thumbUrl = topImg && supabaseUrl ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;
  const listingName = shoe ? formatListingName(shoe.brand, shoe.model) : 'Listing';

  async function handleRetract() {
    const msg = status === 'accepted'
      ? 'Cancel this reservation? The seller will be notified and the listing will return to active.'
      : 'Retract your offer? The seller will no longer see this request.';
    if (!confirm(msg)) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('retract_purchase_request', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus('declined');
    setLoading(false);
    onChanged(request.id);
  }

  return (
    <div className={`rounded-xl border bg-gray-900 p-4 space-y-3 ${
      status === 'accepted' ? 'border-orange-800' : 'border-gray-800'
    }`}>
      {status === 'accepted' && (
        <div className="flex items-start gap-1.5 rounded-lg bg-orange-950 border border-orange-800 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse shrink-0 mt-1.5" />
          <p className="text-xs font-semibold text-orange-300 leading-snug">
            Reserved for you — seller marks it sold once you receive the pair.
          </p>
        </div>
      )}

      {/* Top: thumbnail + listing name */}
      <Link href={shoe ? getListingPath(shoe) : '#'} className="flex items-center gap-3 group">
        <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
          {thumbUrl ? (
            <Image src={thumbUrl} alt={listingName} fill sizes="56px" className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Sent offer</p>
          <p className="text-sm font-semibold text-gray-100 group-hover:text-teal-400 transition-colors line-clamp-2 leading-tight">
            {listingName}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {shoe?.price_php != null && (
          <div>
            <p className="text-xs text-gray-500">Listed</p>
            <p className="text-base font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
          </div>
        )}
        {request.offer_price_php != null && (
          <div className="text-right">
            <p className="text-xs text-amber-400">Your offer</p>
            <p className="text-base font-bold text-amber-300">{formatPrice(request.offer_price_php)}</p>
          </div>
        )}
        <span className="text-xs text-gray-500 self-end">{formatRelativeDate(request.created_at)}</span>
      </div>

      {request.message && (
        <p className="text-sm text-gray-400 italic border-l-2 border-gray-700 pl-3">&quot;{request.message}&quot;</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
        <span>To</span>
        {seller ? (
          <Link href={`/profile/${seller.id}`} className="text-teal-400 hover:text-teal-300">
            {seller.display_name}
          </Link>
        ) : (
          <span>Unknown</span>
        )}
        {seller?.fb_username && (
          <>
            <span className="text-gray-700">·</span>
            <a
              href={`https://m.me/${seller.fb_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
              </svg>
              Messenger
            </a>
          </>
        )}
      </div>

      {status === 'pending' && (
        <div className="rounded-lg bg-amber-950 border border-amber-800 px-3 py-2 text-xs text-amber-300 text-center">
          Awaiting seller&apos;s response
        </div>
      )}

      {(status === 'pending' || status === 'accepted') && (
        <button
          onClick={handleRetract}
          disabled={loading}
          className="w-full rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:border-red-700 hover:bg-red-950 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          {status === 'accepted' ? 'Cancel reservation' : 'Retract offer'}
        </button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
