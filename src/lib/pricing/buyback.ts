import type { Condition } from '@/types';
import {
  estimateRunningShoePrice,
  type PriceGuideAge,
  type PriceGuideMileage,
} from './runningShoePriceGuide';

export const BUYBACK_PRICING_VERSION = 'buyback_v2_original_price_60_70';
export const BUYBACK_MIN_QUOTE_PHP = 500;
export const BUYBACK_MAX_QUOTE_PHP = 10_000;

export interface BuybackQuoteInput {
  originalPricePhp: number;
  listingPricePhp: number;
  purchaseDate: string;
  condition: Condition;
  mileageKm: number | null;
  hasBox: boolean;
  hasVisibleFlaws: boolean;
  now?: Date;
}

export interface BuybackQuote {
  retailBasisPhp: number;
  fastSaleEstimatePhp: number;
  quotedPricePhp: number;
  eligible: boolean;
  pricingVersion: string;
  snapshot: Record<string, string | number | boolean | null>;
}

function mileageBucket(mileageKm: number | null): PriceGuideMileage {
  if (mileageKm == null) return 'unknown';
  if (mileageKm === 0) return 'unused';
  if (mileageKm <= 20) return 'under_20';
  if (mileageKm <= 80) return 'twenty_to_80';
  if (mileageKm <= 200) return 'eighty_to_200';
  return 'over_200';
}

function ageBucket(purchaseDate: string, now: Date): PriceGuideAge {
  const purchasedAt = new Date(`${purchaseDate}T00:00:00+08:00`).getTime();
  const ageDays = Math.max(0, Math.floor((now.getTime() - purchasedAt) / 86_400_000));
  if (ageDays < 90) return 'under_3_months';
  if (ageDays < 365) return 'three_to_12_months';
  if (ageDays < 730) return 'one_to_two_years';
  return 'over_two_years';
}

function floorToHundred(value: number): number {
  return Math.max(0, Math.floor(value / 100) * 100);
}

export function calculateBuybackQuote(input: BuybackQuoteInput): BuybackQuote {
  const now = input.now ?? new Date();
  const retailBasisPhp = input.originalPricePhp;
  const mileage = mileageBucket(input.mileageKm);
  const age = ageBucket(input.purchaseDate, now);
  const estimate = estimateRunningShoePrice({
    retailPricePhp: retailBasisPhp,
    condition: input.condition,
    mileage,
    age,
    demand: 'normal',
    urgency: 'sell_fast',
    hasBox: input.hasBox,
    hasReceipt: true,
    hasVisibleFlaws: input.hasVisibleFlaws,
  });
  const quotedPricePhp = floorToHundred(Math.min(
    estimate.fastSalePrice * 0.6,
    input.listingPricePhp * 0.7,
    BUYBACK_MAX_QUOTE_PHP,
  ));

  return {
    retailBasisPhp,
    fastSaleEstimatePhp: estimate.fastSalePrice,
    quotedPricePhp,
    eligible: quotedPricePhp >= BUYBACK_MIN_QUOTE_PHP,
    pricingVersion: BUYBACK_PRICING_VERSION,
    snapshot: {
      original_price_php: input.originalPricePhp,
      listing_price_php: input.listingPricePhp,
      purchase_date: input.purchaseDate,
      retail_basis_php: retailBasisPhp,
      condition: input.condition,
      mileage_km: input.mileageKm,
      mileage_bucket: mileage,
      age_bucket: age,
      has_box: input.hasBox,
      has_visible_flaws: input.hasVisibleFlaws,
      demand: 'normal',
      urgency: 'sell_fast',
      fast_sale_estimate_php: estimate.fastSalePrice,
      fast_sale_multiplier: 0.6,
      listing_price_cap_multiplier: 0.7,
      maximum_quote_php: BUYBACK_MAX_QUOTE_PHP,
      quoted_price_php: quotedPricePhp,
      pricing_version: BUYBACK_PRICING_VERSION,
    },
  };
}

export function calculateMaximumBuybackQuote(
  input: Pick<BuybackQuoteInput, 'originalPricePhp' | 'listingPricePhp' | 'condition' | 'mileageKm'> & { now?: Date },
): BuybackQuote {
  const now = input.now ?? new Date();
  const manilaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);

  return calculateBuybackQuote({
    ...input,
    now,
    purchaseDate: manilaDate,
    hasBox: true,
    hasVisibleFlaws: false,
  });
}

export function buildBuybackProofCode(listingId: string, date = new Date()): string {
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date).replaceAll('-', '');
  return `GP-${listingId.slice(0, 6).toUpperCase()}-${datePart}`;
}

export function getBuybackShipDateBounds(date = new Date()): { min: string; max: string } {
  const manilaNow = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const format = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const min = new Date(manilaNow); min.setDate(min.getDate() + 2);
  const max = new Date(manilaNow); max.setDate(max.getDate() + 30);
  return { min: format(min), max: format(max) };
}
