'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { trackMarketplaceAction } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface SaveListingButtonProps {
  listingId: string;
  initialSaved: boolean;
  canSave: boolean;
  initialSaveCount?: number;
  variant?: 'icon' | 'button';
  className?: string;
  signInHref?: string;
  sellerId?: string | null;
  onSavedChange?: (listingId: string, saved: boolean) => void;
}

export function SaveListingButton({
  listingId,
  initialSaved,
  canSave,
  initialSaveCount = 0,
  variant = 'icon',
  className,
  signInHref,
  sellerId,
  onSavedChange,
}: SaveListingButtonProps) {
  const { user, profile, loading: sessionLoading } = useSession();
  const [saved, setSaved] = useState(initialSaved);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwnPair = !!sellerId && profile?.id === sellerId;
  const canSaveFromClientSession = !!user && !isOwnPair;
  const effectiveCanSave = canSave || canSaveFromClientSession;
  const shouldLinkToSignIn = !effectiveCanSave && !user && !!signInHref;

  async function handleToggle() {
    if (!effectiveCanSave || loading) return;

    const next = !saved;
    setSaved(next);
    setSaveCount(count => Math.max(0, count + (next ? 1 : -1)));
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
      if (typeof body.saveCount === 'number') {
        setSaveCount(Math.max(0, body.saveCount));
      }
      trackMarketplaceAction(confirmedSaved ? 'save_listing' : 'unsave_listing', {
        listing_id: listingId,
        surface: variant,
      });
      onSavedChange?.(listingId, confirmedSaved);
    } catch (err) {
      setSaved(!next);
      setSaveCount(count => Math.max(0, count + (next ? -1 : 1)));
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const label = effectiveCanSave
    ? saved ? 'Saved Pair' : 'Save Pair'
    : user && isOwnPair ? 'Your Pair'
    : 'Sign in to save';
  const countLabel = saveCount > 99 ? '99+' : saveCount.toString();

  if (variant === 'button') {
    if (shouldLinkToSignIn) {
      return (
        <Link
          href={signInHref!}
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
          disabled={!effectiveCanSave || loading || sessionLoading}
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
          {saveCount > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] leading-none text-gray-200">
              {countLabel}
            </span>
          )}
        </button>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  if (shouldLinkToSignIn) {
    return (
      <Link
        href={signInHref!}
        title="Sign in to Save Pair"
        aria-label="Sign in to Save Pair"
        className={cn(
          'flex h-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80',
          saveCount > 0 ? 'min-w-8 px-2' : 'w-8',
          className,
        )}
      >
        <HeartIcon filled={false} />
        {saveCount > 0 && (
          <span className="text-[11px] font-bold leading-none tabular-nums">{countLabel}</span>
        )}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!effectiveCanSave || loading || sessionLoading}
      title={label}
      aria-label={label}
      aria-pressed={saved}
      className={cn(
        'flex h-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-70',
        saveCount > 0 ? 'min-w-8 px-2' : 'w-8',
        saved && 'border-teal-300/50 bg-teal-500/25 text-teal-200',
        className,
      )}
    >
      <HeartIcon filled={saved} />
      {saveCount > 0 && (
        <span className="text-[11px] font-bold leading-none tabular-nums">{countLabel}</span>
      )}
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
