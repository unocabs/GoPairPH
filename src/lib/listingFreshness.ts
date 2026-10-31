type ListingFreshness = { created_at: string; renewed_at?: string | null };

export const FRESH_LISTING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getListingFreshnessDate(listing: ListingFreshness): string {
  return listing.renewed_at ?? listing.created_at;
}

export function compareListingFreshness(a: ListingFreshness, b: ListingFreshness): number {
  return Date.parse(getListingFreshnessDate(b)) - Date.parse(getListingFreshnessDate(a));
}

export function isFreshListing(listing: ListingFreshness, now = Date.now()): boolean {
  return now - Date.parse(getListingFreshnessDate(listing)) < FRESH_LISTING_WINDOW_MS;
}
