'use client';

import { type CSSProperties, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface AskSellerButtonProps {
  contactUrl: string;
  listingName: string;
  sellerName?: string | null;
  isShop?: boolean;
  className?: string;
  style?: CSSProperties;
}

const QUESTION_PRESETS = [
  'Is this still available?',
  'Can I see more photos?',
  'Any issue with the sole?',
  'Where can you meet?',
  'Is the price negotiable?',
];

export function AskSellerButton({ contactUrl, listingName, sellerName, isShop = false, className, style }: AskSellerButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(QUESTION_PRESETS[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    const question = customMessage.trim() || selectedQuestion;
    return `Hi${sellerName ? ` ${sellerName}` : ''}! I saw your ${listingName} on Go Pair PH. ${question}`;
  }, [customMessage, listingName, selectedQuestion, sellerName]);

  async function handleCopyAndOpen() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open(contactUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={style}
      >
        Ask Seller
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-100">Ask about this pair</h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">{listingName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                aria-label="Close Ask Seller"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                  Pick a quick question
                </p>
                <div className="mt-2 grid gap-2">
                  {QUESTION_PRESETS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => {
                        setSelectedQuestion(question);
                        setCustomMessage('');
                        setCopied(false);
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                        selectedQuestion === question && !customMessage.trim()
                          ? 'border-teal-400/60 bg-teal-400/12 text-teal-100'
                          : 'border-white/[0.08] bg-slate-950/45 text-gray-300 hover:border-teal-400/35',
                      )}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Or write your own
                </span>
                <textarea
                  value={customMessage}
                  onChange={(event) => {
                    setCustomMessage(event.target.value);
                    setCopied(false);
                  }}
                  rows={3}
                  placeholder="e.g. Available pa po? Can meet in Angeles?"
                  className="mt-2 w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </label>

              <div className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Message preview
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-300">{message}</p>
              </div>

              <div className="grid gap-2 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-3 text-xs leading-5 text-gray-300">
                <p className="font-semibold text-teal-100">What happens next</p>
                <p>1. Copy the message and send it to the {isShop ? 'shop' : 'seller'}.</p>
                <p>2. Confirm condition, photos, meetup, delivery, or shipping.</p>
                <p>3. Use Send Offer or Request to Buy when you are ready.</p>
              </div>
            </div>

            <div className="border-t border-gray-800 p-4">
              <button
                type="button"
                onClick={handleCopyAndOpen}
                className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
              >
                {copied ? 'Message copied. Open again' : 'Copy message & open contact'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/[0.1] bg-slate-950/45 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
