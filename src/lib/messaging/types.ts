import type { PurchaseRequest, Shoe } from '@/types';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sequence: number;
  sender_id: string | null;
  body: string;
  kind: 'text' | 'offer';
  request_id: string | null;
  client_id: string | null;
  created_at: string;
}
export interface ListingSnapshot {
  name: string;
  price_php: number | null;
  thumbnail: string | null;
  slug: string | null;
  listing_type: string;
}
export interface ConversationSummary {
  id: string;
  listing_id: string | null;
  listing_key: string;
  listing_snapshot: ListingSnapshot;
  buyer_id: string;
  seller_id: string;
  last_message: string;
  last_message_at: string;
  last_sequence: number;
  unread: number;
  muted: boolean;
  partner_name: string;
  partner_verified: boolean;
}
export interface ThreadData {
  conversation: {
    id: string;
    listing_id: string | null;
    listing_key: string;
    buyer_id: string;
    seller_id: string;
    listing_snapshot: ListingSnapshot;
    last_sequence: number;
    created_at: string;
    buyer_muted: boolean;
    seller_muted: boolean;
    buyer_archived: boolean;
    seller_archived: boolean;
  };
  partner: { id: string; display_name: string; is_verified: boolean; fb_username: string | null };
  listing: Shoe | null;
  requests: PurchaseRequest[];
  messages: ChatMessage[];
  has_more: boolean;
  blocked: boolean;
  blocked_by_me: boolean;
}
