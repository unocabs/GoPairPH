export type PromotionPaymentStatus = 'creating' | 'pending' | 'paid' | 'expired' | 'review' | 'refunded';
export interface PromotionPayment {
  id: string;
  seller_id: string;
  listing_id: string;
  featured_order_id: string | null;
  sponsored_order_id: string | null;
  placement: 'featured' | 'top_pick';
  duration_days: 7 | 30;
  price_php: number;
  coins_used: number;
  amount_minor: number;
  currency: 'PHP';
  provider: 'paymongo' | 'gp_coins';
  livemode: boolean;
  status: PromotionPaymentStatus;
  provider_checkout_id: string | null;
  provider_payment_id: string | null;
  checkout_url: string | null;
  payment_method: string | null;
  expires_at: string;
  paid_at: string | null;
  refunded_amount_minor: number;
  review_note: string | null;
  last_checked_at: string | null;
  notified_at: string | null;
  created_at: string;
  listing?: { id: string; slug: string | null; brand: string; model: string; status: string } | null;
}

export function isAwaitingPayment(payment: Pick<PromotionPayment, 'status' | 'paid_at'>): boolean {
  return !payment.paid_at && ['creating', 'pending', 'review'].includes(payment.status);
}

export function labelPromotionPaymentMethod(payment: Pick<PromotionPayment, 'provider' | 'payment_method'>): string {
  if (payment.provider === 'gp_coins') return 'GP Coins';
  const names: Record<string, string> = { qrph: 'QR Ph', gcash: 'GCash', card: 'Credit / debit card', paymaya: 'Maya' };
  const method = payment.payment_method ? names[payment.payment_method] : null;
  return method ? `${method} via PayMongo` : 'PayMongo checkout';
}
