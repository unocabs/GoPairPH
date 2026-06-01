'use client';

import { useEffect, useMemo, useState } from 'react';

const PENDING_SAVED_SEARCH_KEY = 'gopair_pending_saved_search';

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
  const [message, setMessage] = useState<string | null>(null);
  const canSave = trimmedKeyword.length >= 2;
  const normalizedKeyword = trimmedKeyword.toLowerCase();
  const alreadySaved = savedKeywords.has(normalizedKeyword);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage(null);

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
    setMessage(null);
  }, [normalizedKeyword]);

  function redirectToSignIn() {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(PENDING_SAVED_SEARCH_KEY, trimmedKeyword);
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth/sign-in?next=${encodeURIComponent(next)}`;
  }

  async function saveSearch() {
    if (!canSave || saving || alreadySaved) return;

    if (!signedIn) {
      redirectToSignIn();
      return;
    }

    setSaving(true);
    setMessage(null);

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
      setMessage('Saved. We’ll notify you for new matches. ✓');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading || !signedIn || !canSave || alreadySaved || saving) return;

    const pendingKeyword = window.localStorage.getItem(PENDING_SAVED_SEARCH_KEY);
    if (pendingKeyword?.trim().toLowerCase() !== normalizedKeyword) return;

    window.localStorage.removeItem(PENDING_SAVED_SEARCH_KEY);
    void saveSearch();
  // saveSearch intentionally stays outside deps so this only reacts to auth/search state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySaved, canSave, loading, normalizedKeyword, saving, signedIn]);

  if (!canSave || loading) return null;

  if (message) {
    return (
      <span className="inline-flex max-w-full items-center rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[11px] font-semibold text-teal-100">
        {message}
      </span>
    );
  }

  if (alreadySaved) {
    return (
      <span className="inline-flex items-center rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[11px] font-semibold text-teal-100">
        Saved ✓
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={saveSearch}
      disabled={saving}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/[0.08] bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-gray-200 transition-colors hover:border-teal-400/35 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="truncate">Save &quot;{trimmedKeyword}&quot;</span>
      <span aria-hidden="true">{saving ? '...' : '+'}</span>
    </button>
  );
}
