import type { RunningShoePriceGuideInput } from './runningShoePriceGuide';

export const ESTIMATOR_VERSION = 'retail_evidence_v2';
export interface EstimatorInput
  extends Omit<RunningShoePriceGuideInput, 'age'> {
  brand: string;
  model: string;
  age: RunningShoePriceGuideInput['age'] | 'unknown';
  mileageKm?: number | null;
  askingPricePhp?: number | null;
}
export interface RetailReference {
  id: string;
  model_id: string;
  source_url: string;
  source_name: string;
  variant: string;
  regular_price_php: number;
  price_php: number;
  observed_at: string;
  valid_until: string | null;
  availability: 'available' | 'unknown' | 'out_of_stock';
  published: boolean;
}
export interface EstimatorModel {
  id: string;
  brand: string;
  name: string;
  aliases: string[];
  category: string;
}
export interface SaleObservation {
  id: string;
  model_id: string;
  condition: string;
  price_php: number;
  sold_at: string;
  seller_group: string;
  provenance: 'seller_reported' | 'buyer_seller_confirmed';
}
export interface EstimatorResult {
  version: string;
  calculatedAt: string;
  modelId: string | null;
  suggestedLow: number;
  suggestedHigh: number;
  suggestedPrice: number;
  fastSalePrice: number;
  patientPrice: number;
  confidence: 'low' | 'medium';
  evidenceType: 'retail_reference' | 'sold_comparables' | 'user_retail';
  basisPhp: number;
  reference: RetailReference | null;
  staleReference: RetailReference | null;
  comparableCount: number;
  comparableIds: string[];
  reasons: string[];
  warnings: string[];
  assessment: {
    label: string;
    differencePhp: number;
    explanation: string;
  } | null;
}
export function normalizeModel(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
export function matchEstimatorModel(
  input: Pick<EstimatorInput, 'brand' | 'model'>,
  models: EstimatorModel[],
): EstimatorModel | null {
  const brand = normalizeModel(
    input.brand === 'On Running' ? 'On' : input.brand,
  );
  const text = normalizeModel(input.model).replace(
    new RegExp(`^${brand} `),
    '',
  );
  const matches = models.filter(
    (model) =>
      normalizeModel(model.brand) === brand &&
      [model.name, ...model.aliases].some(
        (alias) => normalizeModel(alias) === text,
      ),
  );
  return matches.length === 1 ? matches[0] : null;
}
export function isFreshReference(
  reference: RetailReference,
  now: Date,
): boolean {
  const observed = Date.parse(reference.observed_at);
  return (
    reference.published &&
    reference.availability !== 'out_of_stock' &&
    Number.isFinite(observed) &&
    observed <= now.getTime() &&
    now.getTime() - observed <= 35 * 86_400_000 &&
    (!reference.valid_until ||
      Date.parse(reference.valid_until) > now.getTime()) &&
    Number.isFinite(Number(reference.price_php)) &&
    Number(reference.price_php) > 0 &&
    Number.isFinite(Number(reference.regular_price_php)) &&
    Number(reference.regular_price_php) >= Number(reference.price_php)
  );
}
const ranges = {
  new: [0.85, 0.95],
  like_new: [0.72, 0.82],
  good: [0.6, 0.7],
  fair: [0.35, 0.5],
} as const;
function round(value: number) {
  const step = value < 1000 ? 50 : 100;
  return Math.max(step, Math.round(value / step) * step);
}
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

export function calculateEstimator(
  input: EstimatorInput,
  model: EstimatorModel | null,
  references: RetailReference[],
  observations: SaleObservation[] = [],
  now = new Date(),
): EstimatorResult {
  if (
    !Number.isFinite(input.retailPricePhp) ||
    input.retailPricePhp < 500 ||
    input.retailPricePhp > 1_000_000
  )
    throw new Error('Enter a realistic original retail price.');
  if (!ranges[input.condition]) throw new Error('Choose a condition.');
  if (
    input.condition === 'new' &&
    ((input.mileageKm ?? 0) > 0 ||
      !['unused', 'unknown'].includes(input.mileage))
  )
    throw new Error(
      'Unused shoes cannot have running mileage. Check the condition or mileage.',
    );
  if (
    input.mileageKm != null &&
    (!Number.isFinite(input.mileageKm) ||
      input.mileageKm < 0 ||
      input.mileageKm > 10000)
  )
    throw new Error('Check the mileage.');
  const candidates = references
    .filter((item) => item.model_id === model?.id && item.published)
    .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));
  const reference =
    candidates
      .filter((item) => isFreshReference(item, now))
      .sort((a, b) => Number(a.price_php) - Number(b.price_php))[0] ?? null;
  const staleReference = reference ? null : (candidates[0] ?? null);
  const basis = reference ? Number(reference.price_php) : input.retailPricePhp;
  const mileage =
    input.mileageKm != null
      ? input.mileageKm
      : {
          unused: 0,
          under_20: 10,
          twenty_to_80: 50,
          eighty_to_200: 140,
          over_200: 300,
          unknown: 80,
        }[input.mileage];
  // Heuristic beta: monotonic, capped wear deductions. Condition already accounts for some wear.
  const mileageDeduction =
    mileage <= 20 ? 0 : Math.min(0.22, (mileage - 20) / 1500);
  const ageDeduction = {
    under_3_months: 0,
    three_to_12_months: 0,
    one_to_two_years: 0.04,
    over_two_years: 0.09,
    unknown: 0.02,
  }[input.age];
  const wear =
    Math.max(mileageDeduction, ageDeduction) +
    (input.hasVisibleFlaws ? 0.08 : 0);
  const [lower, upper] = ranges[input.condition];
  let low = basis * Math.max(0.1, lower - wear),
    high = basis * Math.max(0.15, upper - wear);
  const independent = new Map<string, SaleObservation>();
  for (const observation of [...observations].sort(
    (a, b) => Date.parse(b.sold_at) - Date.parse(a.sold_at),
  )) {
    const age = now.getTime() - Date.parse(observation.sold_at);
    if (
      observation.model_id !== model?.id ||
      observation.condition !== input.condition ||
      observation.provenance !== 'buyer_seller_confirmed' ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > 180 * 86_400_000 ||
      !Number.isFinite(Number(observation.price_php)) ||
      Number(observation.price_php) <= 0 ||
      Number(observation.price_php) > basis * 1.2
    )
      continue;
    if (!independent.has(observation.seller_group))
      independent.set(observation.seller_group, observation);
  }
  const sales = Array.from(independent.values());
  const evidenceType =
    sales.length >= 5
      ? 'sold_comparables'
      : reference
        ? 'retail_reference'
        : 'user_retail';
  if (sales.length >= 5) {
    const center = Math.min(
      basis * 0.85,
      median(sales.map((row) => Number(row.price_php))),
    );
    const dispersion = median(
      sales.map((row) => Math.abs(Number(row.price_php) - center)),
    );
    const width = Math.max(center * 0.12, dispersion * 1.5);
    low = Math.max(50, center - width);
    high = Math.min(basis * 0.98, center + width);
    // Observations match condition, but do not establish the exact mileage/age of this shoe.
    low *= 1 - Math.min(0.35, wear);
    high *= 1 - Math.min(0.35, wear);
  }
  const suggestedLow = round(low),
    suggestedHigh = Math.max(suggestedLow, round(high));
  const suggestedPrice = Math.max(
    suggestedLow,
    Math.min(suggestedHigh, round(low + (high - low) * 0.6)),
  );
  const warnings = [
    'This is pricing guidance, not a guaranteed selling price or authenticity check.',
  ];
  if (!reference)
    warnings.push(
      staleReference
        ? 'Retail reference is stale, expired, or unavailable. The estimate uses your entered retail price.'
        : 'No current local retail reference is matched. The estimate uses your entered retail price.',
    );
  if (reference)
    warnings.push(
      'The reference is a listed retail offer; availability in your size and colour has not been confirmed.',
    );
  if (reference)
    warnings.push(
      `Reference variant: ${reference.variant}. Other colours and sizes can cost differently.`,
    );
  if (input.mileage === 'unknown' && input.mileageKm == null)
    warnings.push('Unknown mileage increases uncertainty.');
  if (input.age === 'unknown')
    warnings.push('Unknown purchase age increases uncertainty.');
  if (
    Math.abs(
      input.retailPricePhp -
        (reference ? Number(reference.regular_price_php) : basis),
    ) /
      (reference ? Number(reference.regular_price_php) : basis) >
    0.25
  )
    warnings.push(
      'Your entered SRP differs substantially from the current reference; review the model and variant.',
    );
  const reasons = [
    reference
      ? 'Uses the dated local retail offer shown below, rather than original SRP alone.'
      : 'Uses your entered retail price as an unverified fallback.',
    `Condition sets the baseline; mileage and age use the larger wear adjustment to reduce double counting.`,
    input.hasVisibleFlaws
      ? 'Reported visible flaws reduce the suggested range.'
      : 'No visible flaws were reported.',
    'Box and receipt support listing completeness; they do not certify authenticity or create a market-price premium.',
    sales.length >= 5
      ? `Uses ${sales.length} independent buyer-and-seller-confirmed resale observations.`
      : 'There are not enough matched independent resale outcomes to validate this price.',
  ];
  let assessment: EstimatorResult['assessment'] = null;
  if (input.askingPricePhp != null) {
    if (!Number.isFinite(input.askingPricePhp) || input.askingPricePhp <= 0)
      throw new Error('Enter a valid asking price.');
    const tolerance = Math.max(50, suggestedPrice * 0.02);
    const label =
      input.askingPricePhp < suggestedLow - tolerance
        ? 'Below the suggested range'
        : input.askingPricePhp > suggestedHigh + tolerance
          ? 'Above the suggested range'
          : 'Within the suggested range';
    assessment = {
      label,
      differencePhp: Math.round(input.askingPricePhp - suggestedPrice),
      explanation: `${label}. This compares your asking price with the condition-adjusted guidance. ${reference ? 'The dated retail offer provides context, subject to size and colour availability.' : 'Retail availability and completed-sale evidence are limited, so this is a provisional assessment.'}`,
    };
  }
  return {
    version: ESTIMATOR_VERSION,
    calculatedAt: now.toISOString(),
    modelId: model?.id ?? null,
    suggestedLow,
    suggestedHigh,
    suggestedPrice,
    fastSalePrice: Math.min(suggestedLow, round(suggestedLow * 0.9)),
    patientPrice: suggestedHigh,
    confidence:
      sales.length >= 5 &&
      reference &&
      (input.mileageKm != null || input.mileage !== 'unknown') &&
      input.age !== 'unknown'
        ? 'medium'
        : 'low',
    evidenceType,
    basisPhp: basis,
    reference,
    staleReference,
    comparableCount: sales.length,
    comparableIds: sales.map((row) => row.id),
    reasons,
    warnings,
    assessment,
  };
}
