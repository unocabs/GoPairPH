import type {
  PriceGuideAge,
  PriceGuideCondition,
  PriceGuideDemand,
  PriceGuideMileage,
  PriceGuideUrgency,
} from './runningShoePriceGuide';

export const PRICE_GUIDE_PREFILL_KEY = 'gopairph:price-guide-prefill:v1';

export interface PriceGuideListingPrefill {
  brand: string;
  model: string;
  retailPricePhp: number;
  condition: PriceGuideCondition;
  mileage: PriceGuideMileage;
  age: PriceGuideAge;
  demand: PriceGuideDemand;
  urgency: PriceGuideUrgency;
  hasBox: boolean;
  hasReceipt: boolean;
  hasVisibleFlaws: boolean;
  suggestedLow: number;
  suggestedHigh: number;
  fastSalePrice: number;
  createdAt: number;
}

const mileageLabels: Record<PriceGuideMileage, string> = {
  unused: 'Unused',
  under_20: 'Under 20 km',
  twenty_to_80: '20-80 km',
  eighty_to_200: '80-200 km',
  over_200: 'Over 200 km',
  unknown: 'Not sure',
};

const conditionLabels: Record<PriceGuideCondition, string> = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

const ageLabels: Record<PriceGuideAge, string> = {
  under_3_months: 'Under 3 months',
  three_to_12_months: '3-12 months',
  one_to_two_years: '1-2 years',
  over_two_years: 'Over 2 years',
};

function formatPeso(value: number): string {
  return `PHP ${Math.round(value).toLocaleString('en-PH')}`;
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

export function buildPriceGuideDescription(prefill: PriceGuideListingPrefill): string {
  const lines = [
    `Original retail price: ${formatPeso(prefill.retailPricePhp)}`,
    `Condition: ${conditionLabels[prefill.condition]}`,
    `Usage: ${mileageLabels[prefill.mileage]}`,
    `Age: ${ageLabels[prefill.age]}`,
    `Box included: ${yesNo(prefill.hasBox)}`,
    `Receipt/proof available: ${yesNo(prefill.hasReceipt)}`,
    '',
    'Seller note:',
  ];

  return lines.join('\n');
}
