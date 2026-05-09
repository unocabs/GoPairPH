export type ListingType = 'for_sale' | 'donate';
export type Condition = 'new' | 'like_new' | 'good' | 'fair';
export type ViewType = 'top' | 'sole' | 'front' | 'left' | 'right' | 'back';
export type ListingStatus = 'active' | 'reserved' | 'sold' | 'donated' | 'archived';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  location: string | null;
  avatar_url: string | null;
  fb_username: string | null;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  user_id: string;
  proof: string;
  status: VerificationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: Profile; // requesting user
}

export interface ShoeImage {
  id: string;
  shoe_id: string;
  storage_path: string;
  view_type: ViewType;
  order: number;
  created_at: string;
}

export type ShopStatus = 'active' | 'suspended';

export interface Shop {
  id: string;
  slug: string;
  name: string;
  owner_profile_id: string;
  logo_storage_path: string | null;
  about: string | null;
  location: string | null;
  fb_page_url: string | null;
  status: ShopStatus;
  created_at: string;
  updated_at: string;
}

export interface ShoeVariant {
  id: string;
  shoe_id: string;
  size_eu: number;
  size_us: number | null;
  size_cm: number | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Shoe {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  size_eu: number | null;
  size_us: number | null;
  size_cm: number | null;
  color: string;
  condition: Condition;
  mileage_km: number | null;
  listing_type: ListingType;
  price_php: number | null;
  is_negotiable: boolean;
  description: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  shoe_images?: ShoeImage[];
  is_featured: boolean;
  featured_until: string | null;
  sponsored_until: string | null;
  sponsored_started_at: string | null;
  shop_id: string | null;
  quantity: number;
  listed_in_main_feed: boolean;
  has_stock: boolean;
  shops?: Shop | null;
  shoe_variants?: ShoeVariant[];
}

export type PurchaseRequestStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface PurchaseRequest {
  id: string;
  listing_id: string;
  buyer_id: string;
  message: string | null;
  offer_price_php: number | null;
  status: PurchaseRequestStatus;
  created_at: string;
  variant_id: string | null;
  profiles?: Profile; // buyer
  listing?: Shoe;
  shoe_variants?: ShoeVariant | null;
}

export interface WishlistImage {
  id: string;
  wishlist_id: string;
  storage_path: string;
  order: number;
  created_at: string;
}

export interface WishlistSuggestion {
  id: string;
  wishlist_id: string;
  shoe_id: string;
  suggester_id: string;
  message: string | null;
  created_at: string;
  shoes?: Shoe;
  profiles?: Profile; // suggester
}

export interface WishlistItem {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  color: string | null;
  size_eu: number | null;
  size_us: number | null;
  size_cm: number | null;
  price_min_php: number | null;
  price_max_php: number | null;
  description: string | null;
  created_at: string;
  profiles?: Profile;
  wishlist_images?: WishlistImage[];
  wishlist_suggestions?: { count: number }[]; // aggregate count from join
}
