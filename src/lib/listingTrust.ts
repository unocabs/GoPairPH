import type { Profile, Shoe } from '@/types';
import { buildMessengerUrl, getFacebookContactUrl } from '@/lib/facebook';
import { formatProfileLocation } from '@/lib/utils';

export type ListingTrustSignalKey =
  | 'photos_complete'
  | 'location_added'
  | 'messenger_ready'
  | 'verified_seller'
  | 'checked_by_gopair';

export interface ListingTrustSignal {
  key: ListingTrustSignalKey;
  label: string;
  shortLabel: string;
  description: string;
  tone: 'teal' | 'blue' | 'slate';
}

export interface ListingCompletenessItem {
  key: string;
  label: string;
  complete: boolean;
}

export function hasTopPhoto(shoe: Pick<Shoe, 'shoe_images'>): boolean {
  return shoe.shoe_images?.some(image => image.view_type === 'top') ?? false;
}

export function hasSolePhoto(shoe: Pick<Shoe, 'shoe_images'>): boolean {
  return shoe.shoe_images?.some(image => image.view_type === 'sole') ?? false;
}

export function getSellerLocationLabel(shoe: Pick<Shoe, 'shops' | 'profiles'>): string {
  return shoe.shops?.location?.trim() || formatProfileLocation(shoe.profiles);
}

export function getSellerContactUrl(shoe: Pick<Shoe, 'shops' | 'profiles'>): string | null {
  return getFacebookContactUrl(shoe.shops?.fb_page_url ?? null) ?? buildMessengerUrl(shoe.profiles?.fb_username ?? null);
}

export function getListingCompletenessItems(shoe: Shoe): ListingCompletenessItem[] {
  const isShop = !!shoe.shop_id;
  const hasSize = isShop && shoe.inventory_mode === 'multi'
    ? (shoe.shoe_variants ?? []).some(variant => variant.quantity > 0)
    : Boolean(shoe.size_eu || shoe.size_us || shoe.size_cm);

  return [
    { key: 'top_photo', label: 'Top photo', complete: hasTopPhoto(shoe) },
    { key: 'sole_photo', label: 'Sole photo', complete: hasSolePhoto(shoe) },
    { key: 'size', label: isShop && shoe.inventory_mode === 'multi' ? 'Available size' : 'Size', complete: hasSize },
    { key: 'condition', label: 'Condition', complete: Boolean(shoe.condition) },
    { key: 'mileage', label: 'Mileage or Not Tracked', complete: shoe.mileage_km != null },
    { key: 'location', label: 'Seller location', complete: Boolean(getSellerLocationLabel(shoe)) },
    { key: 'contact', label: 'Messenger or shop contact', complete: Boolean(getSellerContactUrl(shoe)) },
  ];
}

export function getListingCompletenessScore(shoe: Shoe): { complete: number; total: number; percent: number } {
  const items = getListingCompletenessItems(shoe);
  const complete = items.filter(item => item.complete).length;
  return {
    complete,
    total: items.length,
    percent: Math.round((complete / items.length) * 100),
  };
}

export function getListingTrustSignals(shoe: Shoe): ListingTrustSignal[] {
  const signals: ListingTrustSignal[] = [];

  if (!shoe.shop_id && shoe.profiles?.is_verified) {
    signals.push({
      key: 'verified_seller',
      label: 'Verified seller',
      shortLabel: 'Verified',
      description: 'Seller has a verified Go Pair PH profile.',
      tone: 'teal',
    });
  }

  if (shoe.admin_checked_at) {
    signals.push({
      key: 'checked_by_gopair',
      label: 'Checked by Go Pair PH',
      shortLabel: 'Checked',
      description: 'Basic listing quality was reviewed by Go Pair PH. This is not an authenticity guarantee.',
      tone: 'teal',
    });
  }

  return signals;
}

export function getProfileTrustItems(profile: Profile | null | undefined, completedSales = 0) {
  if (!profile) return [];
  return [
    { key: 'verified', label: 'Verified profile', complete: profile.is_verified },
    { key: 'location', label: 'Location added', complete: Boolean(formatProfileLocation(profile)) },
    { key: 'messenger', label: 'Messenger ready', complete: Boolean(buildMessengerUrl(profile.fb_username)) },
    { key: 'completed_deals', label: 'Completed Go Pair PH deals', complete: completedSales > 0 },
  ];
}
