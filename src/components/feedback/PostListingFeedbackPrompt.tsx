'use client';

import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CATEGORIES = [
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'missing_feature', label: 'Missing feature' },
  { value: 'bug', label: 'Bug' },
] as const;

interface PostListingFeedbackPromptProps {
  listingId?: string;
  initialContactEmail?: string | null;
  title?: string;
  body?: string;
  successBody?: string;
  buttonLabel?: string;
  className?: string;
  compact?: boolean;
  inline?: boolean;
}

export function PostListingFeedbackPrompt({
  listingId,
  initialContactEmail = null,
  title = 'How was listing your shoes?',
  body = 'Was anything confusing or missing? Help improve Go Pair PH.',
  successBody = 'Thanks. This helps make Go Pair PH easier for the next seller.',
  buttonLabel = 'Send feedback',
  className = '',
  compact = false,
  inline = false,
}: PostListingFeedbackPromptProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('suggestion');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please add a short note.');
      return;
    }
    if (trimmed.length > 800) {
      setError('Please keep feedback under 800 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: trimmed,
          contact_email: contactEmail.trim() || null,
          listing_id: listingId ?? null,
          page_path: window.location.pathname + window.location.search,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? 'Could not send feedback');
      }
      setSubmitted(true);
      setOpen(false);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={inline ? className : 'rounded-xl border border-white/[0.08] bg-slate-950/45 p-3'}>
        <div className={inline ? 'flex flex-row items-center gap-2' : `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
          <div className="min-w-0">
            <p className={inline ? 'text-xs font-normal leading-snug text-gray-400' : 'text-sm font-semibold text-gray-100'}>
              {submitted ? 'Feedback sent' : title}
            </p>
            {!compact && (
              <p className="mt-1 text-xs leading-5 text-gray-400">
                {submitted ? successBody : body}
              </p>
            )}
            {compact && submitted && (
              <p className="mt-1 text-xs leading-5 text-gray-400">
                {successBody}
              </p>
            )}
          </div>
          {!submitted && (
            <Button
              type="button"
              size="sm"
              variant={inline ? 'ghost' : 'outline'}
              onClick={() => setOpen(true)}
              className={inline ? 'h-auto shrink-0 px-0 py-0 text-xs font-normal text-teal-300 hover:bg-transparent hover:text-teal-200' : 'shrink-0'}
            >
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>

      {open && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-4">
              <div>
                <h2 className="text-base font-bold text-gray-100">Send feedback</h2>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Tell us what felt confusing or what you expected to see.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
                aria-label="Close feedback"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitFeedback} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as typeof category)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {CATEGORIES.map(option => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="feedback-message" className="mb-1 block text-sm font-medium text-gray-300">
                  Feedback <span className="text-teal-400">*</span>
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={800}
                  rows={5}
                  placeholder="What was confusing, missing, or worth improving?"
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <p className="mt-1 text-right text-[11px] text-gray-500">{message.length}/800</p>
              </div>

              <Input
                label="Email or contact"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="Optional"
                hint="Optional, in case we need to ask a follow-up."
              />

              {error && (
                <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
