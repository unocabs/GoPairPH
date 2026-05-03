'use client';

import { useState } from 'react';
import { DonateRequestModal } from './DonateRequestModal';

interface DonateRequestButtonProps {
  listingId: string;
  listingName: string;
  requesterId: string;
}

export function DonateRequestButton({ listingId, listingName, requesterId }: DonateRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-400">
        Request sent! The donor will review and reach out to arrange pickup.
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
      {open && (
        <DonateRequestModal
          listingId={listingId}
          listingName={listingName}
          requesterId={requesterId}
          onClose={() => setOpen(false)}
          onSubmitted={() => { setOpen(false); setSubmitted(true); }}
        />
      )}
    </>
  );
}
