import type { Profile, Shoe, ShoeVariant, UsSizeType } from '@/types';
import { formatSize } from '@/lib/utils';

export type PersonalizationProfile = Pick<
  Profile,
  | 'preferred_size_eu'
  | 'preferred_size_us'
  | 'preferred_size_cm'
  | 'preferred_us_size_type'
  | 'location_city'
  | 'location_province'
  | 'location_region'
  | 'personalized_browse_enabled'
  | 'profile_match_email_enabled'
>;

export type PersonalizationBadges = {
  matchesSize: boolean;
  nearYou: boolean;
};

type SizeLike = {
  size_eu: number | null;
  size_us: number | null;
  size_cm: number | null;
  us_size_type?: UsSizeType | string | null;
};

function clean(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasComparableNumber(a: number | null | undefined, b: number | null | undefined): boolean {
  return a != null && b != null;
}

function inPreferredRange(
  preferred: number | null | undefined,
  listingSize: number | null | undefined,
  toleranceUp = 0.5
): boolean {
  if (preferred == null || listingSize == null) return false;
  const diff = Number(listingSize) - Number(preferred);
  return diff >= -0.01 && diff <= toleranceUp + 0.01;
}

export function hasPreferredSize(profile: PersonalizationProfile | null | undefined): boolean {
  return !!profile && (
    profile.preferred_size_eu != null ||
    profile.preferred_size_us != null ||
    profile.preferred_size_cm != null
  );
}

export function hasPreferredLocation(profile: PersonalizationProfile | null | undefined): boolean {
  return !!profile && !!(
    clean(profile.location_city) ||
    clean(profile.location_province) ||
    clean(profile.location_region)
  );
}

export function getPreferredSizeLabel(profile: PersonalizationProfile | null | undefined): string {
  if (!profile || !hasPreferredSize(profile)) return '';
  return formatSize(
    profile.preferred_size_eu,
    profile.preferred_size_us,
    profile.preferred_size_cm,
    profile.preferred_us_size_type
  );
}

export function profileSizeMatchesRow(profile: PersonalizationProfile | null | undefined, row: SizeLike): boolean {
  if (!profile || !hasPreferredSize(profile)) return false;

  const comparableEu = hasComparableNumber(profile.preferred_size_eu, row.size_eu);
  const comparableUs = hasComparableNumber(profile.preferred_size_us, row.size_us);
  const comparableCm = hasComparableNumber(profile.preferred_size_cm, row.size_cm);
  if (!comparableEu && !comparableUs && !comparableCm) return false;

  const profileUsType = profile.preferred_us_size_type ?? 'mens';
  const rowUsType = row.us_size_type ?? 'unknown';
  const usTypeCompatible =
    !comparableUs ||
    rowUsType === profileUsType ||
    rowUsType === 'unisex' ||
    profileUsType === 'unisex' ||
    rowUsType === 'unknown';

  // US size is the source of truth when available. Older listings can have
  // EU/CM values that were saved before men's/women's US sizing existed.
  if (comparableUs) {
    return usTypeCompatible && inPreferredRange(profile.preferred_size_us, row.size_us);
  }

  // CM is the next best fallback because it maps to foot length more directly.
  if (comparableCm) {
    return inPreferredRange(profile.preferred_size_cm, row.size_cm);
  }

  if (comparableEu) {
    return inPreferredRange(profile.preferred_size_eu, row.size_eu);
  }

  return false;
}

export function listingMatchesPreferredSize(profile: PersonalizationProfile | null | undefined, shoe: Shoe): boolean {
  if (profileSizeMatchesRow(profile, shoe)) return true;
  return (shoe.shoe_variants ?? []).some((variant: ShoeVariant) => variant.quantity > 0 && profileSizeMatchesRow(profile, variant));
}

export function listingLocationScore(profile: PersonalizationProfile | null | undefined, shoe: Shoe): number {
  if (!profile || !hasPreferredLocation(profile)) return 0;
  const haystack = clean([
    shoe.profiles?.location_city,
    shoe.profiles?.location_province,
    shoe.profiles?.location_region,
    shoe.shops?.location,
  ].filter(Boolean).join(' '));

  if (!haystack) return 0;
  if (clean(profile.location_city) && haystack.includes(clean(profile.location_city))) return 3;
  if (clean(profile.location_province) && haystack.includes(clean(profile.location_province))) return 2;
  if (clean(profile.location_region) && haystack.includes(clean(profile.location_region))) return 1;
  return 0;
}

export function getPersonalizationBadges(profile: PersonalizationProfile | null | undefined, shoe: Shoe): PersonalizationBadges {
  const locationScore = listingLocationScore(profile, shoe);
  return {
    matchesSize: listingMatchesPreferredSize(profile, shoe),
    nearYou: locationScore >= 2,
  };
}

export function sortByPersonalization<T extends Shoe>(
  listings: T[],
  profile: PersonalizationProfile | null | undefined
): T[] {
  if (!profile?.personalized_browse_enabled) return listings;
  if (!hasPreferredSize(profile) && !hasPreferredLocation(profile)) return listings;

  return [...listings].sort((a, b) => {
    const score = (shoe: Shoe) => {
      let value = 0;
      if (listingMatchesPreferredSize(profile, shoe)) value += 8;
      value += listingLocationScore(profile, shoe) * 2;
      return value;
    };
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return 0;
  });
}
