'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { RunningShoeReview } from '@/lib/runningShoeReviews';
import { RunningShoeReviewPanel } from './RunningShoeReviewPanel';

type ReviewRow = RunningShoeReview & { listing: { id: string; slug: string | null; brand: string; model: string } };
export function AdminRunningReviews() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/running-reviews?page=${page}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRows(result.reviews); setTotal(result.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load reviews.'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-4">
    <div><h2 className="text-xl font-bold text-gray-100">Running shoe reviews</h2><p className="mt-1 text-sm text-gray-400">Appeals appear first. Approval restores normal placement without changing separate quality flags.</p></div>
    {error && <p role="alert" className="text-red-300">{error} <button onClick={load} className="underline">Retry</button></p>}
    {loading ? <p role="status" className="text-gray-400">Loading reviews…</p> : rows.length === 0 && !error ? <p className="text-gray-400">No listings awaiting review.</p> : rows.map(row => <article key={`${row.listing_id}-${row.status}-${row.reviewed_at}`}>
      <Link href={`/listings/${row.listing.slug ?? row.listing.id}`} className="mb-2 inline-flex min-h-11 items-center font-semibold text-teal-300">{row.listing.brand} {row.listing.model} →</Link>
      <RunningShoeReviewPanel listingId={row.listing_id} review={row} isAdmin onReviewed={load} />
    </article>)}
    {total > 20 && <div className="flex items-center gap-4 text-gray-300"><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="min-h-11 disabled:opacity-40">Previous</button><span>Page {page} of {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total || loading} onClick={() => setPage(page + 1)} className="min-h-11 disabled:opacity-40">Next</button></div>}
  </div>;
}
