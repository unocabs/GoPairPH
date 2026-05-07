'use client';

import { useState } from 'react';

interface ContactSellerButtonsProps {
  fbUsername?: string | null;
  listingId: string;
  isOwner?: boolean;
}

export function ContactSellerButtons({ fbUsername, listingId, isOwner = false }: ContactSellerButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/listings/${listingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  const copyLabel = isOwner ? 'Promote Listing' : 'Copy & Share Link';
  const copiedToast = isOwner
    ? '✅ Listing link copied! Share it on Facebook groups or Marketplace.'
    : '✅ Listing link copied!';

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          {copyLabel}
        </button>
        {fbUsername && (
          <a
            href={`https://m.me/${fbUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
            </svg>
            Message on Messenger
          </a>
        )}
      </div>
      {copied && (
        <p className="rounded-lg bg-green-950 border border-green-800 px-3 py-2 text-xs text-green-300">
          {copiedToast}
        </p>
      )}
    </div>
  );
}
