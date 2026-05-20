'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DonateRequestModal } from './DonateRequestModal';

interface DonateRequestButtonProps {
  listingId: string;
  listingName: string;
  requesterId: string;
  requesterFbUsername?: string | null;
}

export function DonateRequestButton({ listingId, listingName, requesterId, requesterFbUsername }: DonateRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">
        <p>Request sent. Track it in Sent Offers.</p>
        <a href="/profile?tab=offers" className="mt-2 inline-flex text-xs font-semibold text-green-100 underline underline-offset-2 hover:text-white">
          View Sent Offers
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
      >
        Request this Pair — Free
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <DonateRequestModal
          listingId={listingId}
          listingName={listingName}
          requesterId={requesterId}
          requesterFbUsername={requesterFbUsername}
          onClose={() => setOpen(false)}
          onSubmitted={() => { setOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
    </>
  );
}
