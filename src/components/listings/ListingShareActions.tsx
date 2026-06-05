'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SharePostModal } from './SharePostModal';
import { getListingPath } from '@/lib/utils';
import { buildListingCaption } from '@/lib/listingShare';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { Shoe, Profile } from '@/types';

const FB_GROUP_URL = 'https://www.facebook.com/groups/gopairph';

interface ListingShareActionsProps {
  shoe: Shoe;
  seller?: Profile | null;
  isOwner?: boolean;
  className?: string;
}

export function ListingShareActions({ shoe, seller, isOwner = false, className = '' }: ListingShareActionsProps) {
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const listingPath = getListingPath(shoe);

  function closeShareModal() {
    setShareOpen(false);
  }

  async function copyText(textToCopy: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedMessage(successMessage);
    setTimeout(() => setCopiedMessage(null), 3000);
  }

  async function handleCopyCaption() {
    const url = `${window.location.origin}${listingPath}`;
    await copyText(
      buildListingCaption(shoe, url),
      isOwner ? 'Caption copied. Paste it with your Go Pair PH link so buyers can check the full details.' : 'Caption copied.'
    );
    trackMarketplaceAction('copy_share_caption', {
      listing_id: shoe.id,
      surface: 'listing_detail_share_kit',
      is_owner: isOwner,
    });
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !kitOpen;
          setKitOpen(nextOpen);
          if (nextOpen) {
            trackMarketplaceAction('share_kit_open', {
              listing_id: shoe.id,
              surface: 'listing_detail',
              is_owner: isOwner,
            });
          }
        }}
        aria-expanded={kitOpen}
        className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-100 transition-colors hover:bg-gray-700"
      >
        <span className="inline-flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Share Post Kit
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${kitOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {kitOpen && (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-slate-950/55">
          <button
            type="button"
            onClick={handleCopyCaption}
            className="flex min-h-[4.25rem] w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left text-sm text-gray-200 transition-colors hover:bg-slate-900"
          >
            <StepIcon type="caption" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Copy FB Caption</span>
              <span className="block truncate text-xs text-gray-500">Paste this into your Facebook post.</span>
            </span>
            <StepNumber>1</StepNumber>
          </button>

          <button
            type="button"
            onClick={() => {
              trackMarketplaceAction('share_post_start', {
                listing_id: shoe.id,
                surface: 'listing_detail_share_kit',
              });
              setShareOpen(true);
            }}
            className="flex min-h-[4.25rem] w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left text-sm text-gray-200 transition-colors hover:bg-slate-900"
          >
            <StepIcon type="download" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Share Post</span>
              <span className="block truncate text-xs text-gray-500">Download the listing image.</span>
            </span>
            <StepNumber>2</StepNumber>
          </button>

          <a
            href={FB_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackMarketplaceAction('outbound_click', {
              destination: 'fb_group',
              listing_id: shoe.id,
              surface: 'listing_detail_share_kit',
            })}
            className="flex min-h-[4.25rem] w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-200 transition-colors hover:bg-slate-900"
          >
            <StepIcon type="group" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Share on FB Group</span>
              <span className="block truncate text-xs text-gray-500">Open the Go Pair PH group first.</span>
            </span>
            <StepNumber>3</StepNumber>
          </a>
        </div>
      )}

      {copiedMessage && (
        <p className="rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-xs text-green-300">
          {copiedMessage}
        </p>
      )}

      {shareOpen && typeof window !== 'undefined' && createPortal(
        <SharePostModal
          shoe={shoe}
          seller={seller ?? null}
          onClose={closeShareModal}
          onDownloaded={closeShareModal}
        />,
        document.body,
      )}

    </div>
  );
}

function StepIcon({ type }: { type: 'caption' | 'download' | 'group' }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-[0_8px_24px_rgba(20,184,166,0.18)] ring-1 ring-teal-300/30">
      {type === 'caption' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )}
      {type === 'download' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10m0 0l-4-4m4 4l4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 20h14" />
        </svg>
      )}
      {type === 'group' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a3 3 0 10-6 0 3 3 0 006 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 19a7.5 7.5 0 0115 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8.5a2.5 2.5 0 110 5M6 8.5a2.5 2.5 0 100 5" />
        </svg>
      )}
    </span>
  );
}

function StepNumber({ children }: { children: string }) {
  return (
    <span className="flex h-8 w-6 shrink-0 items-center justify-center text-xs font-bold text-gray-600">
      {children}
    </span>
  );
}
