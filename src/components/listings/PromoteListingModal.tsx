'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatShortDate } from '@/lib/utils';

const MESSENGER_URL = 'https://m.me/GoPairPH';
const FB_PROFILE_URL = 'https://www.facebook.com/gopairph';

type Placement = 'featured' | 'top_pick';
type Tier = '7d' | '30d';
type PaymentMethod = 'gcash' | 'bpi';

const PLACEMENTS: Record<Placement, {
  label: string;
  description: string;
  detail: string;
  tiers: Record<Tier, { label: string; days: number; price: number; priceLabel: string }>;
}> = {
  featured: {
    label: 'Featured on Home',
    description: 'Pair of the Week placement',
    detail: 'Only one Featured listing is active at a time. Admin will confirm availability before activation.',
    tiers: {
      '7d': { label: '7 Days', days: 7, price: 50, priceLabel: '₱50' },
      '30d': { label: '30 Days', days: 30, price: 150, priceLabel: '₱150' },
    },
  },
  top_pick: {
    label: 'Top Pick in Browse',
    description: 'Near-top Browse placement',
    detail: 'Top Pick helps your listing appear near the top of Browse for the selected duration.',
    tiers: {
      '7d': { label: '7 Days', days: 7, price: 30, priceLabel: '₱30' },
      '30d': { label: '30 Days', days: 30, price: 100, priceLabel: '₱100' },
    },
  },
};

interface PromoteListingModalProps {
  listingId: string;
  listingName: string;
  /** Earliest currently-active sponsored slot expiration, if all slots are taken. */
  slotsAvailable: boolean;
  nextSlotOpensAt: string | null;
  ownListingAlreadySponsored: boolean;
  ownSponsoredUntil: string | null;
  ownListingAlreadyFeatured: boolean;
  ownFeaturedUntil: string | null;
  onClose: () => void;
}

export function PromoteListingModal({
  listingId,
  listingName,
  slotsAvailable,
  nextSlotOpensAt,
  ownListingAlreadySponsored,
  ownSponsoredUntil,
  ownListingAlreadyFeatured,
  ownFeaturedUntil,
  onClose,
}: PromoteListingModalProps) {
  const [placement, setPlacement] = useState<Placement>(
    (!slotsAvailable || ownListingAlreadySponsored) && !ownListingAlreadyFeatured ? 'featured' : 'top_pick',
  );
  const [tier, setTier] = useState<Tier>('7d');
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const selectedPlacement = PLACEMENTS[placement];
  const selectedTier = selectedPlacement.tiers[tier];
  const isTopPick = placement === 'top_pick';
  const isFeatured = placement === 'featured';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-100">Promote Listing</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{listingName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {isTopPick && ownListingAlreadySponsored && ownSponsoredUntil ? (
            <div className="rounded-lg border border-teal-700 bg-teal-950 p-4">
              <p className="text-sm font-semibold text-teal-300">Your listing is currently a Top Pick</p>
              <p className="text-xs text-teal-400 mt-1">
                Active until <span className="font-semibold">{formatShortDate(ownSponsoredUntil)}</span>. You&apos;re already near the top of Browse.
              </p>
              {!ownListingAlreadyFeatured && (
                <button
                  type="button"
                  onClick={() => setPlacement('featured')}
                  className="mt-3 rounded-lg border border-teal-400/30 px-3 py-2 text-xs font-semibold text-teal-100 transition-colors hover:bg-teal-400/10"
                >
                  View Featured option
                </button>
              )}
            </div>
          ) : isFeatured && ownListingAlreadyFeatured && ownFeaturedUntil ? (
            <div className="rounded-lg border border-teal-700 bg-teal-950 p-4">
              <p className="text-sm font-semibold text-teal-300">Your listing is currently Featured</p>
              <p className="text-xs text-teal-400 mt-1">
                Active until <span className="font-semibold">{formatShortDate(ownFeaturedUntil)}</span>. You&apos;re already in the home-page spotlight.
              </p>
              {!ownListingAlreadySponsored && (
                <button
                  type="button"
                  onClick={() => setPlacement('top_pick')}
                  className="mt-3 rounded-lg border border-teal-400/30 px-3 py-2 text-xs font-semibold text-teal-100 transition-colors hover:bg-teal-400/10"
                >
                  View Top Pick option
                </button>
              )}
            </div>
          ) : isTopPick && !slotsAvailable && nextSlotOpensAt ? (
            <div className="rounded-lg border border-amber-800 bg-amber-950 p-4">
              <p className="text-sm font-semibold text-amber-300">Top Pick slots are full</p>
              <p className="text-xs text-amber-400 mt-1">
                The next slot opens on <span className="font-semibold">{formatShortDate(nextSlotOpensAt)}</span>. Come back then to promote your listing — there&apos;s no reservation queue.
              </p>
              <button
                type="button"
                onClick={() => setPlacement('featured')}
                className="mt-3 rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/10"
              >
                View Featured option
              </button>
            </div>
          ) : (
            <>
              {/* Step 1 — pick a tier */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">1. Choose placement</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(PLACEMENTS) as Placement[]).map(key => {
                    const option = PLACEMENTS[key];
                    const active = placement === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setPlacement(key);
                          setTier('7d');
                        }}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
                        }`}
                      >
                        <p className={`text-sm font-bold ${active ? 'text-teal-300' : 'text-gray-200'}`}>
                          {option.label}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-gray-500">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-400">{selectedPlacement.detail}</p>
              </section>

              {/* Step 2 — pick a tier */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">2. Choose duration</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(selectedPlacement.tiers) as Tier[]).map(key => {
                    const t = selectedPlacement.tiers[key];
                    const active = tier === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setTier(key)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
                        }`}
                      >
                        <p className={`text-base font-bold ${active ? 'text-teal-300' : 'text-gray-200'}`}>
                          {t.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.priceLabel}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 3 — payment method */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">3. Pay {selectedTier.priceLabel} via</p>
                <div className="flex gap-2 mb-3">
                  {(['gcash', 'bpi'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        method === m
                          ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-750'
                      }`}
                    >
                      {m === 'gcash' ? 'GCash' : 'BPI'}
                    </button>
                  ))}
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                  <div className="flex justify-center">
                    <Image
                      src={method === 'gcash' ? '/payments/gcash.jpg' : '/payments/bpi.jpg'}
                      alt={`${method === 'gcash' ? 'GCash' : 'BPI'} payment details`}
                      width={1003}
                      height={1851}
                      className="rounded-md w-auto h-auto max-h-[55vh] max-w-full"
                      sizes="(max-width: 640px) 80vw, 320px"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500 text-center">
                    Scan the QR or save this screenshot to pay {selectedTier.priceLabel}.
                  </p>
                </div>
              </section>

              {/* Step 4 — send proof */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">4. Send the screenshot</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Send the receipt screenshot to Go Pair PH on Messenger with your listing link and selected placement.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href={MESSENGER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
                    </svg>
                    Send proof via Messenger
                  </a>
                  <a
                    href={FB_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center text-xs text-gray-500 hover:text-teal-400 transition-colors"
                  >
                    or contact the admin on Facebook →
                  </a>
                </div>
              </section>

              {/* Honesty footer */}
              <p className="text-[10px] text-gray-600 leading-relaxed">
                {isFeatured
                  ? 'Featured listings appear on the home page. '
                  : 'Top Pick listings appear near the top of Browse. Top Pick is paid placement. '}
                Go Pair PH manually activates each promotion after verifying your payment. Listing ID:{' '}
                <span className="font-mono">{listingId.slice(0, 8)}</span>
              </p>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-800 shrink-0">
          <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}

interface UnverifiedNoticeProps {
  onClose: () => void;
}

export function UnverifiedNotice({ onClose }: UnverifiedNoticeProps) {
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
          Only verified users can request Featured or Top Pick placements.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Link href="/help/verification" className="flex-1">
            <Button className="w-full">Get Verified →</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
