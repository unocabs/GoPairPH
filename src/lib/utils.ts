import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CONDITIONS, LISTING_TYPE_LABELS, SIZE_CONVERSIONS_BY_US_TYPE, US_SIZE_PREFIX, type UsSizeType } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null): string {
  if (price === null) return '';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatMileage(mileageKm: number | null | undefined): string {
  return mileageKm != null ? `${mileageKm.toLocaleString()} km` : 'Not Tracked';
}

export function formatCondition(condition: string): string {
  return CONDITIONS[condition] ?? condition;
}

export function formatListingType(type: string): string {
  return LISTING_TYPE_LABELS[type] ?? type;
}

export function normalizeUsSizeType(value?: string | null): UsSizeType {
  if (value === 'mens' || value === 'womens' || value === 'unisex') return value;
  return 'mens';
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function formatUsSize(us: number | null, usSizeType?: string | null): string {
  if (!us) return '';
  const type = normalizeUsSizeType(usSizeType);
  return `${US_SIZE_PREFIX[type]} ${formatNumber(us)}`;
}

export function findSizeConversion(
  field: 'eu' | 'us' | 'cm',
  value: number,
  usSizeType?: string | null
) {
  const type = normalizeUsSizeType(usSizeType);
  const conversions = SIZE_CONVERSIONS_BY_US_TYPE[type];
  return conversions.find(size => size[field] === value);
}

export function formatSize(eu: number | null, us: number | null, cm: number | null, usSizeType?: string | null): string {
  const parts: string[] = [];
  if (eu) parts.push(`EU ${formatNumber(eu)}`);
  if (us) parts.push(formatUsSize(us, usSizeType));
  if (cm) parts.push(`${formatNumber(cm)}cm`);
  return parts.join(' / ');
}

export function formatProfileLocation(profile: {
  location_city?: string | null;
  location_province?: string | null;
  location_region?: string | null;
} | null | undefined): string {
  if (!profile) return '';

  const seen = new Set<string>();
  return [
    profile.location_city,
    profile.location_province,
    profile.location_region,
  ]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

export type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

export const IMAGE_TRANSFORM_PRESETS = {
  listingCard: { width: 420, quality: 54, resize: 'contain' },
  featuredListing: { width: 800, quality: 68, resize: 'contain' },
  detailMain: { width: 1000, quality: 69, resize: 'contain' },
  detailLightbox: { width: 1000, quality: 69, resize: 'contain' },
  detailThumb: { width: 140, quality: 45, resize: 'contain' },
  miniListing: { width: 160, quality: 52, resize: 'contain' },
  purchaseThumb: { width: 140, quality: 52, resize: 'contain' },
  shareHero: { width: 1000, quality: 70, resize: 'contain' },
  shareThumb: { width: 360, quality: 58, resize: 'contain' },
  shopLogo: { width: 160, quality: 60, resize: 'cover' },
  shopHeader: { width: 1000, quality: 68, resize: 'cover' },
  shopCarousel: { width: 720, quality: 64, resize: 'cover' },
} satisfies Record<string, ImageTransformOptions>;

export function getPublicUrl(
  supabaseUrl: string,
  storagePath: string,
  bucket = 'shoe-images',
  transform?: ImageTransformOptions
): string {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');

  if (transform && (transform.width || transform.height || transform.quality)) {
    const params = new URLSearchParams();
    if (transform.width) params.set('width', String(transform.width));
    if (transform.height) params.set('height', String(transform.height));
    if (transform.quality) params.set('quality', String(transform.quality));
    params.set('resize', transform.resize ?? 'contain');
    return `${supabaseUrl}/storage/v1/render/image/public/${encodeURIComponent(bucket)}/${encodedPath}?${params.toString()}`;
  }

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export function formatListingName(brand: string, model: string): string {
  return brand === 'Other' ? model : `${brand} ${model}`;
}

export function getListingPath(listing: { id: string; slug?: string | null }): string {
  return `/listings/${listing.slug || listing.id}`;
}

export function getAbsoluteListingUrl(siteUrl: string, listing: { id: string; slug?: string | null }): string {
  return `${siteUrl}${getListingPath(listing)}`;
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const formatAgo = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'} ago`;

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return formatAgo(diffDays, 'day');
  if (diffDays < 30) return formatAgo(Math.floor(diffDays / 7), 'week');
  if (diffDays < 365) return formatAgo(Math.floor(diffDays / 30), 'month');
  return formatAgo(Math.floor(diffDays / 365), 'year');
}

export function getListingFreshnessDate(listing: { created_at: string; renewed_at?: string | null }): string {
  return listing.renewed_at ?? listing.created_at;
}

export function formatListingFreshness(listing: { created_at: string; renewed_at?: string | null }): string {
  const relative = formatRelativeDate(getListingFreshnessDate(listing));
  return listing.renewed_at ? `Checked ${relative.toLowerCase()}` : relative;
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
