'use client';

import { useEffect, useMemo, useState } from 'react';

const PENDING_SAVED_SEARCH_KEY = 'gopair_pending_saved_search';
const SAVE_SEARCH_TIP_DISMISSED_KEY = 'gopair_save_search_tip_dismissed_v1';
const SAVE_SEARCH_TIP_DISMISSED_EVENT = 'gopair:save-search-tip-dismissed';

interface SavedSearchLite {
  id: string;
  keyword: string;
}

interface SaveSearchButtonProps {
  keyword: string;
}

export function SaveSearchButton({ keyword }: SaveSearchButtonProps) {
  const trimmedKeyword = useMemo(() => keyword.trim(), [keyword]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedKeywords, setSavedKeywords] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [showTip, setShowTip] = useState(false);
  const canSave = trimmedKeyword.length >= 2;
  const normalizedKeyword = trimmedKeyword.toLowerCase();
  const alreadySaved = savedKeywords.has(normalizedKeyword);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch('/api/saved-searches')
      .then(async response => {
        if (!active) return;
        if (response.status === 401) {
          setSignedIn(false);
          setSavedKeywords(new Set());
          return;
        }
        if (!response.ok) return;
        const json = await response.json();
        const next = new Set(
          ((json.savedSearches ?? []) as SavedSearchLite[])
            .map(search => search.keyword.trim().toLowerCase())
            .filter(Boolean)
        );
        setSignedIn(true);
        setSavedKeywords(next);
      })
      .catch(() => {
        if (active) setSavedKeywords(new Set());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    setError(null);
    setAnnouncement('');
  }, [normalizedKeyword]);

  useEffect(() => {
    if (typeof window === 'undefined' || loading || !canSave || alreadySaved) return;

    try {
      if (window.localStorage.getItem(SAVE_SEARCH_TIP_DISMISSED_KEY) !== '1') {
        setShowTip(true);
      }
    } catch {
      setShowTip(true);
    }

    const closeTip = () => setShowTip(false);
    window.addEventListener(SAVE_SEARCH_TIP_DISMISSED_EVENT, closeTip);
    return () => window.removeEventListener(SAVE_SEARCH_TIP_DISMISSED_EVENT, closeTip);
  }, [alreadySaved, canSave, loading]);

  function dismissTip() {
    setShowTip(false);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SAVE_SEARCH_TIP_DISMISSED_KEY, '1');
    } catch {
      // The current tooltip still closes when storage is unavailable.
    }
    window.dispatchEvent(new Event(SAVE_SEARCH_TIP_DISMISSED_EVENT));
  }

  function clearResumeHash() {
    if (typeof window === 'undefined' || window.location.hash !== '#save-search') return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }

  function redirectToSignIn() {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(PENDING_SAVED_SEARCH_KEY, trimmedKeyword);
    } catch {
      // Sign-in can continue, but this browser cannot automatically resume.
    }
    dismissTip();
    const next = `${window.location.pathname}${window.location.search}#save-search`;
    window.location.href = `/auth/sign-in?next=${encodeURIComponent(next)}`;
  }

  async function saveSearch() {
    if (!canSave || saving || alreadySaved) return;

    if (!signedIn) {
      redirectToSignIn();
      return;
    }

    dismissTip();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          keyword: trimmedKeyword,
          email_enabled: true,
        }),
      });

      if (response.status === 401) {
        setSignedIn(false);
        redirectToSignIn();
        return;
      }

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? 'Could not save search');
      }

      setSavedKeywords(previous => new Set(previous).add(normalizedKeyword));
      setAnnouncement('Search saved. We’ll email you when a new listing matches it.');
      clearResumeHash();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading || !signedIn || !canSave || saving) return;

    let pendingKeyword: string | null = null;
    try {
      pendingKeyword = window.localStorage.getItem(PENDING_SAVED_SEARCH_KEY);
    } catch {
      return;
    }
    if (pendingKeyword?.trim().toLowerCase() !== normalizedKeyword) return;

    try {
      window.localStorage.removeItem(PENDING_SAVED_SEARCH_KEY);
    } catch {
      // Continue saving even if this browser blocks storage cleanup.
    }
    if (alreadySaved) {
      dismissTip();
      clearResumeHash();
      setAnnouncement('This search is already saved.');
      return;
    }
    void saveSearch();
  // saveSearch intentionally stays outside deps so this only reacts to auth/search state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySaved, canSave, loading, normalizedKeyword, saving, signedIn]);

  if (!canSave || loading) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={saveSearch}
        disabled={saving || alreadySaved}
        aria-label={alreadySaved ? `Search saved for ${trimmedKeyword}` : `Save search for ${trimmedKeyword}`}
        aria-pressed={alreadySaved}
        title={alreadySaved ? 'Search saved' : 'Save search'}
        className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center transition-colors focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-default ${
          alreadySaved
            ? 'text-teal-700'
            : 'text-slate-600 hover:text-slate-950'
        }`}
      >
        {saving ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z" />
          </svg>
        ) : (
          <svg className="h-[18px] w-[18px]" fill={alreadySaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.75L6 21V4.75Z" />
          </svg>
        )}
      </button>

      {showTip && !alreadySaved && (
        <span
          role="dialog"
          aria-label="About saved search alerts"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-sky-400/25 bg-slate-900 p-3 pr-9 text-left text-xs leading-5 text-gray-200 shadow-2xl shadow-black/45"
        >
          Save this search and we&apos;ll email you when a new listing matches it.
          <button
            type="button"
            onClick={dismissTip}
            aria-label="Close saved search tip"
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      )}

      {error && (
        <span role="alert" className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-red-500/25 bg-red-950 px-3 py-2 text-left text-[11px] leading-4 text-red-200 shadow-xl">
          {error}
        </span>
      )}

      <span className="sr-only" aria-live="polite">{announcement}</span>
    </span>
  );
}
