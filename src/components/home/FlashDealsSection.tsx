'use client';

import Link from 'next/link';
import type { Shoe } from '@/types';
import { isFlashDealLive } from '@/lib/flashDeals';
import { useFlashDealClock } from '@/components/listings/FlashDealPrice';
import { HomeListingGrid } from './HomeListingGrid';

export function FlashDealsSection({ shoes, currentProfileId, all = false }: { shoes: Shoe[]; currentProfileId?: string; all?: boolean }) {
  const earliest = shoes.map(shoe => shoe.flash_deal_ends_at!).filter(end => Date.parse(end) > Date.now()).sort()[0];
  const now = useFlashDealClock(earliest);
  const live = shoes.filter(shoe => isFlashDealLive(shoe, now));
  return <section aria-labelledby={all ? undefined : 'flash-deals-heading'} aria-label={all ? 'Live Flash Deals' : undefined} className={all ? '' : 'mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8'}>
    {!all && <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">Promoted · seller discounts</p>
        <h2 id="flash-deals-heading" className="mt-1 text-2xl font-bold text-gray-100">⚡ Flash Deals</h2>
        <p className="mt-1 text-sm text-gray-400">Lower prices on running shoes for 24 hours.</p></div>
      {live.length > 0 && <Link href="/flash-deals" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">View all deals →</Link>}
    </div>}
    {live.length ? <HomeListingGrid shoes={all ? live : live.slice(0,2)} currentProfileId={currentProfileId}
      showSaveActions={false} showFreshnessDates={false} className={all ? '' : 'sm:grid-cols-2 lg:max-w-2xl'} emptyMessage="No live deals right now." />
      : <div className="rounded-xl border border-amber-200/15 bg-amber-200/[0.03] p-4 text-sm leading-6 text-gray-300">
        <p className="font-semibold text-gray-100">No live deals right now.</p><p>Selling running shoes? Offer a lower price and give buyers a reason to take another look.</p>
      </div>}
    <Link href="/flash-deals/new" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-300 underline-offset-4 hover:underline">Selling shoes? Start a flash deal →</Link>
  </section>;
}
