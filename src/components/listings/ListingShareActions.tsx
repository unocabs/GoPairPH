'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SharePostModal } from './SharePostModal';
import { getListingPath } from '@/lib/utils';
import { buildListingCaption } from '@/lib/listingShare';
import { trackMarketplaceAction } from '@/lib/analytics';
import { recordListingShareMetric } from '@/lib/shareMetrics';
import type { Shoe, Profile } from '@/types';

const FB_GROUP_URL = 'https://www.facebook.com/groups/gopairph';

interface ListingShareActionsProps {
  shoe: Shoe;
  seller?: Profile | null;
  isOwner?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

interface ShareCampaignSummary {
  started_at: string;
  expires_at: string;
  attributed_views: number;
}

export function ListingShareActions({ shoe, seller, isOwner = false, defaultOpen = false, className = '' }: ListingShareActionsProps) {
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(defaultOpen);
  const [campaign, setCampaign] = useState<ShareCampaignSummary | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [copyPending, setCopyPending] = useState(false);
  const [trackingWarning, setTrackingWarning] = useState<string | null>(null);
  const postPublishPromptTrackedRef = useRef(false);
  const listingPath = getListingPath(shoe);

  useEffect(() => {
    if (!defaultOpen || !isOwner || postPublishPromptTrackedRef.current) return;

    postPublishPromptTrackedRef.current = true;
    trackMarketplaceAction('post_publish_share_prompt_view', {
      listing_id: shoe.id,
      listing_type: shoe.listing_type,
      surface: 'listing_detail_post_publish',
    });
  }, [defaultOpen, isOwner, shoe.id, shoe.listing_type]);

  async function loadShareResults() {
    if (!isOwner) return;
    setResultsLoading(true);
    try {
      const response = await fetch(`/api/listing-share-campaigns?listing_id=${encodeURIComponent(shoe.id)}`);
      if (!response.ok) throw new Error('Could not load share results');
      const json = await response.json();
      setCampaign(json.campaign ?? null);
    } catch {
      setTrackingWarning('Share results are temporarily unavailable.');
    } finally {
      setResultsLoading(false);
    }
  }

  useEffect(() => {
    if (!kitOpen || !isOwner) return;
    void loadShareResults();
    // Refresh whenever the owner reopens this listing's Share Post Kit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, kitOpen, shoe.id]);

  useEffect(() => {
    if (!campaign) return;
    const remainingMs = new Date(campaign.expires_at).getTime() - Date.now();
    if (remainingMs <= 0) {
      setCampaign(null);
      return;
    }
    const timeout = window.setTimeout(() => setCampaign(null), remainingMs);
    return () => window.clearTimeout(timeout);
  }, [campaign]);

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
    if (copyPending) return;
    setCopyPending(true);
    setTrackingWarning(null);
    let url = `${window.location.origin}${listingPath}`;
    let trackingStarted = false;

    if (isOwner) {
      try {
        const response = await fetch('/api/listing-share-campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id: shoe.id }),
        });
        const json = await response.json();
        if (!response.ok || !json.campaign?.tracked_path) {
          throw new Error(json.error ?? 'Could not start share tracking');
        }
        url = `${window.location.origin}${json.campaign.tracked_path}`;
        setCampaign({
          started_at: json.campaign.started_at,
          expires_at: json.campaign.expires_at,
          attributed_views: Number(json.campaign.attributed_views ?? 0),
        });
        trackingStarted = true;
      } catch {
        setTrackingWarning('Caption copied with the regular listing link. Share results are unavailable this time.');
      }
    }

    try {
      await copyText(
        buildListingCaption(shoe, url),
        isOwner
          ? trackingStarted
            ? 'FB caption copied. Share results will track visits from this link for 7 days.'
            : 'FB caption copied. Paste it with your listing image.'
          : 'Caption copied.'
      );
      trackMarketplaceAction('copy_share_caption', {
        listing_id: shoe.id,
        surface: 'listing_detail_share_kit',
        is_owner: isOwner,
        tracking_started: trackingStarted,
      });
      if (isOwner) void recordListingShareMetric(shoe.id, 'caption_copy');
    } finally {
      setCopyPending(false);
    }
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
        className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-blue-400/45 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        <span className="inline-flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Post This on Facebook
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-blue-100 transition-transform ${kitOpen ? 'rotate-180' : ''}`}
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
            disabled={copyPending}
            className="flex min-h-[4.25rem] w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left text-sm text-gray-200 transition-colors hover:bg-slate-900 disabled:cursor-wait disabled:opacity-70"
          >
            <StepIcon type="caption" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Copy FB Caption</span>
              <span className="block truncate text-xs text-gray-500">{copyPending ? 'Preparing your tracked link…' : 'Paste this into your Facebook post.'}</span>
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
              <span className="block font-semibold">Download Image</span>
              <span className="block truncate text-xs text-gray-500">Use this with your FB post.</span>
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
              <span className="block truncate text-xs text-gray-500">Post where runners already are.</span>
            </span>
            <StepNumber>3</StepNumber>
          </a>

          {isOwner && (campaign || resultsLoading) && (
            <ShareResults
              campaign={campaign}
              loading={resultsLoading}
              onRefresh={loadShareResults}
            />
          )}
        </div>
      )}

      {copiedMessage && (
        <p className="rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-xs text-green-300">
          {copiedMessage}
        </p>
      )}

      {trackingWarning && (
        <p className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-200">
          {trackingWarning}
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

function ShareResults({
  campaign,
  loading,
  onRefresh,
}: {
  campaign: ShareCampaignSummary | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  if (!campaign && loading) {
    return (
      <div className="border-t border-white/[0.06] px-3 py-3" aria-live="polite">
        <p className="text-xs font-semibold text-gray-300">Share results</p>
        <p className="mt-1 text-xs text-gray-500">Loading…</p>
      </div>
    );
  }
  if (!campaign) return null;

  const started = new Date(campaign.started_at);
  const expires = new Date(campaign.expires_at);
  const remainingDays = Math.max(1, Math.ceil((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const startedLabel = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(started);
  const viewLabel = campaign.attributed_views === 1 ? 'view' : 'views';

  return (
    <div className="border-t border-white/[0.06] bg-teal-500/[0.05] px-3 py-3" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-teal-200">Share results</p>
          <p className="mt-1 text-sm font-bold text-gray-100">
            {campaign.attributed_views > 0
              ? `${campaign.attributed_views.toLocaleString()} ${viewLabel} from your shared link`
              : 'No views yet'}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            Started {startedLabel} · {remainingDays} {remainingDays === 1 ? 'day' : 'days'} left
          </p>
          <p className="mt-1 text-[11px] leading-4 text-gray-600">
            Copying the caption again starts a new result.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="shrink-0 rounded-md border border-white/[0.08] px-2 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-teal-400/30 hover:text-teal-200 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
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
