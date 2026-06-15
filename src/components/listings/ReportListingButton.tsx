'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ListingReportReason } from '@/types';

const REPORT_REASONS: Array<{ value: ListingReportReason; label: string }> = [
  { value: 'misleading_photos', label: 'Photos are misleading or unclear' },
  { value: 'suspicious_or_scam', label: 'Looks suspicious or unsafe' },
  { value: 'already_sold', label: 'Already sold or unavailable' },
  { value: 'wrong_price_or_details', label: 'Price, size, or details look wrong' },
  { value: 'seller_unreachable', label: 'Seller is hard to reach' },
  { value: 'duplicate_or_spam', label: 'Duplicate or spam listing' },
  { value: 'other', label: 'Other issue' },
];

interface ReportListingButtonProps {
  listingId: string;
  listingName: string;
}

export function ReportListingButton({ listingId, listingName }: ReportListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ListingReportReason>('misleading_photos');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/listings/${listingId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not send report.');
      setMessage('Thanks. Go Pair PH will review this listing.');
      setNote('');
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2 text-xs font-semibold text-gray-400 transition-colors hover:border-amber-300/25 hover:text-amber-100 sm:w-auto"
      >
        Report listing
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-t-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-100">Report listing</h2>
                <p className="mt-1 truncate text-xs text-gray-500">{listingName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                aria-label="Close report listing"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Reason</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as ListingReportReason)}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-teal-500"
                >
                  {REPORT_REASONS.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Optional note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Add anything that can help the admin review it."
                  className="mt-2 w-full resize-none rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 outline-none focus:border-teal-500"
                />
              </label>

              <p className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3 text-xs leading-5 text-gray-400">
                Reports are private. Buyers will not see that a listing was reported.
              </p>

              {message && <p className="text-sm text-teal-300">{message}</p>}
              {error && <p className="text-sm text-red-300">{error}</p>}
            </div>

            <div className="grid gap-2 border-t border-gray-800 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/[0.1] bg-slate-950/45 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400 disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
