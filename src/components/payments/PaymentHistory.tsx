'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { isAwaitingPayment, labelPromotionPaymentMethod, type PromotionPayment } from '@/lib/payments/types';
import { formatListingName, formatPrice, formatShortDate, getListingPath } from '@/lib/utils';
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/constants';

type PlacementStatus = { status: string; scheduled_start_at: string | null; scheduled_end_at: string | null };
const labels = { creating: 'Preparing checkout', pending: 'Awaiting payment', paid: 'Payment confirmed', expired: 'Checkout expired', review: 'Payment needs review', refunded: 'Payment refunded' };

export function PaymentHistory({ initialPayments, selected, requested, returned }: { initialPayments: PromotionPayment[]; selected: PromotionPayment | null; requested: boolean; returned: string }) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [current, setCurrent] = useState(selected);
  const [placement, setPlacement] = useState<PlacementStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState('');
  const [pollingEnded, setPollingEnded] = useState(false);
  const inFlight = useRef(false);
  const id = current?.id;
  const currentId = useRef(id);
  currentId.current = id;
  const awaiting = current ? isAwaitingPayment(current) : false;

  useEffect(() => {
    setPayments(previous => initialPayments.map(row => {
      const verified = previous.find(payment => payment.id === row.id);
      return verified?.paid_at && !row.paid_at ? { ...row, ...verified } : row;
    }));
  }, [initialPayments]);

  const check = useCallback(async (action: 'check' | 'cancel' = 'check') => {
    if (!id || inFlight.current) return;
    inFlight.current = true; setBusy(true); setWarning('');
    try {
      const response = await fetch(`/api/promotions/payments/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (response.status === 401) { window.location.assign(`/auth/sign-in?next=${encodeURIComponent(`/promotions/payments?order=${id}`)}`); return; }
      if (!response.ok) throw new Error(result.error ?? 'Could not refresh payment.');
      setCurrent(previous => previous?.id === id ? { ...previous, ...result.payment } : previous);
      setPayments(previous => previous.map(payment => payment.id === id ? { ...payment, ...result.payment } : payment));
      if (currentId.current !== id) return;
      setPlacement(result.placement); setWarning(result.warning ?? '');
      if (action === 'cancel' && isAwaitingPayment(result.payment)) setWarning('Checkout has not closed yet. A payment may be processing. Please refresh status before trying again.');
    } catch (error) { setWarning((error as Error).message); }
    finally { inFlight.current = false; setBusy(false); }
  }, [id]);

  useEffect(() => { setPlacement(null); setPollingEnded(false); if (id) void check(); }, [id, check]);
  useEffect(() => {
    if (!awaiting || !id) return;
    const deadline = Date.now() + 120_000;
    const timer = setInterval(() => {
      if (Date.now() >= deadline) { clearInterval(timer); setPollingEnded(true); }
      else if (document.visibilityState === 'visible') void check();
    }, 10_000);
    return () => clearInterval(timer);
  }, [awaiting, id, check]);

  function choose(payment: PromotionPayment) {
    setCurrent(payment); setPlacement(null); setWarning(''); setPollingEnded(false);
    window.history.replaceState(null, '', `/promotions/payments?order=${payment.id}`);
  }

  return <div className="space-y-5">
    <Link href="/profile" className="inline-block py-2 text-sm text-teal-300">← Back to your profile</Link>
    {requested && !selected && !current && <p role="alert" className="rounded-xl border border-amber-500/30 p-4 text-sm text-amber-100">We couldn&apos;t find that payment in your account. Check the history below or contact support with your reference.</p>}
    {current && <section className="rounded-2xl border border-teal-500/30 bg-gray-900 p-4 sm:p-5" aria-labelledby="payment-status-title">
      <div role="status" aria-live="polite"><h2 id="payment-status-title" className="text-lg font-bold text-gray-100">{pollingEnded && awaiting ? 'Confirmation is taking longer' : labels[current.status]}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{current.status === 'paid' ? 'Your payment is verified. Your shoes are promoted now or waiting in the Featured queue. Check the placement status below.' : current.status === 'refunded' ? current.provider === 'gp_coins' ? 'Your GP Coins were returned to your wallet.' : 'PayMongo confirmed the refund. Posting time depends on your payment method.' : current.status === 'expired' ? 'This checkout is closed. Reserved GP Coins and the promotion slot have been released. If you were charged, contact support before paying again.' : current.status === 'review' ? current.paid_at ? 'Your payment was received and needs review. Contact support with your reference before making another payment.' : 'We are checking this checkout. Contact support with your reference before making another payment.' : returned === 'cancelled' ? 'Returning from checkout does not confirm whether payment completed. We will check automatically for up to two minutes. If you paid, avoid paying again.' : 'We will check for payment confirmation automatically for up to two minutes. If you already paid, avoid paying again.'}</p>
      </div>
      {!current.livemode && <p className="mt-2 text-xs font-semibold text-amber-200">Test payment</p>}
      <dl className="mt-4 space-y-2 text-sm text-gray-300">
        <div className="flex justify-between gap-3"><dt>Promotion</dt><dd>{current.placement === 'featured' ? 'Featured' : 'Top Pick'} · {current.duration_days} days</dd></div>
        <div className="flex justify-between gap-3"><dt>{current.paid_at ? 'Amount paid' : 'Amount due'}</dt><dd>{formatPrice(current.amount_minor / 100)}{current.coins_used > 0 ? ` + ${current.coins_used} GP` : ''}</dd></div>
        <div className="flex justify-between gap-3"><dt>Payment method</dt><dd className="text-right">{labelPromotionPaymentMethod(current)}</dd></div>
        {current.refunded_amount_minor > 0 && <div className="flex justify-between gap-3"><dt>Refund confirmed</dt><dd>{formatPrice(current.refunded_amount_minor / 100)}</dd></div>}
        {placement && <div className="flex justify-between gap-3"><dt>Placement</dt><dd className="text-right capitalize">{current.status === 'refunded' ? 'Ended' : placement.status === 'refund_required' ? 'Needs refund review' : placement.status.replaceAll('_', ' ')}{placement.scheduled_end_at && <span className="mt-1 block text-xs text-gray-500">Until {formatShortDate(placement.scheduled_end_at)}</span>}</dd></div>}
        <div><dt className="text-xs text-gray-500">Reference</dt><dd className="mt-1 break-all font-mono text-xs">{current.id}</dd></div>
      </dl>
      {warning && <p role="alert" className="mt-3 text-sm leading-6 text-amber-200">{warning}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="neutral" loading={busy} onClick={() => void check()} className="min-h-11">Refresh status</Button>
        {awaiting && current.checkout_url && current.provider_checkout_id && Date.parse(current.expires_at) > Date.now() && <a href={current.checkout_url} className="flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Resume PayMongo checkout</a>}
        {awaiting && current.provider_checkout_id && <Button type="button" variant="neutral" disabled={busy} onClick={() => void check('cancel')} className="min-h-11">Cancel unpaid checkout</Button>}
        <a href={`mailto:${PUBLIC_SUPPORT_EMAIL}?subject=${encodeURIComponent(`Promotion payment help: ${current.id}`)}`} className="flex min-h-11 items-center justify-center px-2 text-sm text-teal-300">Contact support</a>
      </div>
    </section>}
    <section className="space-y-3" aria-label="Recent promotion payments">
      <h2 className="text-base font-semibold text-gray-200">Recent payments</h2>
      {payments.length === 0 ? <p className="rounded-xl border border-gray-800 p-4 text-sm text-gray-400">No promotion payments yet. Open one of your active listings and choose Promote Listing.</p> : payments.map(payment => <article key={payment.id} className={`rounded-xl border bg-gray-900 p-4 ${current?.id === payment.id ? 'border-teal-500/40' : 'border-gray-800'}`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-gray-100">{payment.listing ? formatListingName(payment.listing.brand, payment.listing.model) : 'Running shoe promotion'}</p><p className="mt-1 text-xs text-gray-400">{payment.placement === 'featured' ? 'Featured' : 'Top Pick'} · {payment.duration_days} days · {formatPrice(payment.amount_minor / 100)}{payment.coins_used > 0 ? ` + ${payment.coins_used} GP` : ''}</p></div><span className="shrink-0 text-xs text-gray-500">{formatShortDate(payment.created_at)}</span></div>
        <p className="mt-2 text-xs text-teal-200">{labels[payment.status]}{!payment.livemode ? ' · Test' : ''}</p>
        <div className="mt-2 flex flex-wrap gap-x-5"><button type="button" onClick={() => choose(payment)} className="min-h-11 text-xs font-semibold text-teal-300">View payment</button>{payment.listing && <Link href={getListingPath(payment.listing)} className="flex min-h-11 items-center text-xs text-gray-400">View shoes</Link>}</div>
      </article>)}
    </section>
    <button type="button" onClick={() => router.refresh()} className="py-2 text-xs text-gray-500">Reload history</button>
  </div>;
}
