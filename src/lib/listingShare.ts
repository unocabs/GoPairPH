import { CONDITIONS } from './constants';
import { formatListingName, formatPrice, formatSize } from './utils';
import type { Shoe } from '@/types';

export function buildListingCaption(shoe: Shoe, listingUrl: string): string {
  const listingName = formatListingName(shoe.brand, shoe.model);
  const size = formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm);
  const details = [
    shoe.listing_type === 'for_sale' && shoe.price_php ? `Price: ${formatPrice(shoe.price_php)}` : null,
    size ? `Size: ${size}` : null,
    shoe.condition ? `Condition: ${CONDITIONS[shoe.condition]}` : null,
    shoe.mileage_km != null ? `Mileage: ${shoe.mileage_km.toLocaleString()} km` : null,
  ].filter(Boolean);

  const headline = shoe.listing_type === 'donate'
    ? `Available for donation: ${listingName}`
    : `For sale: ${listingName}`;
  const action = shoe.listing_type === 'donate'
    ? 'Message or send your offer on Go Pair PH:'
    : 'Send your offer on Go Pair PH:';

  return [
    headline,
    ...details,
    '',
    action,
    listingUrl,
  ].join('\n');
}
