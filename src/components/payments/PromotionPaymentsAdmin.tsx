'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPrice, formatShortDate } from '@/lib/utils';
import { labelPromotionPaymentMethod, type PromotionPayment } from '@/lib/payments/types';

export function PromotionPaymentsAdmin({ payments: initial }: { payments: PromotionPayment[] }) {
  const [payments, setPayments] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function action(payment: PromotionPayment, value: 'check' | 'review' | 'recover') {
    const note = value === 'review' ? window.prompt('What needs review? Refunds must be issued in PayMongo; this action only records a note.')?.trim() : undefined;
    const checkoutId = value === 'recover' ? window.prompt(`Find this reference in PayMongo: ${payment.id}. Enter its cs_ checkout ID. It will be verified before attachment.`)?.trim() : undefined;
    if ((value === 'review' && !note) || (value === 'recover' && !checkoutId)) return;
    setBusy(payment.id); setMessage('');
    try {
      const response = await fetch(`/api/admin/promotions/payments/${payment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: value, note, checkoutId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Payment action failed.');
      setPayments(previous => previous.map(row => row.id === payment.id ? result.payment : row));
      setMessage('Payment record updated.'); router.refresh();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(null); }
  }
  return <section className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h2 className="text-lg font-semibold text-gray-100">Promotion payments</h2>
    <Link href="/admin/coins" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-300 underline">GP Coin purchases and payment recovery →</Link>
    <p className="mt-1 text-sm leading-6 text-gray-400">QR Ph and other PayMongo payments are verified automatically. Issue PayMongo refunds in the <a href="https://dashboard.paymongo.com" target="_blank" rel="noopener noreferrer" className="text-teal-300 underline">PayMongo dashboard</a>; a review note does not send money. Confirmed refunds appear here after webhook delivery or reconciliation.</p>
    {message && <p role="status" className="mt-3 text-sm text-amber-100">{message}</p>}
    <div className="mt-4 space-y-3">{payments.length === 0 ? <p className="text-sm text-gray-500">No new payment records yet.</p> : payments.map(payment => <article key={payment.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-gray-100">{payment.placement === 'featured' ? 'Featured' : 'Top Pick'} · {payment.duration_days} days · {formatPrice(payment.amount_minor / 100)}{payment.coins_used > 0 ? ` + ${payment.coins_used} GP` : ''}</p><span className="text-xs capitalize text-teal-200">{payment.status}{!payment.livemode ? ' · Test' : ''}</span></div>
      <p className="mt-2 break-all font-mono text-xs text-gray-400">{payment.id}</p>
      <p className="mt-1 text-xs text-gray-400">{labelPromotionPaymentMethod(payment)}</p>
      <p className="mt-1 text-xs text-gray-500">{payment.provider_payment_id ?? payment.provider_checkout_id ?? 'No provider ID attached'} · {formatShortDate(payment.created_at)}</p>
      {payment.refunded_amount_minor > 0 && <p className="mt-1 text-xs text-teal-200">Refund confirmed: {formatPrice(payment.refunded_amount_minor / 100)}</p>}
      {payment.review_note && <p className="mt-2 break-words text-xs leading-5 text-amber-200">{payment.review_note}</p>}
      <div className="mt-2 flex flex-wrap gap-3">{(['check', 'review', ...(!payment.provider_checkout_id && !payment.paid_at && payment.provider === 'paymongo' && payment.status !== 'expired' ? ['recover'] : [])] as const).map(value => <button key={value} type="button" disabled={busy !== null} onClick={() => void action(payment, value as 'check' | 'review' | 'recover')} className="min-h-11 text-xs font-semibold text-teal-300 disabled:opacity-40">{busy === payment.id ? 'Working…' : value === 'check' ? 'Verify status' : value === 'review' ? 'Flag for review' : 'Recover checkout'}</button>)}</div>
    </article>)}</div>
  </section>;
}
