import { CONDITIONS } from './constants';
import { formatListingName, formatMileage, formatPrice, formatProfileLocation, formatSize } from './utils';
import type { Shoe } from '@/types';

export const FB_GROUP_URL = 'https://www.facebook.com/groups/gopairph';

export function buildListingCaption(shoe: Shoe, listingUrl: string): string {
  const listingName = formatListingName(shoe.brand, shoe.model);
  const size = formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type);
  const location = shoe.shops?.location ?? formatProfileLocation(shoe.profiles);
  const showSrp = shoe.listing_type === 'for_sale' && shoe.price_php != null && shoe.srp_php != null && shoe.srp_php >= shoe.price_php;
  const details = [
    shoe.listing_type === 'for_sale' && shoe.price_php ? `Price: ${formatPrice(shoe.price_php)}` : null,
    showSrp ? `SRP: ${formatPrice(shoe.srp_php)}` : null,
    size ? `Size: ${size}` : null,
    shoe.condition ? `Condition: ${CONDITIONS[shoe.condition]}` : null,
    `Mileage: ${formatMileage(shoe.mileage_km)}`,
    location ? `Location: ${location}` : null,
  ].filter(Boolean);

  const headline = shoe.listing_type === 'donate'
    ? `Free pair available: ${listingName}`
    : `For sale: ${listingName}`;
  const action = 'Full details + photos:';

  return [
    headline,
    ...details,
    '',
    action,
    listingUrl,
  ].join('\n');
}
