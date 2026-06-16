'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { PRICE_GUIDE_PREFILL_KEY, type PriceGuideListingPrefill } from '@/lib/pricing/priceGuidePrefill';
import { formatPrice } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { trackMarketplaceAction } from '@/lib/analytics';

const brandOptions = BRANDS.map((brand) => ({ value: brand, label: brand }));

const conditionOptions: { value: PriceGuideCondition; label: string; helper: string; boost: string }[] = [
  { value: 'new', label: CONDITIONS.new, helper: 'Unused pair', boost: 'High trust' },
  { value: 'like_new', label: CONDITIONS.like_new, helper: 'Very light wear', boost: 'Strong value' },
  { value: 'good', label: CONDITIONS.good, helper: 'Normal runner use', boost: 'Fair market' },
  { value: 'fair', label: CONDITIONS.fair, helper: 'Visible wear', boost: 'Price clearly' },
];

const mileageOptions: { value: PriceGuideMileage; label: string; helper: string }[] = [
  { value: 'unused', label: 'Unused', helper: 'No mileage' },
  { value: 'under_20', label: 'Under 20 km', helper: 'Almost new' },
  { value: 'twenty_to_80', label: '20-80 km', helper: 'Light use' },
  { value: 'eighty_to_200', label: '80-200 km', helper: 'Trained in' },
  { value: 'over_200', label: 'Over 200 km', helper: 'Price lower' },
  { value: 'unknown', label: 'Not sure', helper: 'Be honest' },
];

const ageOptions: { value: PriceGuideAge; label: string; helper: string }[] = [
  { value: 'under_3_months', label: 'Under 3 months', helper: 'Fresh release' },
  { value: 'three_to_12_months', label: '3-12 months', helper: 'Still current' },
  { value: 'one_to_two_years', label: '1-2 years', helper: 'Older model' },
  { value: 'over_two_years', label: 'Over 2 years', helper: 'Price sharper' },
];

const demandOptions: { value: PriceGuideDemand; label: string; helper: string }[] = [
  { value: 'popular', label: 'Popular', helper: 'Easy to scan and search' },
  { value: 'normal', label: 'Normal', helper: 'Expected buyer interest' },
  { value: 'niche', label: 'Niche', helper: 'May need the right buyer' },
];

const urgencyOptions: { value: PriceGuideUrgency; label: string; helper: string }[] = [
  { value: 'sell_fast', label: 'Sell Fast', helper: 'More attractive price' },
  { value: 'balanced', label: 'Balanced', helper: 'Good starting point' },
  { value: 'best_price', label: 'Best Price', helper: 'Start slightly higher' },
];

const conditionScore: Record<PriceGuideCondition, number> = {
  new: 24,
  like_new: 20,
  good: 13,
  fair: 5,
};

const mileageScore: Record<PriceGuideMileage, number> = {
  unused: 18,
  under_20: 17,
  twenty_to_80: 13,
  eighty_to_200: 7,
  over_200: 1,
  unknown: 5,
};

const ageScore: Record<PriceGuideAge, number> = {
  under_3_months: 12,
  three_to_12_months: 10,
  one_to_two_years: 5,
  over_two_years: 1,
};

const demandScore: Record<PriceGuideDemand, number> = {
  popular: 16,
  normal: 11,
  niche: 5,
};

const urgencyScore: Record<PriceGuideUrgency, number> = {
  sell_fast: 9,
  balanced: 6,
  best_price: 3,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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
  const mobileSummaryRef = useRef<HTMLDivElement | null>(null);
  const fullResultRef = useRef<HTMLDivElement | null>(null);
  const [isMobileResultLayout, setIsMobileResultLayout] = useState(false);
  const [mobileSummaryVisible, setMobileSummaryVisible] = useState(true);
  const [fullResultVisible, setFullResultVisible] = useState(false);

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

  const selectedMileageLabel = mileageOptions.find((option) => option.value === mileage)?.label ?? 'Not sure';
  const selectedAgeLabel = ageOptions.find((option) => option.value === age)?.label ?? 'Not sure';
  const selectedDemandLabel = demandOptions.find((option) => option.value === demand)?.label ?? 'Normal';
  const selectedUrgencyLabel = urgencyOptions.find((option) => option.value === urgency)?.label ?? 'Balanced';
  const selectedConditionLabel = conditionOptions.find((option) => option.value === condition)?.label ?? CONDITIONS[condition];

  const sellabilityScore = useMemo(() => {
    if (!canEstimate) return 0;
    return clamp(
      16
      + conditionScore[condition]
      + mileageScore[mileage]
      + ageScore[age]
      + demandScore[demand]
      + urgencyScore[urgency]
      + (hasBox ? 4 : 0)
      + (hasReceipt ? 5 : 0)
      - (hasVisibleFlaws ? 12 : 0),
      12,
      96,
    );
  }, [age, canEstimate, condition, demand, hasBox, hasReceipt, hasVisibleFlaws, mileage, urgency]);

  const scoreLabel = sellabilityScore >= 82
    ? 'Strong chance to sell'
    : sellabilityScore >= 68
      ? 'Good seller setup'
      : sellabilityScore >= 50
        ? 'Needs clearer positioning'
        : 'Price and trust need work';

  const bestMove = estimate
    ? urgency === 'sell_fast'
      ? `List near ${formatPrice(estimate.fastSalePrice)} and lead with clear top + sole photos.`
      : urgency === 'best_price'
        ? `Start near ${formatPrice(estimate.suggestedHigh)} and expect a slower buyer decision.`
        : `List around ${formatPrice(estimate.suggestedHigh)} and stay open to serious offers.`
    : 'Add the original retail price to unlock the live range.';

  const tips = [
    hasVisibleFlaws
      ? 'Mention visible flaws directly so buyers trust the price.'
      : 'Add close-up photos if there are any marks or wear points.',
    hasReceipt
      ? 'Receipt or proof can help buyers feel safer.'
      : 'Add proof of purchase if you have it.',
    hasBox
      ? 'Box included makes the listing feel more complete.'
      : 'No box is fine; make the photos and description clear.',
  ];
  const showFloatingDock = isMobileResultLayout && !mobileSummaryVisible && !fullResultVisible;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateLayout = () => setIsMobileResultLayout(media.matches);

    updateLayout();
    media.addEventListener('change', updateLayout);

    return () => media.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (!isMobileResultLayout) {
      setMobileSummaryVisible(true);
      setFullResultVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === mobileSummaryRef.current) {
            setMobileSummaryVisible(entry.isIntersecting);
          }
          if (entry.target === fullResultRef.current) {
            setFullResultVisible(entry.isIntersecting);
          }
        }
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: '-76px 0px -20% 0px',
      },
    );

    const summaryNode = mobileSummaryRef.current;
    const resultNode = fullResultRef.current;
    if (summaryNode) observer.observe(summaryNode);
    if (resultNode) observer.observe(resultNode);

    return () => observer.disconnect();
  }, [isMobileResultLayout]);

  function saveListingPrefill() {
    if (!estimate || !canEstimate) return;

    const prefill: PriceGuideListingPrefill = {
      brand,
      model,
      retailPricePhp: retailNumber,
      condition,
      mileage,
      age,
      demand,
      urgency,
      hasBox,
      hasReceipt,
      hasVisibleFlaws,
      suggestedLow: estimate.suggestedLow,
      suggestedHigh: estimate.suggestedHigh,
      fastSalePrice: estimate.fastSalePrice,
      createdAt: Date.now(),
    };

    try {
      window.localStorage.setItem(PRICE_GUIDE_PREFILL_KEY, JSON.stringify(prefill));
    } catch {
      // If storage is unavailable, the listing page still receives the price in the URL.
    }
    trackMarketplaceAction('price_estimator_to_listing', {
      brand,
      condition,
      urgency,
      has_box: hasBox,
      has_receipt: hasReceipt,
      has_visible_flaws: hasVisibleFlaws,
      sellability_score: sellabilityScore,
    });
  }

  return (
    <div className="grid max-w-full gap-5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:overflow-visible">
      {showFloatingDock && (
        <div className="fixed left-3 right-3 top-[4.75rem] z-30 lg:hidden">
          <CompactScoreDock
            score={sellabilityScore}
            estimate={estimate}
            active={canEstimate}
            floating
          />
        </div>
      )}

      <section className="min-w-0 space-y-4">
        <div className="sellability-card-in rounded-2xl border border-teal-400/20 bg-slate-950/70 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Listing lab</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-gray-100 sm:text-xl">Start with the price. The rest updates live.</h2>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${canEstimate ? 'sellability-live-pulse border-teal-300/35 bg-teal-400/10 text-teal-100' : 'border-white/[0.08] bg-slate-900/80 text-gray-400'}`}>
              {canEstimate ? 'Live estimate on' : 'Add retail price to start'}
            </div>
          </div>
          <div ref={mobileSummaryRef} className="mt-4 lg:hidden">
            <CompactScoreDock
              score={sellabilityScore}
              estimate={estimate}
              active={canEstimate}
            />
          </div>
        </div>

        <div className="sellability-card-in rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5" style={{ animationDelay: '70ms' }}>
          <SectionHeader step="01" title="Pair Details" body="Start with what buyers search and what they compare." />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
              hint="Original PH retail price."
            />
          </div>
        </div>

        <div className="sellability-card-in rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5" style={{ animationDelay: '120ms' }}>
          <SectionHeader step="02" title="Condition" body="Pick the closest truth. The score rewards clarity, not hype." />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {conditionOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                active={condition === option.value}
                label={option.label}
                helper={option.helper}
                badge={option.boost}
                onClick={() => setCondition(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="sellability-card-in grid gap-4 lg:grid-cols-2" style={{ animationDelay: '170ms' }}>
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5">
            <SectionHeader step="03" title="Usage" body="Mileage helps buyers judge outsole and foam life." />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {mileageOptions.map((option) => (
                <MiniChoice
                  key={option.value}
                  active={mileage === option.value}
                  label={option.label}
                  helper={option.helper}
                  onClick={() => setMileage(option.value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5">
            <SectionHeader step="04" title="Age" body="Newer releases usually feel easier to move." />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {ageOptions.map((option) => (
                <MiniChoice
                  key={option.value}
                  active={age === option.value}
                  label={option.label}
                  helper={option.helper}
                  onClick={() => setAge(option.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="sellability-card-in rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5" style={{ animationDelay: '220ms' }}>
          <SectionHeader step="05" title="Selling Strategy" body="Tell the tool if you want speed, balance, or maximum value." />
          <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-medium text-gray-300">Buyer demand</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {demandOptions.map((option) => (
                  <MiniChoice
                    key={option.value}
                    active={demand === option.value}
                    label={option.label}
                    helper={option.helper}
                    onClick={() => setDemand(option.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">Selling goal</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {urgencyOptions.map((option) => (
                  <MiniChoice
                    key={option.value}
                    active={urgency === option.value}
                    label={option.label}
                    helper={option.helper}
                    onClick={() => setUrgency(option.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="sellability-card-in rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5" style={{ animationDelay: '270ms' }}>
          <SectionHeader step="06" title="Trust Extras" body="These do not become new listing fields. They travel into the description when you list." />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <TrustToggle checked={hasBox} onChange={setHasBox} title="Has box" body="Useful for complete pairs" />
            <TrustToggle checked={hasReceipt} onChange={setHasReceipt} title="Has receipt" body="Adds proof and confidence" />
            <TrustToggle checked={hasVisibleFlaws} onChange={setHasVisibleFlaws} title="Visible flaws" body="Honesty protects trust" warning />
          </div>
        </div>
      </section>

      <aside ref={fullResultRef} className="min-w-0 lg:sticky lg:top-24">
        <div className="sellability-card-in overflow-hidden rounded-2xl border border-teal-400/20 bg-[#06111d] shadow-[0_26px_90px_rgba(0,0,0,0.42)]">
          <div className="relative p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,0.10),transparent_30%)]" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">Live sellability</p>
              <div className="mt-4 grid grid-cols-[132px_1fr] items-center gap-4">
                <ScoreRing score={sellabilityScore} active={canEstimate} />
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-gray-100">{canEstimate ? scoreLabel : 'Waiting for price'}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{bestMove}</p>
                </div>
              </div>

              <div className={`mt-5 grid gap-3 transition-all duration-500 ${canEstimate ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-55'}`}>
                <div className="rounded-xl border border-white/[0.08] bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Suggested range</p>
                  <p className="mt-2 text-2xl font-extrabold text-gray-100">
                    {estimate ? `${formatPrice(estimate.suggestedLow)} - ${formatPrice(estimate.suggestedHigh)}` : 'Add retail price'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Fast sale" value={estimate ? formatPrice(estimate.fastSalePrice) : 'Pending'} />
                  <MetricCard label="Confidence" value={estimate ? estimate.confidence : 'Pending'} />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Live listing preview</p>
                <h3 className="mt-2 truncate text-lg font-extrabold text-gray-100">
                  {brand} {model || 'Running Shoe'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{selectedConditionLabel} · {selectedMileageLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <DetailChip label="Age" value={selectedAgeLabel} />
                  <DetailChip label="Demand" value={selectedDemandLabel} />
                  <DetailChip label="Goal" value={selectedUrgencyLabel} />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">Added to description</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <DetailChip label="Box" value={hasBox ? 'Yes' : 'No'} />
                  <DetailChip label="Receipt" value={hasReceipt ? 'Yes' : 'No'} />
                  <DetailChip label="Flaws" value={hasVisibleFlaws ? 'Yes' : 'No'} />
                  <DetailChip label="Usage" value={selectedMileageLabel} />
                  <DetailChip label="Age" value={selectedAgeLabel} />
                </div>
              </div>

              {estimate && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-gray-100">Smart tips</p>
                  <ul className="mt-2 space-y-2 text-sm leading-5 text-gray-400">
                    {[...estimate.reasons, ...tips].slice(0, 5).map((reason, index) => (
                      <li key={reason} className="sellability-tip flex gap-2" style={{ animationDelay: `${index * 80}ms` }}>
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 grid gap-2">
                {estimate ? (
                  <Link
                    href={`/listings/new?from=price-guide&price=${estimate.suggestedHigh}`}
                    onClick={saveListingPrefill}
                    className="inline-flex min-h-12 items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-400"
                  >
                    List this shoe with these details
                  </Link>
                ) : (
                  <div className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/[0.08] bg-slate-900/80 px-4 py-2 text-sm font-bold text-gray-500">
                    Add retail price to unlock listing handoff
                  </div>
                )}
                <Link
                  href="/official-running-shoe-brand-links-ph"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
                >
                  Check official retail links
                </Link>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionHeader({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/30 bg-teal-400/10 text-xs font-black text-teal-200">
        {step}
      </span>
      <div>
        <h3 className="text-base font-bold text-gray-100">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{body}</p>
      </div>
    </div>
  );
}

function CompactScoreDock({
  score,
  estimate,
  active,
  floating = false,
}: {
  score: number;
  estimate: ReturnType<typeof estimateRunningShoePrice> | null;
  active: boolean;
  floating?: boolean;
}) {
  const range = estimate
    ? `${formatPrice(estimate.suggestedLow)}-${formatPrice(estimate.suggestedHigh)}`
    : 'Add retail price';
  const fastSale = estimate ? formatPrice(estimate.fastSalePrice) : '--';
  const confidence = estimate ? estimate.confidence : '--';

  return (
    <div
      className={`sellability-mobile-dock max-w-full overflow-hidden rounded-2xl border border-teal-400/25 bg-[#06111d]/95 shadow-[0_18px_56px_rgba(0,0,0,0.42)] backdrop-blur-md ${
        floating ? 'sellability-mobile-dock-floating' : ''
      }`}
    >
      <div className="relative p-3">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(45,212,191,0.16),transparent_42%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,0.10),transparent_36%)]" />
        <div className="relative grid grid-cols-[58px_minmax(0,1fr)] gap-3">
          <MiniScoreRing score={score} active={active} />
          <div className="min-w-0 rounded-xl border border-white/[0.08] bg-slate-950/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Suggested range</p>
            <p className={`mt-1 truncate text-base font-black leading-none ${estimate ? 'text-gray-100' : 'text-gray-500'}`}>
              {range}
            </p>
          </div>
        </div>

        <div className="relative mt-2 grid grid-cols-2 gap-2">
          <CompactMetric label="Fast" value={fastSale} active={!!estimate} />
          <CompactMetric label="Confidence" value={confidence} active={!!estimate} capitalize />
        </div>
      </div>
    </div>
  );
}

function MiniScoreRing({ score, active }: { score: number; active: boolean }) {
  const animatedScore = useCountUp(active ? score : 0);
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (circumference * (active ? score : 0)) / 100;

  return (
    <div className="relative h-[58px] w-[58px] shrink-0">
      <svg className="-rotate-90" width="58" height="58" viewBox="0 0 58 58" aria-hidden>
        <circle cx="29" cy="29" r="20" stroke="#122333" strokeWidth="8" fill="none" />
        <circle
          cx="29"
          cy="29"
          r="20"
          stroke="#2dd4bf"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-base font-black leading-none ${active ? 'text-gray-100' : 'text-gray-500'}`}>
          {active ? animatedScore : '--'}
        </span>
        <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-teal-300">Score</span>
      </div>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  active,
  capitalize = false,
}: {
  label: string;
  value: string;
  active: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <p className={`mt-1 truncate text-sm font-extrabold leading-none ${active ? 'text-teal-100' : 'text-gray-500'} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function ChoiceCard({
  active,
  label,
  helper,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  helper: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[92px] rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 sm:min-h-[118px] sm:p-3 ${
        active
          ? 'border-teal-300/60 bg-teal-400/12 text-teal-50 shadow-[0_0_28px_rgba(45,212,191,0.12)]'
          : 'border-white/[0.08] bg-slate-950/55 text-gray-400 hover:border-teal-400/30 hover:text-gray-200'
      }`}
    >
      <span className="block text-xs font-extrabold sm:text-sm">{label}</span>
      <span className="mt-1 block text-[11px] leading-4 text-gray-500 sm:text-xs sm:leading-5">{helper}</span>
      <span className={`mt-2 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] sm:mt-3 sm:px-2 sm:text-[10px] sm:tracking-[0.12em] ${active ? 'bg-teal-300 text-slate-950' : 'bg-slate-900 text-gray-500'}`}>
        {badge}
      </span>
    </button>
  );
}

function MiniChoice({
  active,
  label,
  helper,
  onClick,
}: {
  active: boolean;
  label: string;
  helper: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[62px] rounded-lg border px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 sm:min-h-[76px] sm:px-3 ${
        active
          ? 'border-teal-400/55 bg-teal-400/10 text-teal-100'
          : 'border-white/[0.08] bg-slate-950/45 text-gray-400 hover:border-teal-400/30 hover:text-gray-200'
      }`}
    >
      <span className="block text-[11px] font-bold leading-tight sm:text-xs">{label}</span>
      <span className="mt-1 block text-[10px] leading-3 text-gray-500 sm:text-[11px] sm:leading-4">{helper}</span>
    </button>
  );
}

function TrustToggle({
  checked,
  onChange,
  title,
  body,
  warning = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  body: string;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`min-h-[74px] rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 sm:min-h-[96px] sm:p-3 ${
        checked
          ? warning
            ? 'border-amber-300/50 bg-amber-300/10 text-amber-100'
            : 'border-teal-400/50 bg-teal-400/10 text-teal-100'
          : 'border-white/[0.08] bg-slate-950/45 text-gray-400 hover:border-teal-400/30 hover:text-gray-200'
      }`}
    >
      <span className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-bold leading-tight sm:text-sm">{title}</span>
        <span className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors sm:h-5 sm:w-9 ${checked ? (warning ? 'bg-amber-300' : 'bg-teal-300') : 'bg-gray-700'}`}>
          <span className={`h-3 w-3 rounded-full bg-slate-950 transition-transform sm:h-4 sm:w-4 ${checked ? 'translate-x-3 sm:translate-x-4' : 'translate-x-0'}`} />
        </span>
      </span>
      <span className="mt-1 block text-[10px] leading-3 text-gray-500 sm:mt-2 sm:text-xs sm:leading-5">{body}</span>
    </button>
  );
}

function ScoreRing({ score, active }: { score: number; active: boolean }) {
  const animatedScore = useCountUp(active ? score : 0);
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (circumference * (active ? score : 0)) / 100;

  return (
    <div className="relative h-[132px] w-[132px]">
      <svg className="-rotate-90" width="132" height="132" viewBox="0 0 132 132" aria-hidden>
        <circle cx="66" cy="66" r="48" stroke="#122333" strokeWidth="14" fill="none" />
        <circle
          cx="66"
          cy="66"
          r="48"
          stroke="#2dd4bf"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-gray-100">{animatedScore}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300">Score</span>
      </div>
    </div>
  );
}

function useCountUp(value: number) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const start = previous.current;
    const difference = value - start;
    previous.current = value;
    if (difference === 0) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const totalFrames = 18;
    const id = window.setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      setDisplay(Math.round(start + difference * (1 - Math.pow(1 - progress, 3))));
      if (frame >= totalFrames) window.clearInterval(id);
    }, 18);

    return () => window.clearInterval(id);
  }, [value]);

  return display;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-slate-950/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold capitalize text-teal-100">{value}</p>
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-slate-900/80 px-2.5 py-1 text-gray-300">
      <span className="text-gray-500">{label}:</span> {value}
    </span>
  );
}
