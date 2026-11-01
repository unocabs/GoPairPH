import type { PriceFeedbackSnapshot } from '../feedback';

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });
const mileageLabels = {
  unused: 'Unused',
  under_20: 'Under 20 km',
  twenty_to_80: '20–80 km',
  eighty_to_200: '80–200 km',
  over_200: 'Over 200 km',
  unknown: 'Unknown',
};
const ageLabels = {
  under_3_months: 'Under 3 months',
  three_to_12_months: '3–12 months',
  one_to_two_years: '1–2 years',
  over_two_years: 'Over 2 years',
  unknown: 'Unknown',
};
const conditionLabels = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};
const goalLabels = {
  best_price: 'Best price',
  balanced: 'Balanced',
  sell_fast: 'Sell fast',
};

function positivePrice(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
export function feedbackPrice(value: unknown): string {
  const number = positivePrice(value);
  return number == null ? 'Not recorded' : currency.format(number);
}

// Display the saved submission, never a recalculation using today's engine.
export function buildPriceFeedbackReview(
  snapshot: PriceFeedbackSnapshot,
  suggestedPrice: number | string | null,
) {
  const input = snapshot.input;
  const originalSrp = positivePrice(input.retailPricePhp);
  const appPrice = positivePrice(snapshot.reference_price_php);
  const userPrice = positivePrice(suggestedPrice);
  const differencePhp =
    appPrice != null && userPrice != null
      ? Math.round((userPrice - appPrice) * 100) / 100
      : null;
  const differencePercent =
    differencePhp != null && appPrice != null
      ? (differencePhp / appPrice) * 100
      : null;
  const shareOfSrp = (value: number | null) =>
    value != null && originalSrp != null
      ? `${percent.format((value / originalSrp) * 100)}% of entered SRP`
      : '';
  const differenceLabel =
    differencePhp == null || differencePercent == null
      ? 'Price difference unavailable'
      : differencePhp === 0
        ? 'User suggests the same price as the app price reviewed.'
        : `User suggests ${currency.format(Math.abs(differencePhp))} ${differencePhp > 0 ? 'higher' : 'lower'} (${differencePhp > 0 ? '+' : '−'}${percent.format(Math.abs(differencePercent))}%) than the app price reviewed.`;

  return {
    originalSrp,
    appPrice,
    userPrice,
    differencePhp,
    differencePercent,
    differenceLabel,
    metrics: [
      {
        label: 'Original SRP entered',
        value: feedbackPrice(originalSrp),
        hint: 'User-provided retail price',
        emphasis: false,
      },
      {
        label: 'App resale price reviewed',
        value: feedbackPrice(appPrice),
        hint: shareOfSrp(appPrice),
        emphasis: false,
      },
      {
        label: 'User’s suggested price',
        value: feedbackPrice(userPrice),
        hint: shareOfSrp(userPrice),
        emphasis: true,
      },
    ],
    prices: [
      {
        label: 'App suggested resale range',
        value: `${feedbackPrice(snapshot.estimate.suggestedLow)}–${feedbackPrice(snapshot.estimate.suggestedHigh)}`,
      },
      {
        label: 'App fast-sale suggestion',
        value: feedbackPrice(snapshot.estimate.fastSalePrice),
      },
      {
        label: 'Price option reviewed',
        value:
          snapshot.price_choice === 'fast_sale'
            ? 'Fast-sale suggestion'
            : 'Price selected within the app’s suggested range',
      },
    ],
    details: [
      ...('basisPhp' in snapshot.estimate
        ? [
            {
              label: 'Retail basis used',
              value: feedbackPrice(snapshot.estimate.basisPhp),
            },
            {
              label: 'Retail evidence',
              value: snapshot.estimate.reference
                ? `${snapshot.estimate.reference.source_name} · ${snapshot.estimate.reference.variant} · observed ${snapshot.estimate.reference.observed_at} · ${snapshot.estimate.reference.source_url}`
                : 'User-entered retail fallback',
            },
            {
              label: 'Independent resale observations',
              value: String(snapshot.estimate.comparableCount),
            },
            {
              label: 'User asking price',
              value: feedbackPrice(input.askingPricePhp),
            },
          ]
        : []),
      {
        label: 'Condition',
        value: conditionLabels[input.condition] ?? 'Not recorded',
      },
      {
        label: 'Reported mileage',
        value:
          input.mileageKm != null
            ? `${input.mileageKm} km`
            : (mileageLabels[input.mileage] ?? 'Not recorded'),
      },
      { label: 'Reported age', value: ageLabels[input.age] ?? 'Not recorded' },
      {
        label: 'Box included',
        value:
          input.hasBox == null ? 'Not recorded' : input.hasBox ? 'Yes' : 'No',
      },
      {
        label: 'Receipt available',
        value:
          input.hasReceipt == null
            ? 'Not recorded'
            : input.hasReceipt
              ? 'Yes'
              : 'No',
      },
      {
        label: 'Visible flaws reported',
        value:
          input.hasVisibleFlaws == null
            ? 'Not recorded'
            : input.hasVisibleFlaws
              ? 'Yes'
              : 'No',
      },
      {
        label: 'Seller-selected demand',
        value: input.demand
          ? input.demand[0].toUpperCase() + input.demand.slice(1)
          : 'Not recorded',
      },
      {
        label: 'Selling goal',
        value: goalLabels[input.urgency] ?? 'Not recorded',
      },
    ],
  };
}
