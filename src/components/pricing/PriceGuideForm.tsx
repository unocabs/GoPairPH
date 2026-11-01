'use client';
import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
} from 'react';
import { EstimateComparison } from './EstimateComparison';
import { PriceGuideWizard } from './PriceGuideWizard';
import {
  INITIAL_PRICE_GUIDE_INPUT,
  guideBrandChoice,
  normalizeGuideBrand,
  restoreGuideDraft,
} from '@/lib/pricing/priceGuideWizard';
import { PriceEstimateFeedback } from './PriceEstimateFeedback';
import { PRICE_GUIDE_PREFILL_KEY } from '@/lib/pricing/priceGuidePrefill';
import { trackMarketplaceAction } from '@/lib/analytics';
import { formatPrice } from '@/lib/utils';
import type { EstimatorInput, EstimatorModel } from '@/lib/pricing/estimator';
import type {
  EstimatorAccess,
  SavedEstimate,
} from '@/lib/pricing/estimatorServer';
import type { EstimatorPayment } from '@/lib/pricing/estimatorPayments';

const button =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50';
interface Overview {
  models: EstimatorModel[];
  access: EstimatorAccess;
  history: SavedEstimate[];
  nextHistoryCursor: string | null;
  trialEstimate: SavedEstimate | null;
  payments: EstimatorPayment[];
  signedIn: boolean;
  checkoutEnabled: boolean;
  monthlyExpiresIfPaidNow: string;
}
export function PriceGuideForm() {
  const [input, setInput] = useState(INITIAL_PRICE_GUIDE_INPUT),
    [overview, setOverview] = useState<Overview | null>(null),
    [estimate, setEstimate] = useState<SavedEstimate | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [choice, setChoice] = useState<'suggested_range' | 'fast_sale'>(
      'suggested_range',
    );
  const [step, setStep] = useState(0),
    [brandChoice, setBrandChoice] = useState('');
  function reopenInput(value: EstimatorInput) {
    setInput({ ...value, brand: normalizeGuideBrand(value.brand) });
    setBrandChoice(guideBrandChoice(value.brand));
    setStep(4);
  }
  const [terms, setTerms] = useState(false),
    [checking, setChecking] = useState(false),
    [notice, setNotice] = useState('');
  const attempt = useRef<{ body: string; id: string } | null>(null),
    resultRef = useRef<HTMLElement>(null);
  const load = useCallback(async () => {
    const response = await fetch('/api/price-estimator', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    setOverview(data);
    return data as Overview;
  }, []);
  useEffect(() => {
    try {
      const draft = JSON.parse(
        sessionStorage.getItem('estimator-draft-v2') ?? 'null',
      );
      const restored = restoreGuideDraft(draft);
      if (restored) {
        setInput(restored.input);
        setStep(restored.step);
        setBrandChoice(restored.brandChoice);
      }
    } catch {}
    setReady(true);
    load().catch((cause) => setError(cause.message));
  }, [load]);
  const persistDraft = useCallback(() => {
    try {
      sessionStorage.setItem(
        'estimator-draft-v2',
        JSON.stringify({ ...input, _step: step, _brandChoice: brandChoice }),
      );
    } catch {}
  }, [input, step, brandChoice]);
  useEffect(() => {
    if (ready) persistDraft();
  }, [ready, persistDraft]);
  const checkPayment = useCallback(
    async (id: string, cancel = false) => {
      setChecking(true);
      setError('');
      try {
        const response = await fetch(`/api/price-estimator/payments/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: cancel ? 'cancel' : 'check' }),
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        await load();
        setNotice(
          data.payment?.status === 'paid'
            ? 'Payment verified. Your estimator access is active.'
            : 'Payment status refreshed. Access starts only after payment is verified.',
        );
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Could not check payment.',
        );
      } finally {
        setChecking(false);
      }
    },
    [load],
  );
  useEffect(() => {
    if (!overview?.signedIn) return;
    const id = new URLSearchParams(location.search).get('payment');
    if (id && /^[a-f0-9-]{36}$/i.test(id)) {
      void checkPayment(id);
    }
  }, [overview?.signedIn, checkPayment]); // One return check; manual refresh avoids background polling.
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const parent = estimate?.id ?? null;
    const normalizedInput = {
      ...input,
      brand: normalizeGuideBrand(input.brand),
      model: input.model.trim(),
    };
    const body = JSON.stringify({ input: normalizedInput, parent_id: parent });
    if (attempt.current?.body !== body)
      attempt.current = { body, id: crypto.randomUUID() };
    try {
      const response = await fetch('/api/price-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: normalizedInput,
          parent_id: parent,
          request_id: attempt.current.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setEstimate(data.estimate);
      trackMarketplaceAction('price_estimate_completed', {
        engine_version: data.estimate.result.version,
        model_id: data.estimate.result.modelId ?? 'unmatched',
        evidence_type: data.estimate.result.evidenceType,
      });
      setChoice('suggested_range');
      await load();
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not estimate this shoe.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function checkout(plan: 'monthly' | 'permanent') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/price-estimator/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, accept_terms: terms }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (data.checkoutUrl) location.assign(data.checkoutUrl);
      else {
        await load();
        setNotice(
          'Your payment is being checked. Use the payment status below before starting another checkout.',
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not start checkout.',
      );
    } finally {
      setBusy(false);
    }
  }
  function listingPrefill() {
    if (!estimate) return;
    try {
      localStorage.setItem(
        PRICE_GUIDE_PREFILL_KEY,
        JSON.stringify({
          ...estimate.input,
          ...estimate.result,
          selectedPricePhp: selected,
          createdAt: Date.now(),
        }),
      );
    } catch {}
    trackMarketplaceAction('price_estimator_to_listing', {
      engine_version: estimate.result.version,
    });
  }
  async function olderHistory() {
    if (!overview?.nextHistoryCursor) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/price-estimator/history?before=${encodeURIComponent(overview.nextHistoryCursor)}`,
        { cache: 'no-store' },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setOverview((current) =>
        current
          ? {
              ...current,
              history: [...current.history, ...result.history],
              nextHistoryCursor: result.nextHistoryCursor,
            }
          : current,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load history.',
      );
    } finally {
      setBusy(false);
    }
  }
  function exportEstimate() {
    if (!estimate) return;
    const blob = new Blob([JSON.stringify(estimate, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `shoe-estimate-${estimate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const result = estimate?.result,
    selected = result
      ? choice === 'fast_sale'
        ? result.fastSalePrice
        : result.suggestedPrice
      : 0;
  const correctionMode =
    estimate &&
    overview?.access.trialEstimateId &&
    (estimate.id === overview.access.trialEstimateId ||
      estimate.parent_id === overview.access.trialEstimateId) &&
    Date.parse(overview.access.correctionUntil ?? '') > Date.now();
  const showForm =
    !overview?.access.premiumEnabled ||
    overview.access.active ||
    overview.access.freeAvailable ||
    correctionMode;
  return (
    <div
      className="mx-auto max-w-4xl space-y-5 text-gray-200"
      data-price-estimator-started={step > 0 ? 'true' : 'false'}
    >
      {overview?.access.premiumEnabled && (
        <p className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
          {overview.access.active
            ? `Unlimited access${overview.access.permanent ? ' · permanent' : ` until ${new Date(overview.access.expiresAt!).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`}.`
            : overview.access.freeAvailable
              ? 'Your first full estimate is free.'
              : 'Your free estimate has been used. Unlock unlimited estimates below.'}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-teal-200">
          {notice}
        </p>
      )}
      {showForm ? (
        <PriceGuideWizard
          input={input}
          setInput={setInput}
          step={step}
          setStep={setStep}
          brandChoice={brandChoice}
          setBrandChoice={setBrandChoice}
          models={overview?.models ?? []}
          signedIn={overview?.signedIn ?? false}
          ready={ready}
          busy={busy}
          updating={!!estimate}
          premiumEnabled={overview?.access.premiumEnabled ?? false}
          onEstimate={submit}
          onSignIn={persistDraft}
        />
      ) : (
        <div className="rounded-xl border border-white/10 p-4 text-sm leading-6">
          <p>
            Unlock unlimited estimates below to price another shoe. You can
            always reopen and export saved results.
          </p>
          <Link
            className="inline-block min-h-11 py-3 text-teal-300"
            href="/listings/new"
          >
            List shoes without an estimate
          </Link>
          {overview?.access.trialEstimateId && (
            <button
              className="ml-3 min-h-11 text-teal-300"
              onClick={() => {
                const trial =
                  overview.trialEstimate ??
                  overview.history.find(
                    (row) => row.id === overview.access.trialEstimateId,
                  );
                if (trial) {
                  setEstimate(trial);
                  reopenInput(trial.input);
                }
              }}
            >
              Reopen free estimate
            </button>
          )}
        </div>
      )}
      {estimate && result && (
        <section
          ref={resultRef}
          tabIndex={-1}
          className="scroll-mt-20 rounded-xl border border-teal-400/30 bg-slate-900/50 p-4 sm:p-6"
        >
          <p className="text-sm text-gray-400">
            {estimate.input.brand} {estimate.input.model} ·{' '}
            {estimate.input.condition.replace('_', ' ')}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-teal-200">
            {formatPrice(result.suggestedLow)}–
            {formatPrice(result.suggestedHigh)}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Suggested asking range · {result.confidence} confidence ·{' '}
            {new Date(estimate.created_at).toLocaleDateString('en-PH')}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Original SRP you entered:{' '}
            {formatPrice(estimate.input.retailPricePhp)}
          </p>
          <div className="my-4 grid gap-3 sm:grid-cols-2">
            {(['suggested_range', 'fast_sale'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={choice === option}
                onClick={() => setChoice(option)}
                className={`min-h-16 rounded-lg border p-3 text-left ${choice === option ? 'border-teal-400 bg-teal-400/10' : 'border-gray-700'}`}
              >
                <span className="block text-xs text-gray-400">
                  {option === 'fast_sale'
                    ? 'Lower asking strategy'
                    : 'Starting asking price'}
                </span>
                <strong>
                  {formatPrice(
                    option === 'fast_sale'
                      ? result.fastSalePrice
                      : result.suggestedPrice,
                  )}
                </strong>
              </button>
            ))}
          </div>
          {result.assessment && (
            <p className="mb-4 text-sm leading-6">
              <strong>{result.assessment.label}.</strong>{' '}
              {result.assessment.explanation.replace(
                `${result.assessment.label}. `,
                '',
              )}
            </p>
          )}
          {result.reference ? (
            <div className="rounded-lg border border-white/10 p-3 text-sm leading-6">
              <p>
                Retail context:{' '}
                <strong>{formatPrice(result.reference.price_php)}</strong> ·
                regular {formatPrice(result.reference.regular_price_php)}
              </p>
              <a
                className="break-words text-teal-300 underline"
                href={result.reference.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {result.reference.source_name} · {result.reference.variant}
              </a>
              <p className="text-xs text-gray-400">
                Observed{' '}
                {new Date(result.reference.observed_at).toLocaleDateString(
                  'en-PH',
                )}{' '}
                · stock: {result.reference.availability.replaceAll('_', ' ')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-200">
              Uses your entered SRP; no fresh matched retail offer.
            </p>
          )}
          <details className="mt-4 text-sm leading-6">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              Why this range?
            </summary>
            <ul className="list-disc space-y-2 pl-5 text-gray-400">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </details>
          <ul className="mt-3 space-y-1 text-xs leading-5 text-gray-400">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className={button}
              onClick={listingPrefill}
              href={`/listings/new?from=price-guide&price=${selected}`}
            >
              List at {formatPrice(selected)}
            </Link>
            <button
              type="button"
              className="min-h-11 px-2 text-sm text-teal-300"
              onClick={exportEstimate}
            >
              Export estimate
            </button>
          </div>
          <PriceEstimateFeedback
            key={`${estimate.id}:${choice}`}
            snapshot={{
              estimate_id: estimate.id,
              engine_version: result.version,
              input: estimate.input,
              estimate: result,
              price_choice: choice,
              reference_price_php: selected,
              evidence_type: result.evidenceType,
            }}
          />
        </section>
      )}
      {!!overview?.history.length && (
        <details className="rounded-xl border border-white/10 p-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Saved estimates ({overview.history.length} loaded)
          </summary>
          <div className="divide-y divide-gray-800">
            {overview.history.map((row) => (
              <button
                key={row.id}
                type="button"
                className="flex min-h-16 w-full flex-col gap-1 py-3 text-left text-sm sm:flex-row sm:justify-between"
                onClick={() => {
                  setEstimate(row);
                  reopenInput(row.input);
                  setChoice('suggested_range');
                }}
              >
                <span>
                  {row.input.brand} {row.input.model}
                  <small className="ml-2 text-gray-500">
                    {new Date(row.created_at).toLocaleDateString('en-PH')}
                  </small>
                </span>
                <span className="text-teal-200">
                  {formatPrice(row.result.suggestedLow)}–
                  {formatPrice(row.result.suggestedHigh)}
                </span>
              </button>
            ))}
          </div>
          {overview.nextHistoryCursor && (
            <button
              className="min-h-11 text-sm text-teal-300 disabled:opacity-50"
              disabled={busy}
              onClick={olderHistory}
            >
              Load older estimates
            </button>
          )}
        </details>
      )}
      {overview && <EstimateComparison history={overview.history} />}
      {overview?.access.premiumEnabled && (
        <section className="rounded-xl border border-white/10 p-4 sm:p-6">
          <h2 className="text-lg font-bold">Unlimited estimates</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            ₱50 for one calendar month with manual renewal, or ₱600 once for
            permanent access on this account for the operating life of this
            estimator service. No automatic charges or upgrade credit for
            earlier monthly payments. Reference coverage varies; prices remain
            guidance.
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Catalogue:{' '}
            {overview.models
              .map((model) => `${model.brand} ${model.name}`)
              .join(', ')}
            . Other models use your entered SRP.{' '}
            <Link href="/terms#estimator" className="text-teal-300 underline">
              Access and refund information
            </Link>
            .
          </p>
          <p className="mt-2 text-xs text-gray-400">
            If verified now, monthly access ends{' '}
            {new Date(overview.monthlyExpiresIfPaidNow).toLocaleString(
              'en-PH',
              { timeZone: 'Asia/Manila' },
            )}{' '}
            (Manila time). Actual expiry is set when payment is verified.
          </p>
          <label className="my-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-teal-400"
            />
            <span>
              I understand the access period, manual renewal, and the
              estimator’s limitations.
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={
                !terms ||
                busy ||
                !overview.checkoutEnabled ||
                overview.access.permanent
              }
              onClick={() => checkout('monthly')}
            >
              ₱50 · one month
            </button>
            <button
              className={button}
              disabled={
                !terms ||
                busy ||
                !overview.checkoutEnabled ||
                overview.access.permanent
              }
              onClick={() => checkout('permanent')}
            >
              ₱600 · permanent
            </button>
          </div>
          {!overview.checkoutEnabled && (
            <p className="mt-3 text-sm text-amber-200">
              Checkout is not available yet.
            </p>
          )}
        </section>
      )}
      {!!overview?.payments.length && (
        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="font-bold">Payment status</h2>
          {overview.payments.map((payment) => (
            <div
              key={payment.id}
              className="mt-3 border-t border-gray-800 pt-3 text-sm"
            >
              <p>
                {payment.plan === 'monthly'
                  ? 'One month · ₱50'
                  : 'Permanent · ₱600'}{' '}
                · {payment.status}
              </p>
              {payment.status === 'review' && (
                <p className="mt-1 text-xs text-amber-200">
                  Admin review needed. Avoid paying again until this is
                  resolved.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {payment.checkout_url && payment.status === 'pending' && (
                  <a
                    className="min-h-11 py-3 text-teal-300"
                    href={payment.checkout_url}
                  >
                    Resume checkout
                  </a>
                )}
                <button
                  className="min-h-11 py-3 text-teal-300 disabled:opacity-50"
                  disabled={checking}
                  onClick={() => checkPayment(payment.id)}
                >
                  Refresh status
                </button>
                {payment.status === 'pending' && (
                  <button
                    className="min-h-11 py-3 text-gray-400"
                    disabled={checking}
                    onClick={() => checkPayment(payment.id, true)}
                  >
                    Close unpaid checkout
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
