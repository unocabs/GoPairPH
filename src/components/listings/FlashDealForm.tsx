'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FLASH_DEAL_COINS, maxFlashDealPrice } from '@/lib/flashDeals';
import { formatPrice } from '@/lib/utils';
import { trackMarketplaceAction } from '@/lib/analytics';

export interface FlashDealChoice { id: string; name: string; price: number; reference: number; image: string | null; reason: string | null }

export function FlashDealForm({ listings, balance, locked, initialListing, initialSale }: {
  listings: FlashDealChoice[]; balance: number; locked: boolean; initialListing?: string; initialSale?: string;
}) {
  const first = listings.find(item => item.id === initialListing) ?? listings.find(item => !item.reason) ?? listings[0];
  const [listingId, setListingId] = useState(first?.id ?? '');
  const [price, setPrice] = useState(initialSale && /^\d+(\.\d{1,2})?$/.test(initialSale) ? initialSale : first ? String(Math.floor(maxFlashDealPrice(first.reference))) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successUrl, setSuccessUrl] = useState('');
  const clientId = useRef<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const chosen = listings.find(item => item.id === listingId);
  const sale = Number(price);
  const maximum = chosen ? maxFlashDealPrice(chosen.reference) : 0;
  const priceValid = Number.isFinite(sale) && sale > 0 && sale <= maximum && Math.abs(sale * 100 - Math.round(sale * 100)) < 0.00001;
  const enough = balance >= FLASH_DEAL_COINS;
  const returnPath = `/flash-deals/new?${new URLSearchParams({ listing: listingId, ...(priceValid ? { sale: price } : {}) })}`;

  async function launch(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen || chosen.reason || !priceValid || !enough || locked || busy) return;
    setBusy(true); setError('');
    clientId.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/flash-deals', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, price: sale, clientId: clientId.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not start your flash deal. Please try again.');
      trackMarketplaceAction('flash_deal_started', { listing_id: listingId, coins: FLASH_DEAL_COINS });
      setSuccessUrl(data.listingUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Please check your connection and try again.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setBusy(false); }
  }

  if (successUrl) return <div role="status" className="rounded-2xl border border-teal-400/30 bg-teal-400/[0.06] p-6">
    <h2 className="text-xl font-bold text-gray-100">Your flash deal is live!</h2>
    <p className="mt-2 text-sm leading-6 text-gray-300">Your shoes now show the sale price for 24 hours and join the homepage Flash Deals rotation. {FLASH_DEAL_COINS} GP Coins were used. The regular price returns automatically when the deal ends.</p>
    <Link href={successUrl} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-400 px-4 font-bold text-gray-950">View and share your shoes →</Link>
    <Link href="/flash-deals" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">Browse Flash Deals</Link>
  </div>;

  return <form onSubmit={launch} aria-busy={busy} className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
    <div><label htmlFor="flash-listing" className="block text-sm font-bold text-gray-100">1. Choose your shoes</label>
      <select id="flash-listing" value={listingId} disabled={busy} onChange={event => {
        const item = listings.find(candidate => candidate.id === event.target.value);
        setListingId(event.target.value); setPrice(item ? String(Math.floor(maxFlashDealPrice(item.reference))) : '');
        clientId.current = null; setError('');
      }} className="mt-2 min-h-12 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-base text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400">
        {listings.map(item => <option key={item.id} value={item.id}>{item.name}{item.reason ? ' · Unavailable' : ''}</option>)}
      </select>
      {chosen?.reason && <p role="status" className="mt-2 text-sm leading-6 text-amber-200">{chosen.reason}</p>}
      {chosen && <div className="mt-3 flex items-center gap-3 rounded-xl bg-gray-950/60 p-3">
        {chosen.image && <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"><Image src={chosen.image} alt="" fill sizes="64px" className="object-cover" /></div>}
        <div className="min-w-0"><p className="font-semibold text-gray-100">{chosen.name}</p><p className="mt-1 text-sm text-gray-400">Regular price {formatPrice(chosen.price)}</p></div>
      </div>}
    </div>

    <div><label htmlFor="flash-sale-price" className="block text-sm font-bold text-gray-100">2. Set your sale price</label>
      <div className="relative mt-2"><span aria-hidden="true" className="absolute left-4 top-3 text-gray-400">₱</span>
        <input id="flash-sale-price" name="price" type="number" inputMode="decimal" min="0.01" max={maximum} step="0.01" required
          value={price} disabled={busy} aria-describedby="flash-price-help flash-savings" aria-invalid={price !== '' && !priceValid}
          onChange={event => { setPrice(event.target.value); clientId.current = null; setError(''); }}
          className="min-h-12 w-full rounded-xl border border-gray-600 bg-gray-950 pl-10 pr-3 text-lg font-bold text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>
      <p id="flash-price-help" className={`mt-2 text-sm leading-6 ${price && !priceValid ? 'text-amber-200' : 'text-gray-400'}`}>Enter {formatPrice(maximum)} or less—at least 10% below your lowest asking price in the last 7 days.</p>
      <p id="flash-savings" aria-live="polite" className="mt-1 min-h-6 text-sm font-semibold text-amber-200">{chosen && priceValid ? `Buyers save ${formatPrice(chosen.reference - sale)} (${Math.round((1-sale/chosen.reference)*100)}% off).` : 'Your buyer savings will appear here.'}</p>
    </div>

    <div><h2 className="text-sm font-bold text-gray-100">3. Review and launch</h2>
      <div className="mt-2 rounded-xl border border-amber-200/20 bg-amber-200/[0.04] p-4">
        <div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-gray-100">24-hour Flash Deal</p><p className="font-bold text-amber-100">20 GP <span className="text-xs font-normal text-gray-300">(₱10 value)</span></p></div>
        <p className="mt-2 text-sm leading-6 text-gray-300">Your shoes join the homepage rotation and the Flash Deals page. Homepage slots rotate hourly. Promotion increases visibility; a sale is not guaranteed.</p>
        <dl className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm"><div className="flex justify-between"><dt className="text-gray-400">Your available coins</dt><dd className="font-semibold text-gray-100">{balance} GP</dd></div>
          <div className="flex justify-between"><dt className="text-gray-400">After launching</dt><dd className="font-semibold text-gray-100">{enough ? `${balance - FLASH_DEAL_COINS} GP` : `Need ${FLASH_DEAL_COINS - Math.max(0,balance)} more GP`}</dd></div></dl>
        <Link href={`/coins?next=${encodeURIComponent(returnPath)}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-teal-300 underline underline-offset-4">{enough ? 'Buy more GP Coins' : 'Buy GP Coins to continue'} →</Link>
      </div>
    </div>

    {locked && <p role="alert" className="rounded-lg border border-amber-200/25 p-3 text-sm text-amber-100">Your wallet needs a payment review. <Link href="/contact" className="underline">Contact support</Link> before using or buying coins.</p>}
    {!enough && <p className="text-sm leading-6 text-gray-300">You need 20 GP Coins. <Link href={`/coins?next=${encodeURIComponent(returnPath)}`} className="font-semibold text-teal-300 underline">Buy coins</Link> or <Link href="/profile#gp-coins" className="text-teal-300 underline">see how to earn them</Link>. Your selected shoes and valid sale price will be kept when you return.</p>}
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-100 focus:outline-none">{error}</p>}
    <Button type="submit" loading={busy} disabled={!chosen || Boolean(chosen.reason) || !priceValid || !enough || locked}
      className="min-h-12 w-full text-base font-bold">{busy ? 'Starting your deal…' : 'Launch flash deal · 20 GP'}</Button>
    <p className="text-xs leading-5 text-gray-400">Coins pay for promotion. You fund the price drop. The regular price returns after 24 hours. Editing the price or closing the listing ends the deal. Each listing can join once every 7 days. Ending early does not return the promotion fee. <Link href="/help/flash-deals" className="text-teal-300 underline">How Flash Deals works</Link></p>
  </form>;
}

export function EndFlashDealButton({ dealId }: { dealId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function endDeal() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/flash-deals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? 'Could not end this deal.');
      window.location.reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); setBusy(false); }
  }
  return <div>{!confirming ? <Button variant="neutral" className="min-h-11 w-full" onClick={() => setConfirming(true)}>End flash deal</Button>
    : <div className="rounded-xl border border-amber-200/25 p-3"><p className="text-sm leading-6 text-gray-300">End this deal and restore your regular price? The 20 GP promotion fee will not be returned.</p>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="neutral" className="min-h-11" disabled={busy} onClick={() => setConfirming(false)}>Keep deal live</Button><Button className="min-h-11" loading={busy} onClick={endDeal}>End deal</Button></div></div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}</div>;
}
