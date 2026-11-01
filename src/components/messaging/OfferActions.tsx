'use client';
import { useState } from 'react';
import { purchaseStatusLabel } from '@/lib/messaging/config';
import { formatPrice, formatSize } from '@/lib/utils';
import type { PurchaseRequest } from '@/types';

export function OfferActions({ request, seller, onChanged, blocked = false, onRevise }: {
  request: PurchaseRequest; seller: boolean; onChanged: () => void; blocked?: boolean; onRevise?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function act(action: string) {
    if ((action === 'complete' || action === 'cancel' || action === 'withdraw') && !window.confirm(action === 'complete' ? 'Mark this transaction complete? Confirm that the shoes have been received and the deal is finished.' : 'Close this request? Any reservation will be released.')) return;
    setBusy(true); setError('');
    try {
      const r = await fetch(`/api/purchase-requests/${request.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, version: request.version }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error ?? 'Could not update request.');
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update request.'); }
    finally { setBusy(false); }
  }
  const btn = 'min-h-11 rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50';
  const variant = request.shoe_variants;
  const amount = request.offer_price_php ?? request.listed_price_php;
  return <div className="rounded-xl border border-teal-500/25 bg-teal-950/30 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-teal-100">{amount != null ? formatPrice(amount) : 'Request for shoes'}</span><span className="text-xs text-gray-300">{purchaseStatusLabel(request.status, request.status_reason)}</span></div>
    {variant && <p className="mt-1 text-xs text-gray-400">{formatSize(variant.size_eu, variant.size_us, variant.size_cm, variant.us_size_type)}</p>}
    {(request.status === 'pending' || request.status === 'accepted') && <div className="mt-2 flex flex-wrap gap-2">
      {seller && request.status === 'pending' && <><button type="button" disabled={busy || blocked} onClick={() => act('accept')} className={`${btn} border-teal-500 bg-teal-500 text-gray-950 hover:bg-teal-400`}>Accept offer</button><button type="button" disabled={busy} onClick={() => act('decline')} className={btn}>Decline</button></>}
      {seller && request.status === 'accepted' && <><button type="button" disabled={busy} onClick={() => act('complete')} className={btn} aria-label="Mark transaction completed">Complete</button><button type="button" disabled={busy} onClick={() => act('cancel')} className={btn} aria-label="Cancel reservation">Cancel</button></>}
      {!seller && request.status === 'pending' && onRevise && <button type="button" disabled={busy || blocked} onClick={onRevise} className={btn}>Update offer</button>}
      {!seller && <button type="button" disabled={busy} onClick={() => act('withdraw')} className={btn}>{request.status === 'accepted' ? 'Cancel reservation' : 'Withdraw offer'}</button>}
    </div>}
    {request.status === 'accepted' && <p className="mt-2 text-xs leading-5 text-gray-300">Confirm meetup, payment, or delivery below. No payment is processed here.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
  </div>;
}
