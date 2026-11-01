'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DonateRequestModal } from './DonateRequestModal';
import { trackMarketplaceAction } from '@/lib/analytics';

interface DonateRequestButtonProps {
  listingId: string;
  listingName: string;
  requesterId: string;
  requesterFbUsername?: string | null;
  onSubmitted?: (conversationId?: string) => void;
}

export function DonateRequestButton({ listingId, listingName, requesterId, requesterFbUsername, onSubmitted }: DonateRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">
        <p>Request sent. Track it in My Buying.</p>
        <a href="/buying?tab=offers" className="mt-2 inline-flex text-xs font-semibold text-green-100 underline underline-offset-2 hover:text-white">
          View My Buying
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          trackMarketplaceAction('request_start', {
            listing_id: listingId,
            listing_type: 'donation_request',
            surface: 'listing_detail',
          });
          setOpen(true);
        }}
        className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
      >
        Request Free Shoes
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <DonateRequestModal
          listingId={listingId}
          listingName={listingName}
          requesterId={requesterId}
          requesterFbUsername={requesterFbUsername}
          onClose={() => setOpen(false)}
          onSubmitted={(conversationId) => { setOpen(false); if (onSubmitted) onSubmitted(conversationId); else setSubmitted(true); }}
        />,
        document.body
      )}
    </>
  );
}
