'use client';

import { useEffect, useState } from 'react';
import { FEEDBACK_CATEGORY_LABELS, PRICE_FEEDBACK_REASONS, feedbackComment, type ProductFeedback, type FeedbackOverview, type FeedbackStatus } from '@/lib/feedback';
import { Button } from '@/components/ui/Button';
import { PriceFeedbackReview } from './PriceFeedbackReview';

type FeedbackPage = { feedback: ProductFeedback[]; total: number; overview: FeedbackOverview };
const selectClass = 'min-h-11 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200';
export function AdminFeedbackPanel() {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<FeedbackPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(null);
    fetch(`/api/admin/feedback?${new URLSearchParams({ category, status, page: String(page) })}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Could not load feedback.'); return body as FeedbackPage; })
      .then(setResult).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load feedback.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, status, page, revision]);

  async function review(id: string, next: FeedbackStatus) {
    setBusy(id); setError('');
    try {
      const response = await fetch('/api/admin/feedback', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: next }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not update feedback.');
      setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update feedback.'); }
    finally { setBusy(null); }
  }

  return <section className="space-y-4" aria-label="Product feedback">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold text-gray-100">App &amp; price feedback</h2><p className="mt-1 text-sm text-gray-400">User opinions help review the guide. Suggested prices are not confirmed sales.</p></div>
      <Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh</Button>
    </div>
    {result && <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([['All feedback', result.overview.total], ['Needs review', result.overview.new], ['Too low', result.overview.too_low], ['Too high', result.overview.too_high]] as const)
          .map(([label, count]) => <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold text-gray-100">{count}</p></div>)}
      </div>
      {result.overview.models.length > 0 && <details className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-200">Price feedback by shoe and condition · top 20 groups</summary>
        <p className="mt-2 text-xs text-gray-400">All-time counts; repeated opinions are not independent sale evidence.</p>
        <ul className="mt-3 divide-y divide-gray-800">{result.overview.models.map(model => <li key={`${model.brand}/${model.model}/${model.condition}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
          <span className="min-w-0 break-words text-gray-200">{model.brand} {model.model} · {model.condition.replaceAll('_', ' ')}</span>
          <span className="text-xs text-gray-400">{model.total} total · {model.too_low} too low · {model.too_high} too high</span>
        </li>)}</ul>
      </details>}
    </>}
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-xs text-gray-400">Category<select className={selectClass} value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="all">All categories</option>{Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs text-gray-400">Status<select className={selectClass} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="closed">Closed</option></select></label>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-500/30 p-3 text-sm text-red-200">{error}</p>}
    {loading && <p role="status" className="text-sm text-gray-400">Loading feedback…</p>}
    {result && <>
      <p className="text-xs text-gray-400">{result.total} matching submissions · page {page} of {Math.max(1, Math.ceil(result.total / 30))}. Summary counts above cover all feedback.</p>
      {result.feedback.length === 0 && <p className="rounded-xl border border-dashed border-gray-800 p-8 text-center text-sm text-gray-400">No feedback matches these filters.</p>}
      {result.feedback.map(row => <article key={row.id} className="space-y-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold text-gray-100">{FEEDBACK_CATEGORY_LABELS[row.category]} {row.price_reason ? `· ${PRICE_FEEDBACK_REASONS[row.price_reason]}` : ''}</p><p className="text-xs text-gray-400">{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(row.created_at))}</p></div>
        {row.estimator_snapshot && <PriceFeedbackReview snapshot={row.estimator_snapshot} suggestedPrice={row.suggested_price_php} />}
        <div className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
          <p className="mb-1 text-xs font-semibold text-gray-400">{row.estimator_snapshot ? 'User comment' : 'Feedback message'}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-200">{row.estimator_snapshot ? feedbackComment(row.message, row.price_reason) : row.message}</p>
        </div>
        {row.listing_id && <a href={`/listings/${row.listing_id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">Open attached listing →</a>}
        <p className="break-words text-xs text-gray-400">{row.contact_email ?? 'No contact email'} · {row.page_path} · Email: {row.email_status === 'legacy' ? 'historical delivery not tracked' : row.email_status}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs capitalize text-gray-400">{row.status}</span>
          {(['new', 'reviewed', 'closed'] as const).filter(next => next !== row.status).map(next => <Button key={next} size="sm" variant="outline" disabled={busy !== null} onClick={() => review(row.id, next)}>{busy === row.id ? 'Saving…' : next === 'new' ? 'Reopen' : next === 'reviewed' ? 'Mark reviewed' : 'Close'}</Button>)}
        </div>
      </article>)}
      <div className="flex justify-between gap-3"><Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" disabled={page * 30 >= result.total || loading} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </>}
  </section>;
}
