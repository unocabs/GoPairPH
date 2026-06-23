'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice, formatShortDate } from '@/lib/utils';

interface FeatureToggleButtonProps {
  shoeId: string;
  isFeatured: boolean;
  featuredUntil: string | null;
  status: string;
  sellerIsVerified: boolean;
}

const DURATIONS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

/**
 * Admin-only control that sets `shoes.featured_until`.
 *
 * Migration 012 replaced the boolean `is_featured` with a time-bounded
 * `featured_until`. A trigger keeps `is_featured` in sync. Setting this
 * listing's window to the future automatically un-features whichever row was
 * featured before — if you want to keep both featured (which we don't), the
 * admin would need to extend each window manually.
 */
export function FeatureToggleButton({
  shoeId,
  isFeatured: initial,
  featuredUntil: initialUntil,
  status,
  sellerIsVerified,
}: FeatureToggleButtonProps) {
  const [featured, setFeatured] = useState(initial);
  const [until, setUntil] = useState(initialUntil);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const disabled = pending || (status !== 'active' && !featured);

  async function feature(days: number) {
    setError(null);
    if (!sellerIsVerified && !confirm('This seller is not verified. Continue anyway?')) return;
    if (!confirm(`Feature this listing for ${days} days as an Admin Pick? Paid Featured promotions still take priority.`)) return;

    const response = await fetch('/api/admin/promotions/featured/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: shoeId, durationDays: days }),
    });
    const json = await response.json().catch(() => ({}));

    if (response.status === 409) {
      const paid = json.currentPaid;
      const amount = paid?.price_php != null ? formatPrice(paid.price_php) : 'a paid amount';
      const end = paid?.scheduled_end_at ? formatShortDate(paid.scheduled_end_at) : 'its scheduled end date';
      const replace = confirm(
        `Paid Featured promotion is active\n\nThis seller paid ${amount} for Featured placement until ${end}. Replacing it will end their paid promotion early and require a refund. This action will be recorded.\n\nReplace & Mark for Refund?`,
      );
      if (!replace) return;

      const forcedResponse = await fetch('/api/admin/promotions/featured/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: shoeId,
          durationDays: days,
          forceReplacePaid: true,
          reason: 'Admin replaced a paid Featured promotion from listing controls.',
        }),
      });
      const forcedJson = await forcedResponse.json().catch(() => ({}));
      if (!forcedResponse.ok) {
        setError(forcedJson.error ?? 'Could not feature this listing.');
        return;
      }
      setFeatured(true);
      setUntil(forcedJson.order?.scheduled_end_at ?? null);
      startTransition(() => router.refresh());
      return;
    }

    if (!response.ok) {
      setError(json.error ?? 'Could not feature this listing.');
      return;
    }

    setFeatured(true);
    setUntil(json.order?.scheduled_end_at ?? null);
    startTransition(() => router.refresh());
  }

  async function unfeature() {
    if (!confirm('Remove this listing from the home-page spotlight?')) return;
    setError(null);
    const response = await fetch('/api/admin/promotions/featured/pick', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: shoeId,
        reason: 'Admin removed Featured placement from listing controls.',
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? 'Could not remove Featured placement.');
      return;
    }
    setFeatured(false);
    setUntil(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {featured ? (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={unfeature}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/50 bg-teal-500/15 px-3 py-2 text-sm font-semibold text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.27 5.82 21l2.36-7.15L2 9.36h7.61z" />
            </svg>
            {pending ? 'Saving…' : 'Featured · Click to unfeature'}
          </button>
          {until && (
            <span className="text-[11px] text-teal-400">
              Featured until {formatShortDate(until)}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] text-gray-500 self-center mr-1">Feature for:</span>
          {DURATIONS.map(({ label, days }) => (
            <button
              key={days}
              type="button"
              onClick={() => feature(days)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-transparent px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
