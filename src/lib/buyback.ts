import type { BuybackOffer, BuybackOfferStatus } from '@/types';

export const BUYBACK_PRE_ACCEPTANCE_CHECKS = [
  ['seller_verified', 'Seller identity and contact are verified.'],
  ['receipt_credible', 'Receipt is legible and credible.'],
  ['receipt_matches', 'Retailer, date, amount, model, SKU, and size are consistent.'],
  ['retail_basis_matches', 'The receipt supports the original price entered on the listing.'],
  ['ownership_proof', 'Seller ownership declaration is present and profile details look consistent.'],
  ['sku_matches', 'Receipt, listed model/SKU when available, colorway, size, and listing match.'],
  ['photos_clear', 'Listing photos clearly show the top, sole, and any visible flaws.'],
  ['photos_original', 'Photos show no suspicious reuse or editing.'],
  ['condition_consistent', 'Condition, mileage, flaws, wear, and structure are consistent.'],
  ['no_open_flags', 'No unresolved reports, flags, or duplicate concerns exist.'],
  ['quote_verified', 'The stored quote and margin calculation are correct.'],
  ['date_available', 'The proposed shipping date works.'],
  ['cash_and_recipient_ready', 'Recipient details and exact COD cash can be prepared.'],
  ['no_accepted_buyer', 'There is no accepted buyer transaction.'],
  ['terms_reviewed', 'Seller acknowledgements and misrepresentation terms were reviewed.'],
] as const;

export const BUYBACK_DELIVERY_CHECKS = [
  ['waybill_matches', 'Waybill, sender, tracking number, and COD amount match.'],
  ['package_recorded', 'Package condition and tamper evidence were recorded.'],
  ['unboxing_saved', 'A continuous unboxing video was saved.'],
  ['contents_match', 'Shoes, receipt, labels, accessories, and listing match.'],
  ['inspection_passed', 'Physical condition and authenticity inspection passed.'],
  ['payment_recorded', 'COD payment amount and delivery time were recorded.'],
  ['inventory_recorded', 'Inventory photos and internal records are complete.'],
] as const;

export const BUYBACK_DECLINE_REASONS = [
  'Shipping date unavailable',
  'Receipt is unclear or incomplete',
  'Authenticity proof is insufficient',
  'Condition needs clarification',
  'Inventory decision',
  'Other',
] as const;

export const BUYBACK_STATUS_LABELS: Record<BuybackOfferStatus, string> = {
  pending: 'Under review',
  accepted: 'Accepted — book J&T COD',
  declined: 'Not accepted',
  cancelled: 'Cancelled',
  expired: 'Expired',
  shipped: 'Shipped',
  delivered: 'Delivered — inspecting',
  completed: 'Completed',
  disputed: 'Needs resolution',
};

export type SellerBuybackOffer = Pick<BuybackOffer,
  | 'id' | 'listing_id' | 'status' | 'attempt_number' | 'proposed_ship_date'
  | 'retail_basis_php' | 'fast_sale_estimate_php' | 'quoted_price_php'
  | 'admin_note' | 'decline_reason' | 'recipient_name' | 'recipient_phone'
  | 'recipient_address' | 'accepted_at' | 'expires_at' | 'tracking_number'
  | 'shipped_at' | 'delivered_at' | 'completed_at' | 'disputed_at' | 'created_at'
>;

export function toSellerBuybackOffer(offer: BuybackOffer): SellerBuybackOffer {
  return {
    id: offer.id,
    listing_id: offer.listing_id,
    status: offer.status,
    attempt_number: offer.attempt_number,
    proposed_ship_date: offer.proposed_ship_date,
    retail_basis_php: offer.retail_basis_php,
    fast_sale_estimate_php: offer.fast_sale_estimate_php,
    quoted_price_php: offer.quoted_price_php,
    admin_note: offer.admin_note,
    decline_reason: offer.decline_reason,
    recipient_name: offer.status === 'accepted' || offer.status === 'shipped' || offer.status === 'delivered' || offer.status === 'completed' || offer.status === 'disputed' ? offer.recipient_name : null,
    recipient_phone: offer.status === 'accepted' || offer.status === 'shipped' || offer.status === 'delivered' || offer.status === 'completed' || offer.status === 'disputed' ? offer.recipient_phone : null,
    recipient_address: offer.status === 'accepted' || offer.status === 'shipped' || offer.status === 'delivered' || offer.status === 'completed' || offer.status === 'disputed' ? offer.recipient_address : null,
    accepted_at: offer.accepted_at,
    expires_at: offer.expires_at,
    tracking_number: offer.tracking_number,
    shipped_at: offer.shipped_at,
    delivered_at: offer.delivered_at,
    completed_at: offer.completed_at,
    disputed_at: offer.disputed_at,
    created_at: offer.created_at,
  };
}
