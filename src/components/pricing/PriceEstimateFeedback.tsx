'use client';

import { useRef, useState, type FormEvent } from 'react';
import { PRICE_FEEDBACK_REASONS, type PriceFeedbackReason, type PriceFeedbackSnapshot } from '@/lib/feedback';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function PriceEstimateFeedback({ snapshot }: { snapshot: PriceFeedbackSnapshot }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<PriceFeedbackReason | ''>('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ content: string; id: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = Number(price);
    if (!reason || !price.trim() || !Number.isFinite(value) || value < 1 || value > 1_000_000) {
      setError('Choose a reason and enter your suggested price.'); return;
    }
    if (reason === 'too_low' ? value <= snapshot.reference_price_php : value >= snapshot.reference_price_php) {
      setError(`Your suggested price should be ${reason === 'too_low' ? 'higher' : 'lower'} than ${formatPrice(snapshot.reference_price_php)}.`); return;
    }
    const payload = { estimate_id: snapshot.estimate_id, engine_version: snapshot.engine_version, input: snapshot.input, price_choice: snapshot.price_choice,
      reference_price_php: snapshot.reference_price_php, reason, suggested_price_php: value, message: message.trim() };
    const content = JSON.stringify(payload);
    if (attempt.current?.content !== content) attempt.current = { content, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/price-estimator/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, submission_id: attempt.current.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Could not send feedback. Please try again.');
      setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send feedback. Please try again.'); }
    finally { setBusy(false); }
  }

  if (sent) return <p role="status" className="mt-4 rounded-xl border border-teal-400/25 bg-teal-400/[0.06] p-3 text-sm text-teal-100">Thanks! Your price feedback is saved for admin review.</p>;
  return (
    <section className="mt-4 rounded-xl border border-white/[0.08] bg-slate-950/60 p-3 sm:p-4" aria-label="Price estimate feedback">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-200">Does this price feel right?</p>
        <button type="button" aria-expanded={open} aria-controls="price-feedback-form" onClick={() => setOpen(value => !value)} disabled={busy}
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal-300 hover:bg-teal-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400">
          {open ? 'Hide feedback' : 'Give price feedback'}
        </button>
      </div>
      {open && <form id="price-feedback-form" onSubmit={submit} className="mt-3 space-y-3">
        <p className="text-xs leading-5 text-gray-400">Reviewing {formatPrice(snapshot.reference_price_php)} for your {snapshot.input.brand} {snapshot.input.model}. Your suggestion helps us review the guide.</p>
        <fieldset disabled={busy} className="space-y-3">
          <div>
            <label htmlFor="price-feedback-reason" className="mb-1 block text-sm font-medium text-gray-300">Reason <span className="text-teal-400">*</span></label>
            <select id="price-feedback-reason" required value={reason} onChange={event => setReason(event.target.value as PriceFeedbackReason | '')}
              className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400">
              <option value="">Choose a reason</option>
              {Object.entries(PRICE_FEEDBACK_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <Input id="price-feedback-price" label="What should the price be? (₱)" type="number" inputMode="decimal" min="1" max="1000000" step="0.01" required
            value={price} onChange={event => setPrice(event.target.value)} placeholder="Enter your suggested price" className="min-h-11"
            hint={reason ? `Enter a price ${reason === 'too_low' ? 'higher' : 'lower'} than ${formatPrice(snapshot.reference_price_php)}.` : undefined} />
          <div>
            <label htmlFor="price-feedback-note" className="mb-1 block text-sm font-medium text-gray-300">More details (optional)</label>
            <textarea id="price-feedback-note" rows={3} maxLength={800} value={message} onChange={event => setMessage(event.target.value)}
              placeholder="For example, a current store discount or similar shoes you sold."
              className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400" />
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <Button type="submit" loading={busy} className="min-h-11 w-full">Send price feedback</Button>
        </fieldset>
      </form>}
    </section>
  );
}
