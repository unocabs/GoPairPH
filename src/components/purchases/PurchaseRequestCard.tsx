'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate, formatPrice } from '@/lib/utils';
import type { PurchaseRequest, PurchaseRequestStatus } from '@/types';

interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  listingName: string;
  listingPrice: string;
  listingId: string;
  listingStatus?: string;
  onChanged: (id: string) => void;
}

export function PurchaseRequestCard({ request, listingName, listingPrice, listingId, listingStatus, onChanged }: PurchaseRequestCardProps) {
  const [status, setStatus] = useState<PurchaseRequestStatus>(request.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!confirm(`Accept this purchase request? Your listing will be reserved for this buyer until you mark it sold.`)) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('accept_purchase_request', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus('accepted');
    setLoading(false);
    // Do NOT call onChanged here — card stays visible until Complete Sale
  }

  async function handleDecline() {
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().from('purchase_requests').update({ status: 'declined' }).eq('id', request.id);
    if (err?.message) { setError(err.message); setLoading(false); return; }
    setStatus('declined');
    setLoading(false);
    onChanged(request.id);
  }

  async function handleCompleteSale() {
    if (!confirm('Mark this sale as complete? The listing will become Sold and cannot be relisted.')) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('complete_purchase', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    onChanged(request.id);
  }

  async function handleCancelSale() {
    if (!confirm('Cancel this sale? The listing will go back to Active and the buyer can be notified.')) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('cancel_purchase_acceptance', { p_request_id: request.id });
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus('pending');
    setLoading(false);
  }

  const isReservedForOther = status === 'declined' && listingStatus === 'reserved';

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <p className="text-xs text-gray-500">
        Purchase request for:{' '}
        <Link href={`/listings/${listingId}`} className="font-medium text-gray-300 hover:text-teal-400">
          {listingName}
        </Link>
      </p>
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
        {request.profiles?.fb_username && (
          <>
            <span className="text-gray-700">·</span>
            <a
              href={`https://m.me/${request.profiles.fb_username}`}
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
              onClick={handleCancelSale}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel &amp; Reopen
            </button>
            <button
              onClick={handleCompleteSale}
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

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
