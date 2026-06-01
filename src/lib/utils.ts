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

export function getPublicUrl(
  supabaseUrl: string,
  storagePath: string,
  bucket = 'shoe-images',
  transform?: {
    width?: number;
    height?: number;
    quality?: number;
    resize?: 'cover' | 'contain' | 'fill';
  }
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

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
