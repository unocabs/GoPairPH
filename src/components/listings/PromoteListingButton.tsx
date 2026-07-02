'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { PromoteListingModal, UnverifiedNotice } from './PromoteListingModal';
import { PromoteAcknowledgmentModal } from './PromoteAcknowledgmentModal';

interface PromoteListingButtonProps {
  listingId: string;
  listingName: string;
  isVerified: boolean;
  slotsAvailable: boolean;
  nextSlotOpensAt: string | null;
  ownListingAlreadySponsored: boolean;
  ownSponsoredUntil: string | null;
  ownListingAlreadyFeatured: boolean;
  ownFeaturedUntil: string | null;
  gpCoinBalance?: number;
  autoOpenFromSearchParams?: boolean;
}

export function PromoteListingButton({
  listingId,
  listingName,
  isVerified,
  slotsAvailable,
  nextSlotOpensAt,
  ownListingAlreadySponsored,
  ownSponsoredUntil,
  ownListingAlreadyFeatured,
  ownFeaturedUntil,
  gpCoinBalance = 0,
  autoOpenFromSearchParams = true,
}: PromoteListingButtonProps) {
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);
  const [open, setOpen] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);
  const [autoFeatured, setAutoFeatured] = useState(false);
  const [mounted, setMounted] = useState(false);
  const handledAutoOpen = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!autoOpenFromSearchParams || handledAutoOpen.current || searchParams.get('promote') !== 'featured') return;
    handledAutoOpen.current = true;
    if (!isVerified) {
      setShowUnverified(true);
    } else {
      setAutoFeatured(true);
      setOpen(true);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('promote');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [autoOpenFromSearchParams, isVerified, searchParams]);

  function handleClick() {
    if (!isVerified) {
      setShowUnverified(true);
      return;
    }
    // Always show the acknowledgment first — payment is involved, refresher each time.
    setShowAcknowledgment(true);
  }

  function handleProceed() {
    setShowAcknowledgment(false);
    setOpen(true);
  }

  const button = (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg transition-colors ${
        isVerified
          ? 'border-sky-500/50 bg-sky-700 text-white shadow-sky-500/20 hover:bg-sky-600'
          : 'border-sky-500/45 bg-sky-800 text-sky-50 shadow-sky-500/15 hover:bg-sky-700'
      }`}
    >
      <svg className="h-4 w-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      Promote Listing
    </button>
  );

  const modalLayer = (
    <>
      {showAcknowledgment && (
        <PromoteAcknowledgmentModal
          onClose={() => setShowAcknowledgment(false)}
          onProceed={handleProceed}
        />
      )}

      {open && (
        <PromoteListingModal
          listingId={listingId}
          listingName={listingName}
          slotsAvailable={slotsAvailable}
          nextSlotOpensAt={nextSlotOpensAt}
          ownListingAlreadySponsored={ownListingAlreadySponsored}
          ownSponsoredUntil={ownSponsoredUntil}
          ownListingAlreadyFeatured={ownListingAlreadyFeatured}
          ownFeaturedUntil={ownFeaturedUntil}
          gpCoinBalance={gpCoinBalance}
          initialPlacement={autoFeatured ? 'featured' : undefined}
          initialTier="7d"
          onClose={() => setOpen(false)}
        />
      )}

      {showUnverified && <UnverifiedNotice onClose={() => setShowUnverified(false)} />}
    </>
  );

  return (
    <>
      {button}

      {mounted ? createPortal(modalLayer, document.body) : null}
    </>
  );
}
