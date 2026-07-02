'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateBuybackQuote, type BuybackQuote } from '@/lib/pricing/buyback';
import { BUYBACK_STATUS_LABELS, type SellerBuybackOffer } from '@/lib/buyback';
import { formatPrice, formatRelativeDate } from '@/lib/utils';
import type { Condition } from '@/types';
import { trackMarketplaceAction } from '@/lib/analytics';

interface BuybackOfferPanelProps {
  listing: {
    id: string;
    condition: Condition;
    mileage_km: number | null;
    price_php: number | null;
    srp_php: number | null;
  };
  isVerified: boolean;
  hasRequiredPhotos: boolean;
  canSubmit: boolean;
  existingOffer: SellerBuybackOffer | null;
  shipDateMin: string;
  shipDateMax: string;
}

function statusTone(status: SellerBuybackOffer['status']): string {
  if (status === 'accepted' || status === 'completed') return 'border-teal-400/30 bg-teal-500/[0.07] text-teal-100';
  if (status === 'declined' || status === 'disputed') return 'border-amber-400/30 bg-amber-500/[0.07] text-amber-100';
  return 'border-sky-400/25 bg-sky-500/[0.06] text-sky-100';
}

export function BuybackOfferPanel(props: BuybackOfferPanelProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [srpPromptOpen, setSrpPromptOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [hasBox, setHasBox] = useState(false);
  const [hasVisibleFlaws, setHasVisibleFlaws] = useState(false);
  const [flawNotes, setFlawNotes] = useState('');
  const [sellerNote, setSellerNote] = useState('');
  const [shipDate, setShipDate] = useState(props.shipDateMin);
  const [ackOwnership, setAckOwnership] = useState(false);
  const [ackAuthenticity, setAckAuthenticity] = useState(false);
  const [ackAccuracy, setAckAccuracy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [shipping, setShipping] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const quote = useMemo<BuybackQuote | null>(() => {
    if (!props.listing.srp_php || !props.listing.price_php || !purchaseDate) return null;
    return calculateBuybackQuote({
      originalPricePhp: props.listing.srp_php,
      listingPricePhp: props.listing.price_php,
      purchaseDate,
      condition: props.listing.condition,
      mileageKm: props.listing.mileage_km,
      hasBox,
      hasVisibleFlaws,
    });
  }, [hasBox, hasVisibleFlaws, props.listing, purchaseDate]);

  const blockers = [
    !props.isVerified ? 'Verify your profile first.' : null,
    !props.listing.srp_php ? 'Add the original price to your listing.' : null,
    !props.listing.price_php ? 'Add a listing price.' : null,
    !props.hasRequiredPhotos ? 'Add clear top and sole listing photos.' : null,
  ].filter(Boolean) as string[];

  function closeDialogs() {
    setOpen(false);
    setSrpPromptOpen(false);
  }

  useEffect(() => {
    if (!open && !srpPromptOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSrpPromptOpen(false);
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [open, srpPromptOpen]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    form.set('listing_id', props.listing.id);
    form.set('has_box', String(hasBox));
    form.set('has_visible_flaws', String(hasVisibleFlaws));
    form.set('ack_ownership', String(ackOwnership));
    form.set('ack_authenticity', String(ackAuthenticity));
    form.set('ack_accuracy', String(ackAccuracy));
    try {
      const response = await fetch('/api/buyback-offers', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not submit your offer.');
      setOpen(false);
      trackMarketplaceAction('buyback_submit', { listing_id: props.listing.id, quoted_price_php: quote?.quotedPricePhp });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your offer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOffer() {
    if (!props.existingOffer || !window.confirm('Cancel this Go Pair PH offer?')) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/buyback-offers/${props.existingOffer.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not cancel the offer.');
      trackMarketplaceAction('buyback_cancel', { listing_id: props.listing.id, status: props.existingOffer.status });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the offer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function markShipped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.existingOffer) return;
    setShipping(true);
    setError('');
    try {
      const response = await fetch(`/api/buyback-offers/${props.existingOffer.id}`, { method: 'POST', body: new FormData(event.currentTarget) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not save the shipment.');
      trackMarketplaceAction('buyback_shipped', { listing_id: props.listing.id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the shipment.');
    } finally {
      setShipping(false);
    }
  }

  function openBuybackFlow() {
    trackMarketplaceAction('buyback_open', { listing_id: props.listing.id, eligible_at_open: blockers.length === 0 });
    if (!props.listing.srp_php) {
      setSrpPromptOpen(true);
      return;
    }
    setOpen(true);
  }

  const activeOffer = props.existingOffer && ['pending', 'accepted', 'shipped', 'delivered', 'completed', 'disputed'].includes(props.existingOffer.status)
    ? props.existingOffer
    : null;

  return (
    <div className="space-y-2">
      {props.existingOffer && (
        <div className={`rounded-xl border p-4 ${statusTone(props.existingOffer.status)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-75">Go Pair PH offer · Attempt #{props.existingOffer.attempt_number}</p>
              <p className="mt-1 text-sm font-bold">{BUYBACK_STATUS_LABELS[props.existingOffer.status]}</p>
            </div>
            <p className="shrink-0 text-lg font-bold">{formatPrice(props.existingOffer.quoted_price_php)}</p>
          </div>
          <p className="mt-2 text-xs leading-5 opacity-80">Sent {formatRelativeDate(props.existingOffer.created_at)} · Proposed send date {props.existingOffer.proposed_ship_date}</p>
          {props.existingOffer.admin_note && <p className="mt-3 rounded-lg bg-black/15 px-3 py-2 text-sm leading-6"><span className="font-semibold">Go Pair PH:</span> {props.existingOffer.admin_note}</p>}
          {props.existingOffer.decline_reason && <p className="mt-2 text-xs font-semibold">Reason: {props.existingOffer.decline_reason}</p>}

          {props.existingOffer.status === 'accepted' && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div className="rounded-lg bg-black/15 p-3 text-xs leading-5">
                <p className="font-semibold">Book J&T COD for {formatPrice(props.existingOffer.quoted_price_php)}</p>
                <p className="mt-1">Send on {props.existingOffer.proposed_ship_date} to {props.existingOffer.recipient_name}, {props.existingOffer.recipient_phone}</p>
                <p className="mt-1 break-words">{props.existingOffer.recipient_address}</p>
                <p className="mt-2 opacity-80">You shoulder the shipping fee. Upload the booking confirmation after arranging the shipment.</p>
              </div>
              <form onSubmit={markShipped} className="space-y-2">
                <input name="tracking_number" value={trackingNumber} onChange={event => setTrackingNumber(event.target.value)} required placeholder="J&T tracking number" className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white" />
                <label className="block text-xs font-medium">J&T booking confirmation
                  <input name="booking_confirmation" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-teal-500/15 file:px-3 file:py-2 file:font-semibold file:text-teal-200" />
                </label>
                <button disabled={shipping} className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{shipping ? 'Saving shipment…' : 'Submit Tracking'}</button>
              </form>
            </div>
          )}
          {(props.existingOffer.status === 'pending' || props.existingOffer.status === 'accepted') && (
            <button type="button" onClick={cancelOffer} disabled={submitting} className="mt-3 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100">Cancel request</button>
          )}
        </div>
      )}

      {!activeOffer && props.canSubmit && (
        <>
          <button type="button" onClick={openBuybackFlow} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(20,184,166,0.22)] transition-colors hover:bg-teal-400">
            <span aria-hidden="true">⚡</span> Sell Fast to Go Pair PH
          </button>
          <p className="px-1 text-center text-xs leading-5 text-gray-500">Need cash sooner? Get a lower instant-buy quote from Go Pair PH. If approved, you can ship your shoes through J&amp;T COD.</p>
        </>
      )}
      {error && !open && <p className="text-xs text-red-300">{error}</p>}

      {mounted && (open || srpPromptOpen) ? createPortal((
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeDialogs(); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="buyback-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-white/10 bg-slate-950 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Go Pair PH</p>
                <h2 id="buyback-title" className="mt-1 text-xl font-bold text-white">Get a fast-cash offer from Go Pair PH</h2>
              </div>
              <button ref={closeRef} type="button" onClick={closeDialogs} aria-label="Close" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white">✕</button>
            </div>

            {srpPromptOpen ? (
              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.07] p-4">
                  <p className="text-sm font-bold text-white">Add the original price first</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">Go Pair PH needs the original price to calculate a fair lower instant-buy quote. Add it to your listing, then come back here to send the offer.</p>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Link href={`/listings/${props.listing.id}/edit`} className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-400">Edit Listing</Link>
                  <button type="button" onClick={closeDialogs} className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-700">Maybe later</button>
                </div>
              </div>
            ) : blockers.length > 0 ? (
              <div className="overflow-y-auto p-5 sm:p-6">
                <p className="text-sm font-semibold text-white">Complete these before sending an offer:</p>
                <ul className="mt-3 space-y-2 text-sm text-amber-100">
                  {blockers.map(blocker => <li key={blocker}>• {blocker}</li>)}
                </ul>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {!props.isVerified && <Link href="/profile?tab=verification" className="rounded-lg bg-teal-500 px-4 py-2.5 text-center text-sm font-semibold text-white">Verify profile</Link>}
                  <Link href={`/listings/${props.listing.id}/edit`} className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white">Edit listing</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                  <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-gray-300">
                    <p>Go Pair PH may buy your shoes directly at a lower price than the normal marketplace fast-sale price.</p>
                    <p className="mt-2">The quote accounts for inspection, resale, and inventory risk. We review your receipt, details, and photos before accepting.</p>
                  </div>

                  <section>
                    <h3 className="text-sm font-bold text-white">1. Receipt and quote</h3>
                    <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Computed retail basis</p>
                      <p className="mt-1 text-lg font-bold text-white">{formatPrice(props.listing.srp_php!)}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">Based on the original price saved in your listing.</p>
                    </div>
                    <label className="mt-3 block text-xs font-medium text-gray-300">Purchase date
                      <input name="purchase_date" value={purchaseDate} onChange={event => setPurchaseDate(event.target.value)} required max={new Date().toISOString().slice(0, 10)} type="date" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white" />
                    </label>
                    <div className="mt-3 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-300">Automatic buyback quote</p>
                      <p className="mt-1 text-2xl font-bold text-white">{quote ? (quote.eligible ? formatPrice(quote.quotedPricePhp) : 'Not currently eligible') : 'Add purchase date'}</p>
                      {quote && <p className="mt-1 text-xs text-gray-400">Fast-sale estimate {formatPrice(quote.fastSaleEstimatePhp)} · fixed if accepted</p>}
                      <details className="mt-3 text-xs text-gray-400">
                        <summary className="cursor-pointer font-semibold text-teal-200">How this quote is calculated</summary>
                        <p className="mt-2 leading-5">We estimate the fast-sale value from the original price and shoe details. Your Go Pair PH offer is the lower of 60% of that fast-sale estimate or 70% of your listing price, capped at ₱10,000 and rounded down to the nearest ₱100. Quotes below ₱500 are not eligible.</p>
                      </details>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-bold text-white">2. Condition details</h3>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-300">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={hasBox} onChange={event => setHasBox(event.target.checked)} className="h-4 w-4 accent-teal-500" /> Original box included</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={hasVisibleFlaws} onChange={event => setHasVisibleFlaws(event.target.checked)} className="h-4 w-4 accent-teal-500" /> Has visible flaws</label>
                    </div>
                    <textarea name="flaw_notes" value={flawNotes} onChange={event => setFlawNotes(event.target.value)} required={hasVisibleFlaws} maxLength={1000} rows={3} className="mt-3 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white" placeholder="Describe defects, wear, repairs, stains, separation, or other relevant details." />
                  </section>

                  <section>
                    <h3 className="text-sm font-bold text-white">3. Receipt upload</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">Only Go Pair PH admins can review your receipt. You may redact unrelated card or account numbers.</p>
                    <label className="mt-3 block rounded-lg border border-white/10 bg-slate-900/60 p-3 text-xs font-semibold text-gray-200">Receipt
                      <span className="mt-0.5 block font-normal text-gray-500">Upload a clear photo or PDF showing the retailer, date, item, and amount.</span>
                      <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="mt-2 block w-full font-normal text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
                    </label>
                    <p className="mt-3 rounded-lg border border-teal-400/15 bg-teal-400/[0.05] px-3 py-2 text-xs leading-5 text-teal-50">Please make sure your listing photos clearly show the top and sole, plus any visible flaws on the shoes.</p>
                  </section>

                  <section>
                    <h3 className="text-sm font-bold text-white">4. Proposed shipping date</h3>
                    <input name="proposed_ship_date" type="date" min={props.shipDateMin} max={props.shipDateMax} value={shipDate} onChange={event => setShipDate(event.target.value)} required className="mt-3 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white" />
                    <p className="mt-2 text-xs leading-5 text-gray-500">If accepted, we will confirm this date and email the recipient details. J&amp;T COD booking happens after acceptance.</p>
                    <textarea name="seller_note" value={sellerNote} onChange={event => setSellerNote(event.target.value)} maxLength={1000} rows={3} className="mt-3 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white" placeholder="Anything else Go Pair PH should know? (Optional)" />
                    <a href="https://www.facebook.com/gopairph" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-blue-300 underline">Send additional information through our Facebook Page</a>
                  </section>

                  <section className="space-y-3 rounded-xl border border-white/10 p-4 text-sm text-gray-300">
                    <label className="flex items-start gap-3"><input type="checkbox" checked={ackOwnership} onChange={event => setAckOwnership(event.target.checked)} required className="mt-1 h-4 w-4 accent-teal-500" /><span>I own these shoes and have the right to sell them.</span></label>
                    <label className="flex items-start gap-3"><input type="checkbox" checked={ackAuthenticity} onChange={event => setAckAuthenticity(event.target.checked)} required className="mt-1 h-4 w-4 accent-teal-500" /><span>The shoes are authentic and the receipt is real and unaltered.</span></label>
                    <label className="flex items-start gap-3"><input type="checkbox" checked={ackAccuracy} onChange={event => setAckAccuracy(event.target.checked)} required className="mt-1 h-4 w-4 accent-teal-500" /><span>The condition and details are accurate, and I will ship the exact shoes shown if accepted.</span></label>
                  </section>
                  {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                </div>
                <div className="border-t border-white/10 bg-slate-950 p-4 sm:px-6">
                  <button type="submit" disabled={submitting || !quote?.eligible} className="w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Sending offer…' : quote?.eligible ? `Send ${formatPrice(quote.quotedPricePhp)} Offer` : 'Complete the details above'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      ), document.body) : null}
    </div>
  );
}
