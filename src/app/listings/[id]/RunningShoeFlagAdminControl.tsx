'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunningShoeFlagAdminControl({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function flag() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/listings/${listingId}/running-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag', note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not flag these shoes.');
      setNote('');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not flag these shoes.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-gray-200">
        Flag as not running shoes
      </summary>
      <p className="mt-1 text-xs leading-5 text-gray-500">
        Use only when these are not running shoes. This lowers discovery priority and lets the owner request a review.
      </p>
      <label className="mt-3 block">
        <span className="text-xs text-gray-300">Reason for flagging</span>
        <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3}
          className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-base text-gray-100 focus:border-teal-400 focus:outline-none"
          placeholder="Explain why these are not running shoes." />
      </label>
      <button type="button" disabled={busy || note.trim().length < 5} onClick={flag}
        className="mt-3 min-h-11 rounded-lg border border-amber-300/45 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50">
        {busy ? 'Flagging…' : 'Flag as not running shoes'}
      </button>
      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    </details>
  );
}
