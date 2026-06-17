import type { Shoe } from '@/types';
import {
  estimateRunningShoePrice,
  type PriceGuideAge,
  type PriceGuideMileage,
} from './runningShoePriceGuide';

export const GREAT_DEAL_TOOLTIP =
  'A great deal based on our price guide. Send an offer before someone else does.';

function mileageToPriceGuideMileage(mileageKm: number | null): PriceGuideMileage {
  if (mileageKm == null) return 'unknown';
  if (mileageKm === 0) return 'unused';
  if (mileageKm <= 20) return 'under_20';
  if (mileageKm <= 80) return 'twenty_to_80';
  if (mileageKm <= 200) return 'eighty_to_200';
  return 'over_200';
}

function createdAtToPriceGuideAge(createdAt: string): PriceGuideAge {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 'three_to_12_months';

  const ageDays = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
  if (ageDays < 90) return 'under_3_months';
  if (ageDays < 365) return 'three_to_12_months';
  if (ageDays < 730) return 'one_to_two_years';
  return 'over_two_years';
}

export function getGreatDealEstimate(shoe: Shoe): { fastSalePrice: number } | null {
  const hasPhoto = (shoe.shoe_images?.length ?? 0) > 0;
  if (
    shoe.status !== 'active' ||
    shoe.listing_type !== 'for_sale' ||
    shoe.price_php == null ||
    shoe.srp_php == null ||
    shoe.srp_php < shoe.price_php ||
    !hasPhoto ||
    !!shoe.quality_flagged_at
  ) {
    return null;
  }

  const estimate = estimateRunningShoePrice({
    retailPricePhp: shoe.srp_php,
    condition: shoe.condition,
    mileage: mileageToPriceGuideMileage(shoe.mileage_km),
    age: createdAtToPriceGuideAge(shoe.created_at),
    demand: 'normal',
    urgency: 'sell_fast',
    hasBox: false,
    hasReceipt: false,
    hasVisibleFlaws: false,
  });

  if (shoe.price_php > estimate.fastSalePrice) return null;
  return { fastSalePrice: estimate.fastSalePrice };
}
