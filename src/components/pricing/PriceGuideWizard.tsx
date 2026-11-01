'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Select } from '@/components/ui/Select';
import { BRANDS } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import type { EstimatorInput, EstimatorModel } from '@/lib/pricing/estimator';
import {
  PRICE_GUIDE_STEPS,
  guideMileageBucket,
  guideStepError,
  normalizeGuideBrand,
} from '@/lib/pricing/priceGuideWizard';
const field =
  'min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-base text-gray-100 placeholder:text-slate-600 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/15';
const action =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_6px_24px_rgba(45,212,191,0.12)] transition-colors hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-50';
const conditions = [
  ['new', 'New', 'Unused, with no running mileage.'],
  ['like_new', 'Like new', 'Very light wear, with minimal signs of use.'],
  ['good', 'Good', 'Normal wear, with useful life remaining.'],
  ['fair', 'Fair', 'Visible wear that buyers should see clearly.'],
] as const;
const ages = [
  { value: 'unknown', label: 'Not sure' },
  { value: 'under_3_months', label: 'Under 3 months' },
  { value: 'three_to_12_months', label: '3–12 months' },
  { value: 'one_to_two_years', label: '1–2 years' },
  { value: 'over_two_years', label: 'Over 2 years' },
];
interface Props {
  input: EstimatorInput;
  setInput: (input: EstimatorInput) => void;
  step: number;
  setStep: (step: number) => void;
  brandChoice: string;
  setBrandChoice: (value: string) => void;
  models: EstimatorModel[];
  signedIn: boolean;
  ready: boolean;
  busy: boolean;
  updating: boolean;
  premiumEnabled: boolean;
  onEstimate: (event: FormEvent) => void;
  onSignIn: () => void;
}
export function PriceGuideWizard({
  input,
  setInput,
  step,
  setStep,
  brandChoice,
  setBrandChoice,
  models,
  signedIn,
  ready,
  busy,
  updating,
  premiumEnabled,
  onEstimate,
  onSignIn,
}: Props) {
  const [error, setError] = useState(''),
    heading = useRef<HTMLHeadingElement>(null),
    firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [step]);
  function change<K extends keyof EstimatorInput>(
    key: K,
    value: EstimatorInput[K],
  ) {
    setInput({ ...input, [key]: value });
  }
  function checkAll() {
    for (let index = 0; index < 5; index++) {
      const message = guideStepError(input, index);
      if (message) {
        setStep(index);
        setError(message);
        return false;
      }
    }
    return true;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const message = guideStepError(input, step);
    if (message) {
      setError(message);
      return;
    }
    if (step < 4) {
      setError('');
      setStep(step + 1);
      return;
    }
    if (checkAll()) {
      if (!signedIn) {
        onSignIn();
        window.location.assign('/auth/sign-in?next=%2Fprice-guide');
        return;
      }
      onEstimate(event);
    }
  }
  const modelOptions = models.filter(
    (model) =>
      normalizeGuideBrand(model.brand) === normalizeGuideBrand(input.brand),
  );
  return (
    <form
      id="shoe-price-calculator"
      onSubmit={submit}
      aria-label="Running shoe price calculator"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-teal-400/20 bg-[#0B1424] shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
    >
      <div className="border-b border-white/[0.07] px-4 pb-4 pt-5 sm:px-7 sm:pt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300 sm:text-xs">
            Your shoe price guide
          </p>
          <p className="shrink-0 text-xs tabular-nums text-slate-400">
            Step {step + 1} of 5
          </p>
        </div>
        <ol
          aria-label="Estimate progress"
          className="mt-4 grid grid-cols-5 gap-2"
        >
          {PRICE_GUIDE_STEPS.map((label, index) => (
            <li key={label} aria-current={step === index ? 'step' : undefined}>
              <div
                aria-hidden="true"
                className={`h-1 rounded-full ${index <= step ? 'bg-teal-400' : 'bg-slate-800'}`}
              />
              <span
                className={`mt-2 hidden text-[11px] sm:block ${index === step ? 'font-semibold text-teal-200' : 'text-slate-500'}`}
              >
                {label}
              </span>
              <span className="sr-only sm:hidden">
                {label}
                {index < step ? ' complete' : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <fieldset
        disabled={busy}
        className="min-w-0 px-4 pb-5 pt-5 sm:px-7 sm:pb-6"
      >
        <legend className="sr-only">{PRICE_GUIDE_STEPS[step]}</legend>
        <h2
          ref={heading}
          tabIndex={-1}
          className="text-xl font-bold tracking-tight text-gray-100 focus:outline-none sm:text-2xl"
        >
          {
            [
              'Start with your shoe details.',
              'How are your shoes looking?',
              'Tell us about their use.',
              'What comes with your shoes?',
              'Ready to check your price?',
            ][step]
          }
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          {
            [
              'Choose the brand, exact model, and original Philippine retail price.',
              'Pick the description that best matches their current condition.',
              'An honest mileage estimate helps. It’s fine to choose unknown.',
              'These details help explain your listing. A receipt does not certify authenticity.',
              'Review your details, then get your range. Add an asking price if you’d like us to check it.',
            ][step]
          }
        </p>
        {step === 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Select
              id="estimator-brand"
              label="Brand"
              required
              className={field}
              placeholder="Choose brand"
              options={BRANDS.map((brand) => ({ value: brand, label: brand }))}
              value={brandChoice}
              onChange={(event) => {
                const brand = event.target.value;
                setBrandChoice(brand);
                setInput({
                  ...input,
                  brand: brand === 'Other' ? '' : brand,
                  model: '',
                });
              }}
            />
            {brandChoice === 'Other' && (
              <label className="space-y-1 text-sm font-medium text-gray-300 sm:col-span-2">
                Brand name <span className="text-teal-400">*</span>
                <input
                  autoComplete="off"
                  className={field}
                  required
                  maxLength={80}
                  value={input.brand}
                  placeholder="Enter the shoe brand"
                  onChange={(event) => change('brand', event.target.value)}
                />
              </label>
            )}
            <label className="space-y-1 text-sm font-medium text-gray-300">
              Exact model <span className="text-teal-400">*</span>
              <input
                className={field}
                required
                list="estimator-models"
                maxLength={160}
                value={input.model}
                placeholder="e.g. Pegasus 41"
                onChange={(event) => change('model', event.target.value)}
              />
              <datalist id="estimator-models">
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.name} />
                ))}
              </datalist>
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-300">
              Original SRP (₱) <span className="text-teal-400">*</span>
              <input
                className={field}
                required
                type="number"
                inputMode="decimal"
                min={500}
                max={1000000}
                step="0.01"
                value={input.retailPricePhp || ''}
                placeholder="e.g. 8500"
                onChange={(event) =>
                  change('retailPricePhp', Number(event.target.value))
                }
              />
            </label>
          </div>
        )}
        {step === 1 && (
          <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Choose shoe condition</legend>
            {conditions.map(([value, label, description]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${input.condition === value ? 'border-teal-400/60 bg-teal-400/[0.07]' : 'border-slate-700/80 bg-slate-950/30 hover:border-slate-500'}`}
              >
                <input
                  type="radio"
                  name="shoe-condition"
                  value={value}
                  checked={input.condition === value}
                  onChange={() =>
                    setInput({
                      ...input,
                      condition: value,
                      ...(value === 'new'
                        ? { mileage: 'unused', mileageKm: 0 }
                        : {}),
                    })
                  }
                  className="mt-0.5 h-5 w-5 shrink-0 accent-teal-400"
                />
                <span>
                  <strong className="block text-sm text-gray-100">
                    {label}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {step === 2 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-300">
              Running mileage (km, if known)
              <input
                className={field}
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={10000}
                value={input.mileageKm ?? ''}
                placeholder="Leave blank if unknown"
                onChange={(event) => {
                  const km =
                    event.target.value === ''
                      ? null
                      : Number(event.target.value);
                  setInput({
                    ...input,
                    mileageKm: km,
                    mileage: guideMileageBucket(km),
                  });
                }}
              />
            </label>
            <Select
              id="estimator-age"
              label="Age since purchase"
              options={ages}
              className={field}
              value={input.age}
              onChange={(event) =>
                change('age', event.target.value as EstimatorInput['age'])
              }
            />
          </div>
        )}
        {step === 3 && (
          <div className="mt-5 grid gap-3">
            {(
              [
                ['hasBox', 'Box included', 'The original box is available.'],
                [
                  'hasReceipt',
                  'Receipt available',
                  'Proof of purchase is available.',
                ],
                [
                  'hasVisibleFlaws',
                  'Visible flaws',
                  'Scuffs, stains, or other flaws should affect the price.',
                ],
              ] as const
            ).map(([key, label, hint]) => (
              <label
                key={key}
                className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border p-4 ${input[key] ? 'border-teal-400/40 bg-teal-400/[0.05]' : 'border-slate-700/80 bg-slate-950/30'}`}
              >
                <input
                  type="checkbox"
                  checked={input[key]}
                  onChange={(event) => change(key, event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-teal-400"
                />
                <span>
                  <strong className="block text-sm text-gray-100">
                    {label}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    {hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="mt-5 space-y-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4 text-sm sm:grid-cols-3">
              {[
                { label: 'Your shoes', value: `${input.brand} ${input.model}` },
                {
                  label: 'Original SRP',
                  value: formatPrice(input.retailPricePhp),
                },
                {
                  label: 'Condition',
                  value: conditions.find(
                    (row) => row[0] === input.condition,
                  )?.[1],
                },
                {
                  label: 'Running mileage',
                  value:
                    input.mileageKm != null
                      ? `${input.mileageKm} km`
                      : 'Not sure',
                },
                {
                  label: 'Age since purchase',
                  value: ages.find((row) => row.value === input.age)?.label,
                },
                {
                  label: 'Included / reported',
                  value: [
                    input.hasBox ? 'Box' : null,
                    input.hasReceipt ? 'Receipt' : null,
                    input.hasVisibleFlaws
                      ? 'Visible flaws'
                      : 'No visible flaws reported',
                  ]
                    .filter(Boolean)
                    .join(' · '),
                },
              ].map((row) => (
                <div key={row.label} className="min-w-0">
                  <dt className="text-xs text-slate-500">{row.label}</dt>
                  <dd className="mt-1 break-words font-medium text-gray-200">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <label className="block space-y-1 text-sm font-medium text-gray-300">
              Your planned asking price (₱, optional)
              <input
                className={field}
                type="number"
                inputMode="decimal"
                step="0.01"
                min={1}
                max={1000000}
                value={input.askingPricePhp ?? ''}
                placeholder="Check whether your price fits the guidance"
                onChange={(event) =>
                  change(
                    'askingPricePhp',
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                  )
                }
              />
            </label>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="min-h-12 rounded-xl px-4 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              ← Back
            </button>
          ) : (
            <p className="py-2 text-xs leading-5 text-slate-500">
              Five short steps. Unknown usage is okay.
            </p>
          )}
          {step < 4 ? (
            <button type="submit" className={action}>
              Continue <span aria-hidden="true">→</span>
            </button>
          ) : signedIn ? (
            <button type="submit" disabled={busy || !ready} className={action}>
              {busy
                ? 'Checking your estimate…'
                : updating
                  ? 'Update my estimate'
                  : 'Get my estimate'}{' '}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <Link
              href="/auth/sign-in?next=%2Fprice-guide"
              onClick={(event) => {
                if (!checkAll()) event.preventDefault();
                else onSignIn();
              }}
              className={action}
            >
              Sign in to get my estimate <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        {step === 4 && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Your details stay on this device during sign-in.{' '}
            {premiumEnabled
              ? 'A free estimate allows same-model corrections for 24 hours.'
              : 'Signed-in estimates are saved to your account.'}
          </p>
        )}
      </fieldset>
    </form>
  );
}
