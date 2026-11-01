'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  EstimatorModel,
  RetailReference,
  SaleObservation,
} from '@/lib/pricing/estimator';
interface Source {
  id: string;
  source_name: string;
  model_id: string;
  variant: string;
  url: string;
  fetch_enabled: boolean;
  next_due_at: string;
  last_success_at: string | null;
  last_error: string | null;
}
interface Data {
  settings: {
    premium_enabled: boolean;
    quality_approved: boolean;
    independent_outcomes: number;
    benchmark_report: string | null;
    livemode: boolean;
  }[];
  models: EstimatorModel[];
  sources: Source[];
  references: RetailReference[];
  outcomes: (SaleObservation & { approved: boolean; evidence_note: string })[];
  payments: {
    id: string;
    plan: string;
    status: string;
    review_note: string | null;
    created_at: string;
  }[];
}
const field =
  'min-h-11 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm text-gray-100';
const button =
  'min-h-11 rounded-lg bg-teal-400 px-3 text-sm font-semibold text-slate-950 disabled:opacity-50';
export function AdminEstimatorPanel() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch('/api/admin/price-estimator', { cache: 'no-store' });
    const value = await r.json();
    if (!r.ok) throw Error(value.error);
    setData(value);
  }
  useEffect(() => {
    load().catch((cause) => setError(cause.message));
  }, []);
  async function save(body: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/admin/price-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      await load();
      setNotice('Saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  function reference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    void save({
      action: 'reference',
      source_id: f.get('source_id'),
      price_php: Number(f.get('price')),
      regular_price_php: Number(f.get('srp')),
      observed_at: new Date(String(f.get('date'))).toISOString(),
      availability: f.get('availability'),
    });
  }
  function outcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    void save({
      action: 'outcome',
      model_id: f.get('model_id'),
      condition: f.get('condition'),
      price_php: Number(f.get('price')),
      sold_at: new Date(String(f.get('date'))).toISOString(),
      seller_group: f.get('group'),
      provenance: f.get('provenance'),
      evidence_note: f.get('note'),
      approved: f.get('approved') === 'on',
    });
  }
  return (
    <div className="space-y-6 text-gray-200">
      <h2 className="text-xl font-bold">Estimator evidence & access</h2>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-teal-200">
          {notice}
        </p>
      )}
      {data && (
        <>
          <div className="rounded-xl border border-gray-700 p-4 text-sm leading-6">
            <p>
              Paid access:{' '}
              <strong>
                {data.settings[0]?.premium_enabled
                  ? 'enabled'
                  : 'disabled · free beta'}
              </strong>{' '}
              · mode: {data.settings[0]?.livemode ? 'live' : 'test'}
            </p>
            <p>
              Independent validation outcomes:{' '}
              {data.settings[0]?.independent_outcomes} / 50 minimum. Quality
              approval:{' '}
              {data.settings[0]?.quality_approved ? 'recorded' : 'pending'}.
            </p>
            <p className="text-gray-400">
              Do not count feedback, asking prices, synthetic tests, or
              unconfirmed offers as completed sales. Launch also requires a
              held-out accuracy report and payment checks. Activation is a
              separate manual SQL step documented in the rollout guide.
            </p>
          </div>
          <section className="rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold">Monthly retail sources</h3>
            <p className="my-2 text-sm leading-6 text-gray-400">
              Automatic collection starts only after you record permission for
              the source. Imports are staged for review. Manual entry remains
              available when structured prices cannot be read reliably.
            </p>
            {data.sources.map((source) => (
              <div
                key={source.id}
                className="border-t border-gray-800 py-3 text-sm"
              >
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-300"
                >
                  {source.source_name} · {source.variant}
                </a>
                <p className="mt-1 text-gray-400">
                  {source.fetch_enabled ? 'Collection enabled' : 'Manual only'}{' '}
                  · due{' '}
                  {new Date(source.next_due_at).toLocaleDateString('en-PH')}
                  {source.last_success_at
                    ? ` · last imported ${new Date(source.last_success_at).toLocaleDateString('en-PH')}`
                    : ' · no successful automated import'}
                  {source.last_error ? ` · ${source.last_error}` : ''}
                </p>
                <form
                  className="mt-2 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const f = new FormData(event.currentTarget);
                    void save({
                      action: 'source',
                      id: source.id,
                      enabled: !source.fetch_enabled,
                      permission_note: f.get('note'),
                    });
                  }}
                >
                  <input
                    className={field}
                    name="note"
                    required
                    minLength={11}
                    maxLength={1000}
                    placeholder={
                      source.fetch_enabled
                        ? 'Reason for disabling collection'
                        : 'Permission evidence / permitted collection terms'
                    }
                  />
                  <button disabled={busy} className={`${button} shrink-0`}>
                    {source.fetch_enabled
                      ? 'Disable collection'
                      : 'Confirm permission & enable'}
                  </button>
                </form>
              </div>
            ))}
          </section>
          <details className="rounded-xl border border-gray-700 p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Add a reviewed retail price
            </summary>
            <form
              onSubmit={reference}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <label className="text-sm">
                Exact retail source
                <select className={field} name="source_id">
                  {data.sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.source_name} · {source.variant}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Observed at (local time)
                <input
                  className={field}
                  name="date"
                  type="datetime-local"
                  required
                />
              </label>
              <label className="text-sm">
                Current price (₱)
                <input
                  className={field}
                  name="price"
                  type="number"
                  step=".01"
                  min="1"
                  required
                />
              </label>
              <label className="text-sm">
                Regular retail price (₱)
                <input
                  className={field}
                  name="srp"
                  type="number"
                  step=".01"
                  min="1"
                  required
                />
              </label>
              <label className="text-sm">
                Availability
                <select name="availability" className={field}>
                  <option value="unknown">
                    Unknown size / colour availability
                  </option>
                  <option value="available">Available · checked</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </label>
              <button disabled={busy} className={button}>
                Save & publish reference
              </button>
            </form>
          </details>
          <details className="rounded-xl border border-gray-700 p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Retail reference review (latest 60)
            </summary>
            {data.references.map((row) => (
              <div
                key={row.id}
                className="border-t border-gray-800 py-3 text-sm"
              >
                <p>
                  {row.model_id} · ₱{row.price_php} · {row.availability} ·{' '}
                  {new Date(row.observed_at).toLocaleDateString('en-PH')}
                </p>
                <a
                  className="break-words text-teal-300"
                  href={row.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {row.source_name} · {row.variant}
                </a>
                <button
                  className="ml-3 min-h-11 text-teal-300"
                  disabled={busy}
                  onClick={() =>
                    save({
                      action: 'publish',
                      id: row.id,
                      published: !row.published,
                    })
                  }
                >
                  {row.published ? 'Unpublish' : 'Approve & publish'}
                </button>
              </div>
            ))}
          </details>
          <details className="rounded-xl border border-gray-700 p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Record an actual resale outcome
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Use a stable pseudonymous seller group to avoid counting repeated
              sellers as independent evidence. Keep contact details out of
              evidence notes. An offered amount is not a final sale price.
            </p>
            <form onSubmit={outcome} className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Model
                <select className={field} name="model_id">
                  {data.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.brand} {model.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Condition
                <select className={field} name="condition">
                  {['new', 'like_new', 'good', 'fair'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Final sale price (₱)
                <input
                  className={field}
                  name="price"
                  type="number"
                  step=".01"
                  min="1"
                  required
                />
              </label>
              <label className="text-sm">
                Sold at (local time)
                <input
                  className={field}
                  name="date"
                  type="datetime-local"
                  required
                />
              </label>
              <label className="text-sm">
                Pseudonymous seller group
                <input
                  className={field}
                  name="group"
                  minLength={3}
                  maxLength={100}
                  required
                />
              </label>
              <label className="text-sm">
                Evidence type
                <select className={field} name="provenance">
                  <option value="seller_reported">
                    Seller reported · excluded from confirmed comparables
                  </option>
                  <option value="buyer_seller_confirmed">
                    Buyer and seller confirmed
                  </option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                Evidence notes
                <textarea
                  className={field}
                  name="note"
                  minLength={10}
                  maxLength={1000}
                  required
                />
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="approved" />
                Reviewed evidence and model/condition match
              </label>
              <button disabled={busy} className={button}>
                Save resale evidence
              </button>
            </form>
            <p className="mt-3 text-sm text-gray-500">
              {data.outcomes.length} most recent observations loaded; these are
              training references, not a held-out validation report.
            </p>
            {data.outcomes.map((row) => (
              <div
                key={row.id}
                className="mt-3 border-t border-gray-800 pt-3 text-sm"
              >
                <p>
                  {row.model_id} · {row.condition} · ₱{row.price_php} ·{' '}
                  {new Date(row.sold_at).toLocaleDateString('en-PH')}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {row.provenance.replaceAll('_', ' ')} · seller group:{' '}
                  {row.seller_group}
                </p>
                <p className="mt-1 break-words text-gray-400">
                  {row.evidence_note}
                </p>
                <button
                  disabled={busy}
                  className="min-h-11 text-teal-300"
                  onClick={() =>
                    save({
                      action: 'outcome_review',
                      id: row.id,
                      approved: !row.approved,
                    })
                  }
                >
                  {row.approved
                    ? 'Exclude from pricing evidence'
                    : 'Approve for pricing evidence'}
                </button>
              </div>
            ))}
          </details>
          <details className="rounded-xl border border-gray-700 p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Payments (latest 30)
            </summary>
            {data.payments.map((payment) => (
              <div
                key={payment.id}
                className="border-t border-gray-800 py-3 text-sm"
              >
                <p>
                  {payment.plan} · {payment.status} · {payment.id}
                </p>
                <p className="text-gray-400">{payment.review_note}</p>
                {['creating', 'review'].includes(payment.status) && (
                  <form
                    className="mt-2 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void save({
                        action: 'recover_payment',
                        id: payment.id,
                        checkout_id: new FormData(event.currentTarget).get(
                          'checkout',
                        ),
                      });
                    }}
                  >
                    <input
                      name="checkout"
                      className={field}
                      required
                      pattern="cs_[A-Za-z0-9]+"
                      placeholder="PayMongo checkout ID found by this payment reference"
                    />
                    <button disabled={busy} className={`${button} shrink-0`}>
                      Verify with provider
                    </button>
                  </form>
                )}
              </div>
            ))}
          </details>
        </>
      )}
    </div>
  );
}
