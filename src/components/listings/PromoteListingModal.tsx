'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { coinsToPesoDiscount, formatGpCoins, maxRedeemableCoins } from '@/lib/gpCoins';
import { FEATURED_PAYMENT_PROOF_BUCKET, FEATURED_PROMOTION_PRICES } from '@/lib/featuredPromotions';
import { formatPrice, formatShortDate } from '@/lib/utils';
import type { FeaturedPromotionOrder } from '@/types';

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
  initialPlacement?: Placement;
  initialTier?: Tier;
  gpCoinBalance?: number;
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
  initialPlacement,
  initialTier = '7d',
  gpCoinBalance = 0,
  onClose,
}: PromoteListingModalProps) {
  const [placement, setPlacement] = useState<Placement>(initialPlacement ?? 'featured');
  const [tier, setTier] = useState<Tier>(initialTier);
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [submitState, setSubmitState] = useState<'idle' | 'reserving' | 'uploading' | 'submitting' | 'success'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<FeaturedPromotionOrder | null>(null);
  const selectedPlacement = PLACEMENTS[placement];
  const selectedTier = selectedPlacement.tiers[tier];
  const isTopPick = placement === 'top_pick';
  const isFeatured = placement === 'featured';
  const isSubmitting = submitState === 'reserving' || submitState === 'uploading' || submitState === 'submitting';
  const maxCoinsForFeatured = isFeatured ? maxRedeemableCoins(gpCoinBalance, selectedTier.price) : 0;
  const safeCoinsToUse = Math.min(coinsToUse, maxCoinsForFeatured);
  const coinDiscountPhp = coinsToPesoDiscount(safeCoinsToUse);
  const cashAmountPhp = Math.max(0, selectedTier.price - coinDiscountPhp);
  const isCoinOnlyFeatured = isFeatured && cashAmountPhp === 0 && safeCoinsToUse > 0;

  function choosePlacement(nextPlacement: Placement) {
    setPlacement(nextPlacement);
    setTier('7d');
    setCoinsToUse(0);
  }

  function chooseTier(nextTier: Tier) {
    setTier(nextTier);
    setCoinsToUse(0);
  }

  async function submitFeaturedProof() {
    if (safeCoinsToUse !== coinsToUse) setCoinsToUse(safeCoinsToUse);

    if (!isCoinOnlyFeatured && !proofFile) {
      setSubmitError('Upload your payment screenshot first.');
      return;
    }
    if (proofFile && !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(proofFile.type)) {
      setSubmitError('Please upload an image screenshot.');
      return;
    }
    if (proofFile && proofFile.size > 8 * 1024 * 1024) {
      setSubmitError('Please upload a screenshot below 8MB.');
      return;
    }

    setSubmitError('');
    setSubmittedOrder(null);

    try {
      setSubmitState('reserving');
      const durationDays = selectedTier.days as keyof typeof FEATURED_PROMOTION_PRICES;
      const reserveResponse = await fetch('/api/promotions/featured/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, durationDays, coinsToUse: safeCoinsToUse }),
      });
      const reserveJson = await reserveResponse.json().catch(() => ({}));
      if (!reserveResponse.ok) throw new Error(reserveJson.error ?? 'Could not reserve Featured placement.');
      const order = reserveJson.order as FeaturedPromotionOrder;

      if (isCoinOnlyFeatured) {
        setSubmitState('submitting');
        const coinResponse = await fetch(`/api/promotions/featured/${order.id}/coin-payment`, {
          method: 'POST',
        });
        const coinJson = await coinResponse.json().catch(() => ({}));
        if (!coinResponse.ok) throw new Error(coinJson.error ?? 'Could not complete GP Coin payment.');
        setSubmittedOrder(coinJson.order as FeaturedPromotionOrder);
        setSubmitState('success');
        return;
      }

      if (!proofFile) throw new Error('Upload your payment screenshot first.');
      setSubmitState('uploading');
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Please sign in again before uploading proof.');
      const extension = proofFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const storagePath = `${userData.user.id}/${order.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(FEATURED_PAYMENT_PROOF_BUCKET)
        .upload(storagePath, proofFile, {
          cacheControl: '3600',
          contentType: proofFile.type || 'image/jpeg',
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      setSubmitState('submitting');
      const proofResponse = await fetch(`/api/promotions/featured/${order.id}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          transactionReference: transactionReference.trim() || null,
          proofStoragePath: storagePath,
        }),
      });
      const proofJson = await proofResponse.json().catch(() => ({}));
      if (!proofResponse.ok) throw new Error(proofJson.error ?? 'Could not submit payment proof.');

      setSubmittedOrder(proofJson.order as FeaturedPromotionOrder);
      setSubmitState('success');
    } catch (error) {
      setSubmitError((error as Error).message);
      setSubmitState('idle');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center p-4 bg-black/70"
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
                          choosePlacement(key);
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
                        onClick={() => chooseTier(key)}
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

              {isFeatured && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">3. Use GP Coins</p>
                  <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-100">{formatGpCoins(gpCoinBalance)} available</p>
                        <p className="mt-1 text-xs leading-5 text-amber-100/70">Use GP Coins here to promote your running shoes on the Go Pair PH homepage.</p>
                      </div>
                      {maxCoinsForFeatured <= 0 && (
                        <span className="shrink-0 rounded-full border border-amber-300/25 px-2 py-1 text-[11px] font-semibold text-amber-100/80">
                          Earn first
                        </span>
                      )}
                    </div>
                    {maxCoinsForFeatured > 0 && (
                      <div className="mt-3">
                        <input
                          type="range"
                          min={0}
                          max={maxCoinsForFeatured}
                          step={2}
                          value={safeCoinsToUse}
                          onChange={event => setCoinsToUse(Number(event.target.value))}
                          className="w-full accent-amber-400"
                          aria-label="GP Coins to use"
                        />
                        <div className="mt-2 flex items-center justify-between text-xs text-amber-100/80">
                          <button type="button" onClick={() => setCoinsToUse(0)} className="font-semibold hover:text-amber-50">Use 0</button>
                          <button type="button" onClick={() => setCoinsToUse(maxCoinsForFeatured)} className="font-semibold hover:text-amber-50">Use max</button>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-slate-950/45 p-2">
                        <p className="text-gray-500">Coins</p>
                        <p className="mt-0.5 font-bold text-gray-100">{safeCoinsToUse} GP</p>
                      </div>
                      <div className="rounded-lg bg-slate-950/45 p-2">
                        <p className="text-gray-500">Discount</p>
                        <p className="mt-0.5 font-bold text-gray-100">{formatPrice(coinDiscountPhp)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-950/45 p-2">
                        <p className="text-gray-500">Cash due</p>
                        <p className="mt-0.5 font-bold text-gray-100">{formatPrice(cashAmountPhp)}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3 — payment method */}
              {(!isFeatured || cashAmountPhp > 0) && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{isFeatured ? '4' : '3'}. Pay {formatPrice(cashAmountPhp || selectedTier.price)} via</p>
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
                    Scan the QR or save this screenshot to pay {formatPrice(cashAmountPhp || selectedTier.price)}.
                  </p>
                </div>
              </section>
              )}

              {isFeatured ? (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{cashAmountPhp > 0 ? '5. Upload proof' : '4. Confirm GP Coin payment'}</p>
                  {submitState === 'success' && submittedOrder ? (
                    <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
                      <p className="text-sm font-semibold text-teal-200">Featured request received</p>
                      <p className="mt-1 text-xs leading-5 text-teal-100/80">
                        Your listing is {submittedOrder.status === 'active' ? 'now provisionally Featured' : 'in the Featured queue'} while admin reviews the proof.
                      </p>
                      {submittedOrder.scheduled_end_at && (
                        <p className="mt-2 text-[11px] text-teal-200">
                          Scheduled until {formatShortDate(submittedOrder.scheduled_end_at)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cashAmountPhp > 0 && (
                      <label className="block">
                        <span className="text-xs font-medium text-gray-300">Transaction reference</span>
                        <input
                          value={transactionReference}
                          onChange={event => setTransactionReference(event.target.value)}
                          placeholder="GCash/BPI reference number"
                          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-base text-gray-100 outline-none focus:border-teal-400 sm:text-sm"
                        />
                      </label>
                      )}
                      {cashAmountPhp > 0 && (
                      <label className="block rounded-lg border border-dashed border-gray-700 bg-gray-950/60 p-3">
                        <span className="text-xs font-medium text-gray-300">Payment screenshot</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          onChange={event => setProofFile(event.target.files?.[0] ?? null)}
                          className="mt-2 block w-full text-xs text-gray-400 file:mr-3 file:rounded-md file:border-0 file:bg-teal-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                        />
                        {proofFile && (
                          <span className="mt-2 block truncate text-[11px] text-teal-300">{proofFile.name}</span>
                        )}
                      </label>
                      )}
                      {isCoinOnlyFeatured && (
                        <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.08] p-3">
                          <p className="text-sm font-semibold text-amber-100">No screenshot needed</p>
                          <p className="mt-1 text-xs leading-5 text-amber-100/75">
                            This Featured request will use {safeCoinsToUse} GP Coins and auto-approve if the 30-day full-coin limit is clear.
                          </p>
                        </div>
                      )}
                      {submitError && <p className="text-xs text-red-400">{submitError}</p>}
                      <Button
                        type="button"
                        onClick={submitFeaturedProof}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {submitState === 'reserving'
                          ? 'Reserving…'
                          : submitState === 'uploading'
                            ? 'Uploading proof…'
                            : submitState === 'submitting'
                              ? 'Submitting…'
                              : isCoinOnlyFeatured ? 'Use GP Coins and Feature' : 'Submit Featured request'}
                      </Button>
                      <p className="text-[10px] leading-4 text-gray-600">
                        Your position is reserved for 20 minutes while the proof is uploaded. Invalid proof can be removed after admin review.
                      </p>
                    </div>
                  )}
                </section>
              ) : (
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
              )}

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
          <Button variant="neutral" onClick={onClose} className="w-full">Close</Button>
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
