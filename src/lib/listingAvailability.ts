import type { Shoe } from '@/types';

type AvailabilityInput = Pick<Shoe, 'status' | 'shop_id' | 'has_stock' | 'inventory_mode' | 'shoe_variants'>;

export function getListingAvailability(shoe: AvailabilityInput) {
  const outOfStock = Boolean(shoe.shop_id) && (
    shoe.has_stock === false ||
    (shoe.inventory_mode === 'multi' && !(shoe.shoe_variants ?? []).some(variant => variant.quantity > 0))
  );
  const closed = ['sold', 'donated', 'archived'].includes(shoe.status);
  // Reserved listings keep their existing request/acceptance UI.
  const unavailable = closed || (shoe.status === 'active' && outOfStock);
  const label = shoe.status === 'sold' ? 'Sold'
    : shoe.status === 'donated' ? 'Claimed'
      : shoe.status === 'archived' ? 'Unavailable'
        : shoe.status === 'reserved' ? 'Reserved'
          : outOfStock ? 'Out of stock' : 'Available';

  return { unavailable, canRequest: shoe.status === 'active' && !outOfStock, label };
}
