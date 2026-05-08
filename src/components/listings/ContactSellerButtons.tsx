'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SharePostModal } from './SharePostModal';
import type { Shoe, Profile } from '@/types';

interface ContactSellerButtonsProps {
  fbUsername?: string | null;
  listingId: string;
  isOwner?: boolean;
  /** When provided, enables the "Create Share Post" button which opens a downloadable share-card modal. */
  shoe?: Shoe;
  seller?: Profile | null;
}

export function ContactSellerButtons({ fbUsername, listingId, isOwner = false, shoe, seller }: ContactSellerButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/listings/${listingId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const copyLabel = isOwner ? 'Share to Facebook & other marketplaces' : 'Copy & Share Link';
  const copiedToast = isOwner
    ? '✅ Listing link copied. You are ready to share your listing!'
    : '✅ Listing link copied!';

  const showShare = !!shoe;

  return (
    <div className="mt-3 space-y-2">
      <div className={showShare ? 'grid grid-cols-2 gap-2' : ''}>
        <button
          onClick={handleCopy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span className="truncate">{copyLabel}</span>
        </button>
        {showShare && (
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">Create Share Post</span>
          </button>
        )}
      </div>

      {fbUsername && (
        <a
          href={`https://m.me/${fbUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
          </svg>
          Message on Messenger
        </a>
      )}

      {copied && (
        <p className="rounded-lg bg-green-950 border border-green-800 px-3 py-2 text-xs text-green-300">
          {copiedToast}
        </p>
      )}

      {shareOpen && shoe && typeof window !== 'undefined' && createPortal(
        <SharePostModal shoe={shoe} seller={seller ?? null} onClose={() => setShareOpen(false)} />,
        document.body,
      )}
    </div>
  );
}
