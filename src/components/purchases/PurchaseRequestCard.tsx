'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate, formatPrice, formatSize, getPublicUrl, getListingPath } from '@/lib/utils';
import { buildMessengerUrl } from '@/lib/facebook';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { PurchaseRequest, PurchaseRequestStatus, Shoe } from '@/types';

type ConfirmAction = 'accept' | 'complete' | 'cancel';

interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  listingName: string;
  listingPrice: string;
  listingId: string;
  listingStatus?: string;
  /** Optional listing — used to render a thumbnail. Pulled from req.listing if omitted. */
  listing?: Shoe;
  onChanged: (id: string) => void;
}

export function PurchaseRequestCard({
  request,
  listingName,
  listingPrice,
  listingId,
  listingStatus,
  listing,
  onChanged,
}: PurchaseRequestCardProps) {
  const [status, setStatus] = useState<PurchaseRequestStatus>(request.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [messageBuyerOpen, setMessageBuyerOpen] = useState(false);

  // Resolve a thumbnail from whichever listing reference we have.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const resolvedListing = listing ?? (request.listing as Shoe | undefined);
  const listingPath = resolvedListing ? getListingPath(resolvedListing) : `/listings/${listingId}`;
  const buyerMessengerUrl = buildMessengerUrl(request.profiles?.fb_username);
  const topImg =
    resolvedListing?.shoe_images?.find(i => i.view_type === 'top') ??
    resolvedListing?.shoe_images?.[0];
  const thumbUrl = topImg && supabaseUrl ? getPublicUrl(supabaseUrl, topImg.storage_path, 'shoe-images', { width: 160, quality: 55 }) : null;

  async function changeStatus(next: 'accepted' | 'declined') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-requests/${request.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to update request');
      }
      setStatus(next);
      trackMarketplaceAction('seller_request_status', {
        listing_id: listingId,
        request_status: next,
      });
      if (next === 'declined') onChanged(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setConfirmAction('accept');
  }

  async function handleDecline() {
    setConfirmAction(null);
    await changeStatus('declined');
  }

  async function completeSale() {
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('complete_purchase', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    trackMarketplaceAction('seller_request_status', {
      listing_id: listingId,
      request_status: 'sold',
    });
    onChanged(request.id);
  }

  async function cancelSale() {
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('cancel_purchase_acceptance', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus('pending');
    trackMarketplaceAction('seller_request_status', {
      listing_id: listingId,
      request_status: 'reopened',
    });
    setLoading(false);
  }

  async function confirmSelectedAction() {
    if (!confirmAction) return;
    const selectedAction = confirmAction;
    setConfirmAction(null);
    if (selectedAction === 'accept') {
      await changeStatus('accepted');
    } else if (selectedAction === 'complete') {
      await completeSale();
    } else {
      await cancelSale();
    }
  }

  const isReservedForOther = status === 'declined' && listingStatus === 'reserved';
  const buyerName = request.profiles?.display_name ?? 'the buyer';

  function handleMessageBuyer() {
    if (buyerMessengerUrl) {
      trackMarketplaceAction('outbound_click', {
        destination: 'buyer_messenger',
        listing_id: listingId,
        surface: 'purchase_request_card',
      });
      window.open(buyerMessengerUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setMessageBuyerOpen(true);
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      {/* Top: thumbnail + listing name */}
      <Link href={listingPath} className="flex items-center gap-3 group">
        <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
          {thumbUrl ? (
            <Image
              src={thumbUrl}
              alt={listingName}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Buyer offer</p>
          <p className="text-sm font-semibold text-gray-100 group-hover:text-teal-400 transition-colors line-clamp-2 leading-tight">
            {listingName}
          </p>
          {request.shoe_variants && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300">
              Size {formatSize(request.shoe_variants.size_eu, request.shoe_variants.size_us, request.shoe_variants.size_cm, request.shoe_variants.us_size_type)}
            </p>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs text-gray-500">Listed</p>
          <p className="text-base font-bold text-teal-400">{listingPrice}</p>
        </div>
        {request.offer_price_php != null && (
          <div className="text-right">
            <p className="text-xs text-amber-400">Buyer&apos;s offer</p>
            <p className="text-base font-bold text-amber-300">{formatPrice(request.offer_price_php)}</p>
          </div>
        )}
        <span className="text-xs text-gray-500 self-end">{formatRelativeDate(request.created_at)}</span>
      </div>

      {request.message && (
        <p className="text-sm text-gray-400 italic border-l-2 border-gray-700 pl-3">&quot;{request.message}&quot;</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
        <span>From</span>
        <Link href={`/profile/${request.buyer_id}`} className="text-teal-400 hover:text-teal-300">
          {buyerName}
        </Link>
      </div>

      {status === 'pending' && (
        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleMessageBuyer}
            disabled={loading}
            className={`col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 sm:col-span-1 ${
              buyerMessengerUrl
                ? 'border-blue-400/25 bg-blue-600 text-white hover:bg-blue-500'
                : 'border-blue-400/15 bg-blue-600/35 text-blue-100/60 hover:border-blue-300/25 hover:bg-blue-600/45 hover:text-blue-50'
            }`}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
            </svg>
            Message Buyer
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-400 disabled:opacity-50"
          >
            Accept offer
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            className="rounded-lg border border-gray-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div className="space-y-2 pt-1">
          <div className="rounded-lg border border-teal-400/20 bg-teal-400/[0.07] px-3 py-2 text-xs leading-5 text-teal-200">
            Offer accepted. This pair is reserved for{' '}
            <Link href={`/profile/${request.buyer_id}`} className="underline hover:text-teal-200">
              {request.profiles?.display_name ?? 'the buyer'}
            </Link>
            {' '}while you finish the deal.
          </div>
          <DealSteps
            steps={['Message buyer', 'Complete meetup, payment, or shipping', 'Mark as sold']}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleMessageBuyer}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                buyerMessengerUrl
                  ? 'border-blue-400/25 bg-blue-600 text-white hover:bg-blue-500'
                  : 'border-blue-400/15 bg-blue-600/35 text-blue-100/60 hover:border-blue-300/25 hover:bg-blue-600/45 hover:text-blue-50'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
              </svg>
              Message Buyer
            </button>
            <button
              onClick={() => setConfirmAction('cancel')}
              disabled={loading}
              className="rounded-lg border border-gray-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
            >
              Cancel reservation
            </button>
            <button
              onClick={() => setConfirmAction('complete')}
              disabled={loading}
              className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-400 disabled:opacity-50"
            >
              Mark as Sold
            </button>
          </div>
        </div>
      )}

      {isReservedForOther && (
        <div className="rounded-lg bg-orange-950 border border-orange-800 px-3 py-2 text-xs text-orange-300 text-center">
          Item is currently reserved for another buyer — the deal may still fall through. Check back later.
        </div>
      )}

      {confirmAction && (
        <RequestConfirmPanel
          action={confirmAction}
          buyerName={buyerName}
          loading={loading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmSelectedAction}
        />
      )}

      {messageBuyerOpen && typeof window !== 'undefined' && createPortal(
        <MessageBuyerFallbackModal
          buyerName={buyerName}
          listingName={listingName}
          onClose={() => setMessageBuyerOpen(false)}
        />,
        document.body,
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function MessageBuyerFallbackModal({
  buyerName,
  listingName,
  onClose,
}: {
  buyerName: string;
  listingName: string;
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
            aria-label="Close message buyer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-blue-400/20 bg-blue-600/[0.08] p-4">
            <p className="text-sm font-semibold text-blue-100">Buyer has not added Messenger yet.</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              {buyerName} can still see your decision on Go Pair PH. Accept the offer if you want to reserve the pair, then coordinate from the offer status and buyer profile.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3 text-xs leading-5 text-gray-400">
            Accepting reserves the listing while you complete meetup, payment, or shipping. You can reopen it if the buyer backs out.
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

function RequestConfirmPanel({
  action,
  buyerName,
  loading,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  buyerName: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = {
    accept: {
      title: `Reserve for ${buyerName}?`,
      body: 'Accepting reserves the listing, notifies the buyer, and gives you space to coordinate meetup, payment, or shipping. Mark it sold after the deal is complete.',
      confirmLabel: 'Accept offer',
      confirmClass: 'bg-teal-600 hover:bg-teal-500',
    },
    complete: {
      title: 'Mark this pair as sold?',
      body: 'This completes the sale, closes the request, and marks the listing as Sold.',
      confirmLabel: 'Mark as sold',
      confirmClass: 'bg-green-600 hover:bg-green-500',
    },
    cancel: {
      title: 'Reopen this listing?',
      body: 'Use this only if the buyer backs out or the deal falls through. The listing will become active again for other buyers.',
      confirmLabel: 'Cancel reservation',
      confirmClass: 'bg-amber-600 hover:bg-amber-500',
    },
  }[action];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-slate-950/80 p-3 shadow-lg shadow-black/20">
      <p className="text-sm font-semibold text-gray-100">{copy.title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{copy.body}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          Not yet
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${copy.confirmClass}`}
        >
          {loading ? 'Working...' : copy.confirmLabel}
        </button>
      </div>
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
