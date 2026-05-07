'use client';

import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { PromoteListingModal, UnverifiedNotice } from './PromoteListingModal';

interface PromoteListingButtonProps {
  listingId: string;
  listingName: string;
  isVerified: boolean;
  slotsAvailable: boolean;
  nextSlotOpensAt: string | null;
  ownListingAlreadySponsored: boolean;
  ownSponsoredUntil: string | null;
}

export function PromoteListingButton({
  listingId,
  listingName,
  isVerified,
  slotsAvailable,
  nextSlotOpensAt,
  ownListingAlreadySponsored,
  ownSponsoredUntil,
}: PromoteListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);

  function handleClick() {
    if (!isVerified) {
      setShowUnverified(true);
      return;
    }
    setOpen(true);
  }

  const button = (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        isVerified
          ? 'border-amber-600/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          : 'border-gray-700 bg-gray-800/50 text-gray-500 cursor-help'
      }`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      Promote Listing
    </button>
  );

  return (
    <>
      {isVerified ? (
        button
      ) : (
        <Tooltip
          trigger="both"
          content="Only verified users can promote listings. Tap to learn more."
        >
          {button}
        </Tooltip>
      )}

      {open && (
        <PromoteListingModal
          listingId={listingId}
          listingName={listingName}
          slotsAvailable={slotsAvailable}
          nextSlotOpensAt={nextSlotOpensAt}
          ownListingAlreadySponsored={ownListingAlreadySponsored}
          ownSponsoredUntil={ownSponsoredUntil}
          onClose={() => setOpen(false)}
        />
      )}

      {showUnverified && <UnverifiedNotice onClose={() => setShowUnverified(false)} />}
    </>
  );
}
