'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { BRANDS, CONDITIONS } from '@/lib/constants';
import {
  estimateRunningShoePrice,
  type PriceGuideAge,
  type PriceGuideCondition,
  type PriceGuideDemand,
  type PriceGuideMileage,
  type PriceGuideUrgency,
} from '@/lib/pricing/runningShoePriceGuide';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const brandOptions = BRANDS.map((brand) => ({ value: brand, label: brand }));

const conditionOptions = [
  { value: 'new', label: CONDITIONS.new },
  { value: 'like_new', label: CONDITIONS.like_new },
  { value: 'good', label: CONDITIONS.good },
  { value: 'fair', label: CONDITIONS.fair },
];

const mileageOptions: { value: PriceGuideMileage; label: string }[] = [
  { value: 'unused', label: 'Unused' },
  { value: 'under_20', label: 'Under 20 km' },
  { value: 'twenty_to_80', label: '20-80 km' },
  { value: 'eighty_to_200', label: '80-200 km' },
  { value: 'over_200', label: 'Over 200 km' },
  { value: 'unknown', label: 'Not sure' },
];

const ageOptions: { value: PriceGuideAge; label: string }[] = [
  { value: 'under_3_months', label: 'Under 3 months' },
  { value: 'three_to_12_months', label: '3-12 months' },
  { value: 'one_to_two_years', label: '1-2 years' },
  { value: 'over_two_years', label: 'Over 2 years' },
];

const demandOptions: { value: PriceGuideDemand; label: string }[] = [
  { value: 'popular', label: 'Popular / easy to sell' },
  { value: 'normal', label: 'Normal demand' },
  { value: 'niche', label: 'Niche / harder to sell' },
];

const urgencyOptions: { value: PriceGuideUrgency; label: string; helper: string }[] = [
  { value: 'balanced', label: 'Balanced', helper: 'Good starting point' },
  { value: 'sell_fast', label: 'Sell fast', helper: 'More attractive price' },
  { value: 'best_price', label: 'Best price', helper: 'Start slightly higher' },
];

export function PriceGuideForm() {
  const [brand, setBrand] = useState('Adidas');
  const [model, setModel] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [condition, setCondition] = useState<PriceGuideCondition>('like_new');
  const [mileage, setMileage] = useState<PriceGuideMileage>('twenty_to_80');
  const [age, setAge] = useState<PriceGuideAge>('three_to_12_months');
  const [demand, setDemand] = useState<PriceGuideDemand>('normal');
  const [urgency, setUrgency] = useState<PriceGuideUrgency>('balanced');
  const [hasBox, setHasBox] = useState(false);
  const [hasReceipt, setHasReceipt] = useState(false);
  const [hasVisibleFlaws, setHasVisibleFlaws] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const retailNumber = Number(retailPrice);
  const canEstimate = Number.isFinite(retailNumber) && retailNumber >= 500;

  const estimate = useMemo(() => {
    if (!canEstimate) return null;
    return estimateRunningShoePrice({
      retailPricePhp: retailNumber,
      condition,
      mileage,
      age,
      demand,
      urgency,
      hasBox,
      hasReceipt,
      hasVisibleFlaws,
    });
  }, [age, canEstimate, condition, demand, hasBox, hasReceipt, hasVisibleFlaws, mileage, retailNumber, urgency]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowResult(true);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Brand"
            options={brandOptions}
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          />
          <Input
            label="Model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="e.g. Pegasus 41"
          />
          <Input
            label="Retail price"
            type="number"
            min={500}
            inputMode="numeric"
            value={retailPrice}
            onChange={(event) => setRetailPrice(event.target.value)}
            placeholder="e.g. 8500"
            required
            hint="Use the original PH retail price if you know it."
          />
          <Select
            label="Condition"
            options={conditionOptions}
            value={condition}
            onChange={(event) => setCondition(event.target.value as PriceGuideCondition)}
          />
          <Select
            label="Usage"
            options={mileageOptions}
            value={mileage}
            onChange={(event) => setMileage(event.target.value as PriceGuideMileage)}
          />
          <Select
            label="Age"
            options={ageOptions}
            value={age}
            onChange={(event) => setAge(event.target.value as PriceGuideAge)}
          />
          <Select
            label="Demand"
            options={demandOptions}
            value={demand}
            onChange={(event) => setDemand(event.target.value as PriceGuideDemand)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">Selling speed</p>
            <div className="grid grid-cols-3 gap-2">
              {urgencyOptions.map((option) => {
                const active = urgency === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUrgency(option.value)}
                    className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                      active
                        ? 'border-teal-400/50 bg-teal-400/10 text-teal-100'
                        : 'border-white/[0.08] bg-slate-950/45 text-gray-400 hover:border-teal-400/30'
                    }`}
                  >
                    <span className="block text-xs font-semibold leading-tight">{option.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-3 text-gray-500">{option.helper}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Toggle checked={hasBox} onChange={setHasBox} label="Has box" />
          <Toggle checked={hasReceipt} onChange={setHasReceipt} label="Has receipt" />
          <Toggle checked={hasVisibleFlaws} onChange={setHasVisibleFlaws} label="Visible flaws" />
        </div>

        <Button type="submit" size="lg" className="mt-5 w-full" disabled={!canEstimate}>
          Check Suggested Price
        </Button>
        {!canEstimate && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Add a retail price of at least PHP 500 to estimate a resale range.
          </p>
        )}
      </form>

      <aside className="rounded-2xl border border-teal-400/20 bg-teal-400/[0.05] p-4 sm:p-5">
        {showResult && estimate ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">
              Suggested resale range
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-100">
              {formatPrice(estimate.suggestedLow)} - {formatPrice(estimate.suggestedHigh)}
            </h2>
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-slate-950/55 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Fast-sale price
              </p>
              <p className="mt-1 text-xl font-bold text-teal-200">{formatPrice(estimate.fastSalePrice)}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-100">Why this range?</p>
              <ul className="mt-2 space-y-2 text-sm leading-5 text-gray-400">
                {estimate.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 grid gap-2">
              <Link
                href={`/listings/new?price=${estimate.suggestedHigh}`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
              >
                List this shoe
              </Link>
              <Link
                href="/official-running-shoe-brand-links-ph"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
              >
                Check official retail links
              </Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">
              This is a guide, not a guaranteed selling price. Final value still depends on photos,
              demand, honesty, and how quickly you want to sell.
            </p>
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col justify-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">
              Price before listing
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-100">
              Get a practical range, use it as a reference.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Built for runners selling brand-new or pre-loved running shoes. Add the
              details you know, then use the range as your starting price.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
      checked
        ? 'border-teal-400/45 bg-teal-400/10 text-teal-100'
        : 'border-white/[0.08] bg-slate-950/45 text-gray-400'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-950"
      />
      <span>{label}</span>
    </label>
  );
}
