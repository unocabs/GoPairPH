'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate, formatPrice, formatSize, getPublicUrl, getListingPath } from '@/lib/utils';
import { buildMessengerUrl } from '@/lib/facebook';
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

  // Resolve a thumbnail from whichever listing reference we have.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const resolvedListing = listing ?? (request.listing as Shoe | undefined);
  const listingPath = resolvedListing ? getListingPath(resolvedListing) : `/listings/${listingId}`;
  const buyerMessengerUrl = buildMessengerUrl(request.profiles?.fb_username);
  const topImg =
    resolvedListing?.shoe_images?.find(i => i.view_type === 'top') ??
    resolvedListing?.shoe_images?.[0];
  const thumbUrl = topImg && supabaseUrl ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;

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
    onChanged(request.id);
  }

  async function cancelSale() {
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('cancel_purchase_acceptance', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus('pending');
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
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Purchase request</p>
          <p className="text-sm font-semibold text-gray-100 group-hover:text-teal-400 transition-colors line-clamp-2 leading-tight">
            {listingName}
          </p>
          {request.shoe_variants && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300">
              Size {formatSize(request.shoe_variants.size_eu, request.shoe_variants.size_us, request.shoe_variants.size_cm)}
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
          {request.profiles?.display_name ?? 'Unknown'}
        </Link>
        {buyerMessengerUrl && (
          <>
            <span className="text-gray-700">·</span>
            <a
              href={buyerMessengerUrl}
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
      {!buyerMessengerUrl && (
        <p className="rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2 text-xs leading-5 text-gray-400">
          Buyer has not added a valid Messenger link. Use their message or profile to coordinate after accepting.
        </p>
      )}

      {status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleDecline}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div className="space-y-2 pt-1">
          <div className="rounded-lg bg-teal-950 border border-teal-800 px-3 py-2 text-xs text-teal-300 text-center">
            Accepted — arrange a meetup with{' '}
            <Link href={`/profile/${request.buyer_id}`} className="underline hover:text-teal-200">
              {request.profiles?.display_name ?? 'the buyer'}
            </Link>
            {' '}or complete the transaction online, and process the shipping.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction('cancel')}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel &amp; Reopen
            </button>
            <button
              onClick={() => setConfirmAction('complete')}
              disabled={loading}
              className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
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
          buyerName={request.profiles?.display_name ?? 'the buyer'}
          loading={loading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmSelectedAction}
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
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
      body: 'The listing will be reserved while you coordinate the deal. You can reopen it if the buyer backs out.',
      confirmLabel: 'Accept request',
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
      body: 'The accepted request will be cancelled and the listing will become active again for other buyers.',
      confirmLabel: 'Reopen listing',
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
