import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CONDITIONS, LISTING_TYPE_LABELS } from './constants';

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

export function formatSize(eu: number | null, us: number | null, cm: number | null): string {
  const parts: string[] = [];
  if (eu) parts.push(`EU ${eu}`);
  if (us) parts.push(`US ${us}`);
  if (cm) parts.push(`${cm}cm`);
  return parts.join(' / ');
}

export function getPublicUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/shoe-images/${storagePath}`;
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
