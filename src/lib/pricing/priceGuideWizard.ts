import { BRANDS } from '../constants';
import type { EstimatorInput } from './estimator';

export const INITIAL_PRICE_GUIDE_INPUT: EstimatorInput = {
  brand: '',
  model: '',
  retailPricePhp: 0,
  condition: 'good',
  mileage: 'unknown',
  mileageKm: null,
  age: 'unknown',
  demand: 'normal',
  urgency: 'balanced',
  hasBox: false,
  hasReceipt: false,
  hasVisibleFlaws: false,
  askingPricePhp: null,
};
export const PRICE_GUIDE_STEPS = [
  'Shoe details',
  'Condition',
  'Usage',
  'Extras',
  'Review',
] as const;
export function normalizeGuideBrand(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' '),
    key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key === 'on') return 'On Running';
  return (
    BRANDS.find(
      (brand) => brand.toLowerCase().replace(/[^a-z0-9]/g, '') === key,
    ) ?? trimmed
  );
}
export function guideBrandChoice(value: string): string {
  const brand = normalizeGuideBrand(value);
  return !brand ? '' : BRANDS.includes(brand) ? brand : 'Other';
}
export function guideMileageBucket(
  km: number | null,
): EstimatorInput['mileage'] {
  return km == null
    ? 'unknown'
    : km === 0
      ? 'unused'
      : km < 20
        ? 'under_20'
        : km <= 80
          ? 'twenty_to_80'
          : km <= 200
            ? 'eighty_to_200'
            : 'over_200';
}
export function guideStepError(
  input: EstimatorInput,
  step: number,
): string | null {
  if (step === 0) {
    if (!input.brand.trim() || normalizeGuideBrand(input.brand) === 'Other')
      return 'Choose a brand, or enter the brand name under Other.';
    if (!input.model.trim())
      return 'Enter the exact model, including its generation.';
    if (
      !Number.isFinite(input.retailPricePhp) ||
      input.retailPricePhp < 500 ||
      input.retailPricePhp > 1_000_000
    )
      return 'Enter an original SRP between ₱500 and ₱1,000,000.';
  }
  if (step === 2) {
    if (
      input.mileageKm != null &&
      (!Number.isFinite(input.mileageKm) ||
        input.mileageKm < 0 ||
        input.mileageKm > 10000)
    )
      return 'Enter mileage between 0 and 10,000 km, or leave it blank if unknown.';
    if (
      input.condition === 'new' &&
      ((input.mileageKm ?? 0) > 0 ||
        !['unused', 'unknown'].includes(input.mileage))
    )
      return 'New shoes must be unused. Check the condition or running mileage.';
  }
  if (
    step === 4 &&
    input.askingPricePhp != null &&
    (!Number.isFinite(input.askingPricePhp) ||
      input.askingPricePhp <= 0 ||
      input.askingPricePhp > 1_000_000)
  )
    return 'Enter a valid asking price, or leave it blank.';
  return null;
}
export function restoreGuideDraft(
  value: unknown,
): { input: EstimatorInput; step: number; brandChoice: string } | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>,
    input = { ...INITIAL_PRICE_GUIDE_INPUT };
  for (const key of ['brand', 'model'] as const)
    if (typeof raw[key] === 'string')
      input[key] = raw[key].slice(0, key === 'brand' ? 80 : 160);
  input.brand = normalizeGuideBrand(input.brand);
  for (const key of ['hasBox', 'hasReceipt', 'hasVisibleFlaws'] as const)
    if (typeof raw[key] === 'boolean') input[key] = raw[key];
  if (
    typeof raw.retailPricePhp === 'number' &&
    Number.isFinite(raw.retailPricePhp)
  )
    input.retailPricePhp = raw.retailPricePhp;
  for (const key of ['mileageKm', 'askingPricePhp'] as const)
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key]))
      input[key] = raw[key];
  if (['new', 'like_new', 'good', 'fair'].includes(String(raw.condition)))
    input.condition = raw.condition as EstimatorInput['condition'];
  if (
    [
      'under_3_months',
      'three_to_12_months',
      'one_to_two_years',
      'over_two_years',
      'unknown',
    ].includes(String(raw.age))
  )
    input.age = raw.age as EstimatorInput['age'];
  if (
    [
      'unused',
      'under_20',
      'twenty_to_80',
      'eighty_to_200',
      'over_200',
      'unknown',
    ].includes(String(raw.mileage))
  )
    input.mileage = raw.mileage as EstimatorInput['mileage'];
  // Exact mileage is authoritative; old bucket-only drafts remain usable.
  if (input.mileageKm != null)
    input.mileage = guideMileageBucket(input.mileageKm);
  const brandChoice =
    raw._brandChoice === 'Other' ? 'Other' : guideBrandChoice(input.brand);
  let step =
    typeof raw._step === 'number' && Number.isInteger(raw._step)
      ? Math.max(0, Math.min(4, raw._step))
      : 0;
  for (let index = 0; index < step; index++)
    if (guideStepError(input, index)) {
      step = index;
      break;
    }
  return { input, step, brandChoice };
}
