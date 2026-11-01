'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { coinsToPesoDiscount, formatGpCoins, maxRedeemableCoins } from '@/lib/gpCoins';
import { FEATURED_PROMOTION_PRICES } from '@/lib/featuredPromotions';
import { SPONSORED_PROMOTION_PRICES } from '@/lib/sponsoredPromotions';
import { formatPrice, formatShortDate } from '@/lib/utils';

type Placement = 'featured' | 'top_pick';
type Tier = '7d' | '30d';
interface PromoteListingModalProps {
  listingId: string;
  listingName: string;
  slotsAvailable: boolean;
  nextSlotOpensAt: string | null;
  ownListingAlreadySponsored: boolean;
  ownSponsoredUntil: string | null;
  ownListingAlreadyFeatured: boolean;
  ownFeaturedUntil: string | null;
  initialPlacement?: Placement;
  initialTier?: Tier;
  gpCoinBalance?: number;
  onClose: () => void;
}

export function PromoteListingModal({ listingId, listingName, slotsAvailable, nextSlotOpensAt,
  ownListingAlreadySponsored, ownSponsoredUntil, ownListingAlreadyFeatured, ownFeaturedUntil,
  initialPlacement = 'featured', initialTier = '7d', gpCoinBalance = 0, onClose,
}: PromoteListingModalProps) {
  const [placement, setPlacement] = useState<Placement>(initialPlacement);
  const [tier, setTier] = useState<Tier>(initialTier);
  const [coins, setCoins] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<{ enabled: boolean; methods: string[] } | null>(null);
  const offersQr = config?.methods.includes('QR Ph') ?? false;
  const dialog = useRef<HTMLDivElement>(null);
  const featured = placement === 'featured';
  const days = tier === '7d' ? 7 : 30;
  const prices = featured ? FEATURED_PROMOTION_PRICES : SPONSORED_PROMOTION_PRICES;
  const price = prices[days];
  const maximum = featured ? maxRedeemableCoins(gpCoinBalance, price) : 0;
  const safeCoins = Math.min(coins, maximum);
  const cash = price - coinsToPesoDiscount(safeCoins);
  const active = featured ? ownListingAlreadyFeatured : ownListingAlreadySponsored;
  const activeUntil = featured ? ownFeaturedUntil : ownSponsoredUntil;
  const full = !featured && !slotsAvailable;

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/promotions/checkout', { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(setConfig).catch(() => { if (!controller.signal.aborted) setConfig({ enabled: false, methods: [] }); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  async function checkout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/promotions/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, placement, durationDays: days, coinsToUse: safeCoins }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not start checkout.');
      const destination = result.checkoutUrl ?? result.statusUrl;
      if (!destination) throw new Error('Could not open checkout. Please check Payment history before trying again.');
      window.location.assign(destination);
    } catch (failure) { setError((failure as Error).message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-black/70 p-3 sm:p-4"
      onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="promotion-title" tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape' && !busy) onClose();
          if (event.key === 'Tab') {
            const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)');
            if (!items?.length) return;
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl outline-none">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-800 px-5 py-4">
          <div className="min-w-0"><h2 id="promotion-title" className="font-semibold text-gray-100">Promote your shoes</h2><p className="mt-1 truncate text-xs text-gray-400">{listingName}</p></div>
          <button type="button" aria-label="Close promotion checkout" disabled={busy} onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-gray-400 hover:bg-gray-800">×</button>
        </div>
        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <fieldset disabled={busy}>
            <legend className="mb-2 text-sm font-semibold text-gray-200">Choose placement</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['featured', 'top_pick'] as Placement[]).map(value => <button key={value} type="button" aria-pressed={placement === value}
                onClick={() => { setPlacement(value); setCoins(0); setError(''); }}
                className={`rounded-xl border p-3 text-left text-sm ${placement === value ? 'border-teal-500 bg-teal-500/10 text-teal-200' : 'border-gray-700 text-gray-300'}`}>
                <span className="block font-bold">{value === 'featured' ? 'Featured' : 'Top Pick'}</span>
                <span className="mt-1 block text-xs text-gray-400">{value === 'featured' ? 'Homepage spotlight' : 'Browse boost + homepage rotation'}</span>
              </button>)}
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-400">{featured ? 'One Featured listing at a time. After payment confirmation, your shoes appear now or join the paid queue.' : 'Top Picks also rotate hourly on the homepage, with up to four eligible listings shown. Add photos and keep your shoes in stock. We hold an available slot while you complete checkout.'}</p>
          </fieldset>
          {active ? <p className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-sm text-teal-100">Your listing is already {featured ? 'Featured' : 'a Top Pick'}{activeUntil ? ` until ${formatShortDate(activeUntil)}` : ''}.</p>
            : full ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">Top Pick slots are full.{nextSlotOpensAt ? ` The next slot is expected to open ${formatShortDate(nextSlotOpensAt)}.` : ' Please check again later.'}</p> : <>
            <fieldset disabled={busy}>
              <legend className="mb-2 text-sm font-semibold text-gray-200">Choose duration</legend>
              <div className="grid grid-cols-2 gap-2">
                {([7, 30] as const).map(value => <button key={value} type="button" aria-pressed={days === value} onClick={() => { setTier(value === 7 ? '7d' : '30d'); setCoins(0); setError(''); }}
                  className={`rounded-xl border p-3 text-left ${days === value ? 'border-teal-500 bg-teal-500/10 text-teal-200' : 'border-gray-700 text-gray-300'}`}>
                  <span className="block text-sm font-semibold">{value} days</span><span className="mt-1 block text-lg font-bold">{formatPrice(prices[value])}</span>
                </button>)}
              </div>
            </fieldset>
            {featured && <section className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
              <div className="flex items-center justify-between gap-2"><label htmlFor="promotion-coins" className="text-sm font-semibold text-amber-100">Use GP Coins</label><span className="text-xs text-amber-100/80">{formatGpCoins(gpCoinBalance)} available</span></div>
              {maximum > 0 ? <><input id="promotion-coins" aria-valuetext={`${safeCoins} GP Coins, ${formatPrice(cash)} to pay`} type="range" min={0} max={maximum} step={2} value={safeCoins} disabled={busy} onChange={event => setCoins(Number(event.target.value))} className="mt-3 h-8 w-full accent-amber-400" />
                <div className="flex justify-between text-xs text-amber-100"><button type="button" disabled={busy} onClick={() => setCoins(0)} className="min-h-10">Use 0</button><span className="self-center">{safeCoins} GP Coins</span><button type="button" disabled={busy} onClick={() => setCoins(maximum)} className="min-h-10">Use max</button></div></> : <p className="mt-2 text-xs text-gray-400">Earn GP Coins by listing and sharing your shoes.</p>}
              <p className="mt-1 text-xs leading-5 text-gray-400">2 GP Coins = ₱1. Full coin payment is available once every 30 days.</p>
            </section>}
            <section className="rounded-xl border border-gray-700 bg-gray-950/60 p-3 text-sm">
              <div className="flex justify-between text-gray-400"><span>{featured ? 'Featured' : 'Top Pick'} · {days} days</span><span>{formatPrice(price)}</span></div>
              {safeCoins > 0 && <div className="mt-2 flex justify-between text-amber-200"><span>{safeCoins} GP Coins</span><span>−{formatPrice(price - cash)}</span></div>}
              <div className="mt-3 flex justify-between border-t border-gray-800 pt-3 font-bold text-gray-100"><span>Total to pay</span><span>{formatPrice(cash)}</span></div>
              <p className="mt-2 text-xs leading-5 text-gray-400">{cash === 0 ? 'Covered by GP Coins. Confirm below to activate or join the Featured queue.' : config?.enabled ? offersQr ? 'Pay with QR Ph through PayMongo. Scan the QR code at checkout using your banking or e-wallet app. No added checkout fee.' : `Secure checkout with PayMongo. ${config.methods.join(' · ')}. No added checkout fee.` : config ? 'QR Ph checkout is not available yet. You can still use GP Coins to cover Featured in full.' : 'Checking available payment methods…'}</p>
            </section>
          </>}
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <p className="text-xs leading-5 text-gray-500">Promotions improve visibility; sales are not guaranteed. Unused time after your shoes sell is not refunded. <Link href="/help/promote-listing" className="text-teal-300 underline">Promotion policy</Link></p>
        </div>
        <div className="shrink-0 space-y-2 border-t border-gray-800 px-5 py-4">
          {!active && !full && <Button type="button" loading={busy} disabled={cash > 0 && !config?.enabled} onClick={checkout} className="min-h-12 w-full">{cash === 0 ? `Confirm ${safeCoins} GP Coins` : `${offersQr ? 'Pay with QR Ph' : 'Continue to PayMongo'} · ${formatPrice(cash)}`}</Button>}
          <Link href="/promotions/payments" className="block py-2 text-center text-xs font-semibold text-teal-300">Payment history &amp; existing checkout</Link>
        </div>
      </div>
    </div>
  );
}

export function UnverifiedNotice({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-semibold text-gray-100">Verification Required</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Only verified users can request Featured or Top Pick placements. Request verification from your profile first.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="neutral" onClick={onClose} className="flex-1">Cancel</Button>
          <Link href="/profile#verification" className="flex-1" onClick={onClose}>
            <Button className="w-full">Request Verification</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
