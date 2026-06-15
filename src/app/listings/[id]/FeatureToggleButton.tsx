'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatShortDate } from '@/lib/utils';

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
    if (!confirm(`Feature this listing for ${days} days? It will replace whatever is currently featured on the home page.`)) return;

    const supabase = createClient();
    const newUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // Clear any existing featured row first.
    const { error: clearErr } = await supabase
      .from('shoes')
      .update({ featured_until: null })
      .gt('featured_until', new Date().toISOString());

    if (clearErr) {
      setError(clearErr.message);
      return;
    }

    const { data: updated, error: setErr } = await supabase
      .from('shoes')
      .update({ featured_until: newUntil })
      .eq('id', shoeId)
      .select('id, featured_until');

    if (setErr) {
      setError(setErr.message);
      return;
    }
    if (!updated || updated.length === 0) {
      setError('Update blocked by row-level security. Make sure your profile has is_admin = true.');
      return;
    }

    setFeatured(true);
    setUntil(updated[0].featured_until ?? newUntil);
    startTransition(() => router.refresh());
  }

  async function unfeature() {
    if (!confirm('Remove this listing from the home-page spotlight?')) return;
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('shoes')
      .update({ featured_until: null })
      .eq('id', shoeId);
    if (err) {
      setError(err.message);
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
