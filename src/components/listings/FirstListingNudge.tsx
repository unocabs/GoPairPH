'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';

const DISMISS_KEY = 'gopairph:first-listing-nudge:dismissed';

// Top banner shown to logged-in users who have never posted a listing.
// One-time nag — dismissal persists in localStorage. Skipped entirely
// once the user has ≥1 listing, so it auto-disappears after their first post.
export function FirstListingNudge() {
  const { user, profile, loading } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (loading || !user || !profile) { setShow(false); return; }
      if (typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1') {
        setShow(false);
        return;
      }
      const supabase = createClient();
      const { count, error } = await supabase
        .from('shoes')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', profile.id);
      if (cancelled) return;
      if (error) { setShow(false); return; }
      setShow((count ?? 0) === 0);
    }
    check();
    return () => { cancelled = true; };
  }, [user, profile, loading]);

  function handleDismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode etc — fall through */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4 shadow-[0_10px_40px_rgba(20,184,166,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none" aria-hidden>👟</span>
          <div className="text-sm">
            <p className="font-semibold text-gray-100">Got a pair to sell?</p>
            <p className="text-gray-400">Create one clean listing, then share the same link to Facebook, Messenger, or running groups.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Link
            href="/listings/new"
            className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/15 transition-colors hover:bg-teal-400"
          >
            Create Listing
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
