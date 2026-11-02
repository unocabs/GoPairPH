'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RunningShoeReview } from '@/lib/runningShoeReviews';

export function RunningShoeReviewPanel({ listingId, review, isAdmin = false, onReviewed }: {
  listingId: string; review: RunningShoeReview | null; isAdmin?: boolean; onReviewed?: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => { setSent(false); }, [review?.status, review?.reviewed_at]);
  if (!isAdmin && (!review || review.status === 'approved')) return null;

  async function submit(action: 'appeal' | 'flag' | 'approve' | 'keep_flagged') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/listings/${listingId}/running-review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not save the review.');
      setSent(action === 'appeal'); setNote(''); onReviewed?.(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the review.'); }
    finally { setBusy(false); }
  }
  const pending = review?.status === 'appealed' || sent;
  const flagged = review && review.status !== 'approved';
  return (
    <section className="rounded-xl border border-amber-300/20 bg-amber-500/[0.04] p-4 text-sm" aria-label="Private running shoe review">
      <p className="text-xs text-gray-400">{isAdmin ? 'Private admin review' : 'Only you and admins can see this notice'}</p>
      <h2 className="mt-1 font-semibold text-gray-100">{flagged ? 'These may not be running shoes' : review?.status === 'approved' ? 'Approved as running shoes' : 'Running shoe relevance'}</h2>
      {flagged && <p className="mt-2 leading-6 text-gray-300">This listing stays available, but appears after other shoes in marketplace discovery. If these are running shoes, request a review to restore normal placement. New promotions are available after approval.</p>}
      {review?.reason && flagged && <p className="mt-2 text-xs leading-5 text-gray-400">{review.reason}</p>}
      {review?.review_note && <p className="mt-2 whitespace-pre-wrap break-words text-gray-300">Admin note: {review.review_note}</p>}
      {pending && <p role="status" className="mt-3 font-medium text-amber-200">{isAdmin ? 'The owner requested a review. Placement stays lower until you approve.' : 'Appeal submitted. An admin will review your shoes. Placement stays lower until approved.'}</p>}
      {isAdmin && review?.appeal_note && <p className="mt-3 whitespace-pre-wrap break-words text-gray-200">Owner’s appeal: {review.appeal_note}</p>}
      {(isAdmin || !pending) && <>
        <label className="mt-3 block">
          <span className="text-xs text-gray-300">{isAdmin ? 'Review note (required when flagging)' : 'Why are these running shoes? Include a model reference or brand page link.'}</span>
          <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3}
            className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-base text-gray-100 focus:border-teal-400 focus:outline-none"
            placeholder={isAdmin ? 'Explain the decision briefly.' : 'Explain the intended running use and add supporting details.'} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {isAdmin ? <>
            {review?.status !== 'approved' && <button disabled={busy} onClick={() => submit('approve')} className="min-h-11 rounded-lg bg-teal-500 px-4 font-semibold text-gray-950 disabled:opacity-50">Approve as running shoes</button>}
            <button disabled={busy || note.trim().length < 5} onClick={() => submit(review?.status === 'appealed' ? 'keep_flagged' : 'flag')} className="min-h-11 rounded-lg border border-gray-600 px-4 text-gray-200 disabled:opacity-50">{flagged ? 'Keep lower priority' : 'Flag for lower priority'}</button>
          </> : <button disabled={busy || note.trim().length < 20} onClick={() => submit('appeal')} className="min-h-11 rounded-lg border border-teal-500/50 px-4 font-semibold text-teal-200 disabled:opacity-50">{busy ? 'Submitting…' : 'Request admin review'}</button>}
        </div>
      </>}
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
    </section>
  );
}
