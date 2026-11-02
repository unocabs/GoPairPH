'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flashDealTimeLeft, isFlashDealLive, withFlashDealPrice, type FlashDealPrice as FlashPrice } from '@/lib/flashDeals';
import { formatPrice } from '@/lib/utils';

export function useFlashDealClock(endsAt?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const remaining = Date.parse(endsAt) - Date.now();
    if (remaining <= 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    const expiry = window.setTimeout(() => { window.clearInterval(interval); setNow(Date.now()); }, Math.min(remaining + 50, 2_147_483_647));
    return () => { window.clearInterval(interval); window.clearTimeout(expiry); };
  }, [endsAt]);
  return now;
}

export function FlashDealBadge({ endsAt }: { endsAt: string }) {
  const now = useFlashDealClock(endsAt);
  if (Date.parse(endsAt) <= now) return null;
  return <span suppressHydrationWarning className="inline-flex rounded-full border border-amber-300/40 bg-gray-950/95 px-2 py-1 text-[10px] font-bold text-amber-200">⚡ {flashDealTimeLeft(endsAt, now)}</span>;
}

export function FlashDealPrice({ shoe, className = '' }: { shoe: FlashPrice; className?: string }) {
  const now = useFlashDealClock(shoe.flash_deal_ends_at);
  const projected = withFlashDealPrice(shoe, now);
  const live = isFlashDealLive(shoe, now);
  return <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
    <span className="font-bold text-teal-300">{formatPrice(projected.price_php)}</span>
    {live && <><span className="text-xs text-gray-400 line-through"><span className="sr-only">Previous asking price </span>{formatPrice(shoe.flash_deal_original_price_php!)}</span>
      <span className="text-xs font-semibold text-amber-200">Save {formatPrice(shoe.flash_deal_original_price_php! - projected.price_php!)}</span></>}
  </div>;
}

export function FlashDealNotice({ shoe }: { shoe: FlashPrice }) {
  const router = useRouter();
  const now = useFlashDealClock(shoe.flash_deal_ends_at);
  const live = isFlashDealLive(shoe, now);
  const needsRefresh = useRef(live);
  useEffect(() => {
    if (needsRefresh.current && shoe.flash_deal_ends_at && Date.parse(shoe.flash_deal_ends_at) <= now) {
      needsRefresh.current = false;
      router.refresh();
    }
  }, [now, router, shoe.flash_deal_ends_at]);
  if (!live) return null;
  const date = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(shoe.flash_deal_ends_at!));
  return <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-sm text-amber-100">
    <p className="font-bold">⚡ Flash Deal · seller discount</p>
    <p className="mt-1 text-xs leading-5 text-gray-300">Sale price until {date} (PH time), or until reserved or sold. Confirm availability with the seller.</p>
  </div>;
}
