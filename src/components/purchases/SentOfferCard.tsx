'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate, formatPrice, getPublicUrl, formatListingName, getListingPath, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { buildMessengerUrl } from '@/lib/facebook';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { PurchaseRequest, PurchaseRequestStatus, Shoe } from '@/types';

interface SentOfferCardProps {
  request: PurchaseRequest;
  onChanged: (id: string) => void;
}

export function SentOfferCard({ request, onChanged }: SentOfferCardProps) {
  const [status, setStatus] = useState<PurchaseRequestStatus>(request.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageSellerOpen, setMessageSellerOpen] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const shoe = request.listing as Shoe | undefined;
  const seller = shoe?.profiles;
  const sellerMessengerUrl = buildMessengerUrl(seller?.fb_username);
  const topImg = shoe?.shoe_images?.find(i => i.view_type === 'top') ?? shoe?.shoe_images?.[0];
  const thumbUrl = topImg && supabaseUrl ? getPublicUrl(supabaseUrl, topImg.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.purchaseThumb) : null;
  const listingName = shoe ? formatListingName(shoe.brand, shoe.model) : 'Listing';

  async function handleRetract() {
    const msg = status === 'accepted'
      ? 'Cancel this reservation? Use this if you no longer want to continue with the deal.'
      : 'Retract your offer? The seller will no longer see this request.';
    if (!confirm(msg)) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('retract_purchase_request', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus('declined');
    trackMarketplaceAction('buyer_request_retract', {
      listing_id: shoe?.id,
      previous_status: status,
    });
    setLoading(false);
    onChanged(request.id);
  }

  function handleMessageSeller() {
    if (sellerMessengerUrl) {
      trackMarketplaceAction('outbound_click', {
        destination: 'seller_messenger',
        listing_id: shoe?.id,
        surface: 'sent_offer_card',
      });
      window.open(sellerMessengerUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setMessageSellerOpen(true);
  }

  return (
    <div className={`rounded-xl border bg-gray-900 p-4 space-y-3 ${
      status === 'accepted' ? 'border-teal-500/35' : 'border-gray-800'
    }`}>
      {status === 'accepted' && (
        <div className="flex items-start gap-1.5 rounded-lg border border-teal-400/20 bg-teal-400/[0.07] px-3 py-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-teal-300" />
          <p className="text-xs font-semibold leading-snug text-teal-200">
            Offer accepted. This pair is reserved for you while you finish the deal.
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
      </div>

      {status === 'pending' && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2 text-xs leading-5 text-amber-200">
          Waiting for seller response. If they accept, this pair becomes reserved for you while you coordinate the deal.
        </div>
      )}

      {status === 'accepted' && (
        <DealSteps
          steps={['Message seller', 'Confirm meetup, payment, or shipping', 'Receive the pair']}
        />
      )}

      {(status === 'pending' || status === 'accepted') && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleMessageSeller}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              sellerMessengerUrl
                ? 'border-blue-400/25 bg-blue-600 text-white hover:bg-blue-500'
                : 'border-blue-400/15 bg-blue-600/35 text-blue-100/60 hover:border-blue-300/25 hover:bg-blue-600/45 hover:text-blue-50'
            }`}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
            </svg>
            Message Seller
          </button>
          <button
            onClick={handleRetract}
            disabled={loading}
            className="rounded-lg border border-gray-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
          >
            {status === 'accepted' ? 'Cancel reservation' : 'Retract offer'}
          </button>
        </div>
      )}

      {messageSellerOpen && typeof window !== 'undefined' && createPortal(
        <MessageSellerFallbackModal
          sellerName={seller?.display_name ?? 'The seller'}
          listingName={listingName}
          status={status}
          onClose={() => setMessageSellerOpen(false)}
        />,
        document.body,
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function DealSteps({ steps }: { steps: string[] }) {
  return (
    <div className="grid gap-1.5 rounded-lg border border-white/[0.08] bg-slate-950/45 p-2.5">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-2 text-xs text-gray-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[10px] font-bold text-teal-200 ring-1 ring-teal-400/25">
            {index + 1}
          </span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

function MessageSellerFallbackModal({
  sellerName,
  listingName,
  status,
  onClose,
}: {
  sellerName: string;
  listingName: string;
  status: PurchaseRequestStatus;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-100">Messenger not added</h2>
            <p className="mt-0.5 truncate text-xs text-gray-500">{listingName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            aria-label="Close message seller"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-blue-400/20 bg-blue-600/[0.08] p-4">
            <p className="text-sm font-semibold text-blue-100">Seller has not added Messenger yet.</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              {sellerName} can still review and update your offer on Go Pair PH.
              {status === 'accepted'
                ? ' Since your offer is accepted, use this status as your reference while coordinating through their profile or agreed contact.'
                : ' Keep an eye on Sent Offers for their response.'}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3 text-xs leading-5 text-gray-400">
            Go Pair PH keeps the listing, offer, and status in one place so both sides can return to the same deal.
          </div>
        </div>

        <div className="border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
