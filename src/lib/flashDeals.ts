export const FLASH_DEAL_COINS = 20;
export const FLASH_DEAL_HOURS = 24;
export const FLASH_DEAL_COOLDOWN_DAYS = 7;
export const FLASH_DEAL_MIN_DISCOUNT = 0.1;

export interface FlashDealPrice {
  price_php: number | null;
  status?: string;
  has_stock?: boolean;
  flash_deal_id?: string | null;
  flash_deal_price_php?: number | null;
  flash_deal_original_price_php?: number | null;
  flash_deal_starts_at?: string | null;
  flash_deal_ends_at?: string | null;
  flash_deal_regular_price_php?: number | null;
}

export function isFlashDealLive(shoe: FlashDealPrice, now = Date.now()): boolean {
  const original = Number(shoe.flash_deal_original_price_php);
  const sale = Number(shoe.flash_deal_price_php);
  return Boolean(shoe.flash_deal_id && shoe.flash_deal_starts_at && shoe.flash_deal_ends_at
    && (!shoe.status || shoe.status === 'active') && shoe.has_stock !== false
    && Date.parse(shoe.flash_deal_starts_at) <= now && Date.parse(shoe.flash_deal_ends_at) > now
    && sale > 0 && original > sale);
}

// Keep the regular database price intact. Expiry needs no cron and never
// overwrites an edit. This projection is also used by the offer RPC in SQL.
export function withFlashDealPrice<T extends FlashDealPrice>(shoe: T, now = Date.now()): T {
  if (!shoe.flash_deal_id) return shoe;
  const regular = shoe.flash_deal_regular_price_php ?? shoe.price_php;
  return { ...shoe, flash_deal_regular_price_php: regular,
    price_php: isFlashDealLive(shoe, now) ? Number(shoe.flash_deal_price_php) : regular };
}

export function flashDealTimeLeft(endsAt: string, now = Date.now()): string {
  const minutes = Math.ceil((Date.parse(endsAt) - now) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Deal ended';
  if (minutes < 60) return `Ends in ${minutes}m`;
  return `Ends in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function maxFlashDealPrice(referencePrice: number): number {
  return Math.floor(referencePrice * (1 - FLASH_DEAL_MIN_DISCOUNT) * 100) / 100;
}

export const COIN_PACKS = [
  { coins: 40, pricePhp: 20 },
  { coins: 100, pricePhp: 50 },
  { coins: 200, pricePhp: 100 },
] as const;

export function coinReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 500 || /[\\\r\n]/.test(value)) return '/profile';
  try {
    const url = new URL(value, 'https://gopairph.com');
    if (url.origin !== 'https://gopairph.com' || !['/profile', '/flash-deals/new'].includes(url.pathname)) return '/profile';
    const params = new URLSearchParams();
    const listing = url.searchParams.get('listing');
    const sale = url.searchParams.get('sale');
    if (listing && /^[a-f0-9-]{36}$/i.test(listing)) params.set('listing', listing);
    if (sale && /^\d{1,8}(\.\d{1,2})?$/.test(sale)) params.set('sale', sale);
    return `${url.pathname}${params.size ? `?${params}` : ''}`;
  } catch { return '/profile'; }
}
