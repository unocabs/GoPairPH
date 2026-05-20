'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SaveListingButtonProps {
  listingId: string;
  initialSaved: boolean;
  canSave: boolean;
  variant?: 'icon' | 'button';
  className?: string;
  signInHref?: string;
  onSavedChange?: (listingId: string, saved: boolean) => void;
}

export function SaveListingButton({
  listingId,
  initialSaved,
  canSave,
  variant = 'icon',
  className,
  signInHref,
  onSavedChange,
}: SaveListingButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (!canSave || loading) return;

    const next = !saved;
    setSaved(next);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(next ? '/api/saved-listings' : `/api/saved-listings/${listingId}`, {
        method: next ? 'POST' : 'DELETE',
        headers: next ? { 'Content-Type': 'application/json' } : undefined,
        body: next ? JSON.stringify({ listingId }) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? 'Could not update saved pair');

      const confirmedSaved = !!body.saved;
      setSaved(confirmedSaved);
      onSavedChange?.(listingId, confirmedSaved);
    } catch (err) {
      setSaved(!next);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const label = canSave
    ? saved ? 'Saved Pair' : 'Save Pair'
    : 'Sign in to save';

  if (variant === 'button') {
    if (!canSave && signInHref) {
      return (
        <Link
          href={signInHref}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-slate-900 hover:text-gray-100',
            className,
          )}
        >
          <HeartIcon filled={false} />
          Sign in to Save Pair
        </Link>
      );
    }

    return (
      <div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canSave || loading}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            saved
              ? 'border-teal-500/50 bg-teal-500/12 text-teal-300 hover:bg-teal-500/18'
              : 'border-gray-700 bg-slate-950/40 text-gray-300 hover:bg-slate-900 hover:text-gray-100',
            className,
          )}
          aria-pressed={saved}
        >
          <HeartIcon filled={saved} />
          {loading ? 'Saving...' : label}
        </button>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  if (!canSave && signInHref) {
    return (
      <Link
        href={signInHref}
        title="Sign in to Save Pair"
        aria-label="Sign in to Save Pair"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80',
          className,
        )}
      >
        <HeartIcon filled={false} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!canSave || loading}
      title={label}
      aria-label={label}
      aria-pressed={saved}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-70',
        saved && 'border-teal-300/50 bg-teal-500/25 text-teal-200',
        className,
      )}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 1 0-7.5 7.5L12 21l8.8-7.9a5.3 5.3 0 0 0 0-7.5Z"
      />
    </svg>
  );
}
