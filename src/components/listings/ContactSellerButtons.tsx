'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SharePostModal } from './SharePostModal';
import { getListingPath } from '@/lib/utils';
import type { Shoe, Profile } from '@/types';

const FB_GROUP_URL = 'https://www.facebook.com/groups/gopairph';
const FB_PROMPT_DISMISSED_KEY = 'gopairph.fbSharePrompt.dismissed';
const FB_PROMPT_SHOWN_PREFIX = 'gopairph.fbSharePrompt.shown.';

interface ContactSellerButtonsProps {
  fbUsername?: string | null;
  listingId: string;
  listingSlug?: string | null;
  isOwner?: boolean;
  /** When provided, enables the "Create Share Post" button which opens a downloadable share-card modal. */
  shoe?: Shoe;
  seller?: Profile | null;
}

export function ContactSellerButtons({ fbUsername, listingId, listingSlug, isOwner = false, shoe, seller }: ContactSellerButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fbPromptOpen, setFbPromptOpen] = useState(false);
  const listingPath = shoe ? getListingPath(shoe) : getListingPath({ id: listingId, slug: listingSlug });

  function shouldShowFbPrompt() {
    if (!isOwner || typeof window === 'undefined') return false;
    if (window.sessionStorage.getItem(FB_PROMPT_DISMISSED_KEY) === '1') return false;
    if (window.sessionStorage.getItem(`${FB_PROMPT_SHOWN_PREFIX}${listingId}`) === '1') return false;
    return true;
  }

  function openFbPrompt() {
    if (!shouldShowFbPrompt()) return;
    window.sessionStorage.setItem(`${FB_PROMPT_SHOWN_PREFIX}${listingId}`, '1');
    setFbPromptOpen(true);
  }

  function dismissFbPrompt() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(FB_PROMPT_DISMISSED_KEY, '1');
    }
    setFbPromptOpen(false);
  }

  function closeShareModal() {
    setShareOpen(false);
    openFbPrompt();
  }

  async function handleCopy() {
    const url = `${window.location.origin}${listingPath}`;
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
    openFbPrompt();
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
        <SharePostModal
          shoe={shoe}
          seller={seller ?? null}
          onClose={closeShareModal}
          onDownloaded={closeShareModal}
        />,
        document.body,
      )}

      {fbPromptOpen && typeof window !== 'undefined' && createPortal(
        <FacebookGroupPrompt
          onClose={dismissFbPrompt}
          onVisit={() => {
            dismissFbPrompt();
            window.open(FB_GROUP_URL, '_blank', 'noopener,noreferrer');
          }}
        />,
        document.body,
      )}
    </div>
  );
}

function FacebookGroupPrompt({ onClose, onVisit }: { onClose: () => void; onVisit: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl border border-white/[0.08] bg-slate-950 p-5 shadow-[0_-18px_70px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-700 sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Next step</p>
            <h2 className="mt-1 text-lg font-bold text-gray-100">Share it with Pampanga runners</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Your listing is ready. Post it in the Go Pair PH Facebook group so local runners can discover it faster.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={onVisit}
            className="inline-flex w-full items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
          >
            Share to FB Group
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 sm:w-auto"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
