export type PriceGuideCondition = 'new' | 'like_new' | 'good' | 'fair';
export type PriceGuideMileage = 'unused' | 'under_20' | 'twenty_to_80' | 'eighty_to_200' | 'over_200' | 'unknown';
export type PriceGuideAge = 'under_3_months' | 'three_to_12_months' | 'one_to_two_years' | 'over_two_years';
export type PriceGuideDemand = 'popular' | 'normal' | 'niche';
export type PriceGuideUrgency = 'best_price' | 'balanced' | 'sell_fast';

export interface RunningShoePriceGuideInput {
  retailPricePhp: number;
  condition: PriceGuideCondition;
  mileage: PriceGuideMileage;
  age: PriceGuideAge;
  demand: PriceGuideDemand;
  urgency: PriceGuideUrgency;
  hasBox: boolean;
  hasReceipt: boolean;
  hasVisibleFlaws: boolean;
}

export interface RunningShoePriceGuideEstimate {
  suggestedLow: number;
  suggestedHigh: number;
  fastSalePrice: number;
  confidence: 'low' | 'medium' | 'high';
  reasons: string[];
}

const conditionRanges: Record<PriceGuideCondition, [number, number]> = {
  new: [0.82, 0.94],
  like_new: [0.62, 0.78],
  good: [0.42, 0.62],
  fair: [0.25, 0.42],
};

const mileageAdjustments: Record<PriceGuideMileage, number> = {
  unused: 0.02,
  under_20: 0.02,
  twenty_to_80: 0,
  eighty_to_200: -0.08,
  over_200: -0.16,
  unknown: -0.04,
};

const ageAdjustments: Record<PriceGuideAge, number> = {
  under_3_months: 0.03,
  three_to_12_months: 0,
  one_to_two_years: -0.07,
  over_two_years: -0.13,
};

const demandAdjustments: Record<PriceGuideDemand, number> = {
  popular: 0.04,
  normal: 0,
  niche: -0.05,
};

const urgencyAdjustments: Record<PriceGuideUrgency, number> = {
  best_price: 0.04,
  balanced: 0,
  sell_fast: -0.1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearestHundred(value: number): number {
  return Math.max(100, Math.round(value / 100) * 100);
}

function addReason(reasons: string[], condition: boolean, reason: string) {
  if (condition) reasons.push(reason);
}

export function estimateRunningShoePrice(input: RunningShoePriceGuideInput): RunningShoePriceGuideEstimate {
  const [baseLow, baseHigh] = conditionRanges[input.condition];
  const adjustment =
    mileageAdjustments[input.mileage] +
    ageAdjustments[input.age] +
    demandAdjustments[input.demand] +
    urgencyAdjustments[input.urgency] +
    (input.hasBox ? 0.02 : 0) +
    (input.hasReceipt ? 0.03 : 0) +
    (input.hasVisibleFlaws ? -0.14 : 0);

  const lowFactor = clamp(baseLow + adjustment, 0.08, 0.95);
  const highFactor = clamp(baseHigh + adjustment, lowFactor + 0.03, 0.98);
  const suggestedLow = roundToNearestHundred(input.retailPricePhp * lowFactor);
  const suggestedHigh = Math.max(
    suggestedLow + 100,
    roundToNearestHundred(input.retailPricePhp * highFactor)
  );
  const fastSalePrice = roundToNearestHundred(suggestedLow * 0.9);

  const reasons: string[] = [];
  addReason(reasons, input.condition === 'new', 'Brand-new pairs can stay closer to retail when demand is healthy.');
  addReason(reasons, input.condition === 'like_new', 'Like New pairs usually price below retail but still keep strong value.');
  addReason(reasons, input.condition === 'good', 'Good condition pairs need a more buyer-friendly resale range.');
  addReason(reasons, input.condition === 'fair', 'Fair condition pairs should be priced clearly below retail.');
  addReason(reasons, input.mileage === 'under_20', 'Very low mileage helps buyer confidence.');
  addReason(reasons, input.mileage === 'eighty_to_200' || input.mileage === 'over_200', 'Higher mileage should lower the asking range.');
  addReason(reasons, input.mileage === 'unknown', 'Unknown mileage lowers confidence slightly.');
  addReason(reasons, input.age === 'one_to_two_years' || input.age === 'over_two_years', 'Older models usually need more realistic pricing.');
  addReason(reasons, input.hasBox, 'Box included can help the listing feel more complete.');
  addReason(reasons, input.hasReceipt, 'Receipt or proof of purchase can improve trust.');
  addReason(reasons, input.hasVisibleFlaws, 'Visible flaws should be reflected in the price.');
  addReason(reasons, input.urgency === 'sell_fast', 'Sell-fast pricing lowers the range to attract quicker offers.');
  addReason(reasons, input.demand === 'popular', 'Popular running shoes can usually hold value better.');
  addReason(reasons, input.demand === 'niche', 'Niche models may need a sharper price to find the right buyer.');

  const confidence = input.mileage === 'unknown'
    ? 'medium'
    : input.hasReceipt || input.hasBox
      ? 'high'
      : 'medium';

  return {
    suggestedLow,
    suggestedHigh,
    fastSalePrice,
    confidence,
    reasons: reasons.slice(0, 4),
  };
}
