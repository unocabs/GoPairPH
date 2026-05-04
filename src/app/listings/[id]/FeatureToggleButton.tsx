'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface FeatureToggleButtonProps {
  shoeId: string;
  isFeatured: boolean;
  status: string;
}

/**
 * Admin-only toggle that flips `shoes.is_featured`.
 *
 * Server-side, the partial unique index from migration 008 guarantees only one
 * row may be featured at a time. To swap the spotlight to *this* listing in a
 * single round-trip, we first clear any other featured row, then set this one.
 *
 * Visibility on the page is gated by an admin check in the parent server
 * component — this client component just performs the write.
 */
export function FeatureToggleButton({
  shoeId,
  isFeatured: initial,
  status,
}: FeatureToggleButtonProps) {
  const [featured, setFeatured] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const disabled = pending || (status !== 'active' && !featured);

  async function toggle() {
    setError(null);
    const next = !featured;

    if (next && !confirm('Feature this listing in the home-page hero? It will replace whatever is currently featured.')) {
      return;
    }
    if (!next && !confirm('Remove this listing from the hero spotlight?')) {
      return;
    }

    setFeatured(next); // optimistic
    const supabase = createClient();

    if (next) {
      // Clear any existing featured row first (the partial unique index would
      // otherwise reject the update). Safe even if no row matches.
      const { error: clearErr } = await supabase
        .from('shoes')
        .update({ is_featured: false })
        .eq('is_featured', true);

      if (clearErr) {
        setFeatured(!next);
        setError(clearErr.message);
        return;
      }
    }

    const { data: updated, error: setErr } = await supabase
      .from('shoes')
      .update({ is_featured: next })
      .eq('id', shoeId)
      .select('id');

    if (setErr) {
      setFeatured(!next);
      setError(setErr.message);
      return;
    }

    // RLS will silently filter the row out if the caller isn't allowed.
    // .select() lets us detect that — without it, no error is raised.
    if (!updated || updated.length === 0) {
      setFeatured(!next);
      setError('Update blocked by row-level security. Make sure migration 009 has been applied and your profile has is_admin = true.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={featured}
        title={
          status !== 'active' && !featured
            ? 'Only active listings can be featured'
            : featured
              ? 'Currently featured on the home page'
              : 'Feature on the home page'
        }
        className={
          featured
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-teal-500/50 bg-teal-500/15 px-3 py-2 text-sm font-semibold text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50'
            : 'inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-transparent px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors disabled:opacity-50'
        }
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={featured ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.27 5.82 21l2.36-7.15L2 9.36h7.61z"
          />
        </svg>
        {pending
          ? 'Saving…'
          : featured
            ? 'Featured · Click to unfeature'
            : 'Feature on home page'}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
