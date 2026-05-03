'use client';

import { useState } from 'react';
import { BuyModal } from './BuyModal';
import type { Profile } from '@/types';

interface BuyButtonProps {
  listingId: string;
  listingName: string;
  buyerId: string;
  priceFormatted: string;
  pricePhp: number;
  isNegotiable: boolean;
  seller?: Profile;
}

export function BuyButton({ listingId, listingName, buyerId, priceFormatted, pricePhp, isNegotiable, seller }: BuyButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-teal-800 bg-teal-950 px-4 py-3 text-sm text-teal-400">
        Purchase request sent! The seller will review and respond.
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
      >
        Request to Buy
      </button>
      {open && (
        <BuyModal
          listingId={listingId}
          listingName={listingName}
          buyerId={buyerId}
          priceFormatted={priceFormatted}
          pricePhp={pricePhp}
          isNegotiable={isNegotiable}
          seller={seller}
          onClose={() => setOpen(false)}
          onSubmitted={() => { setOpen(false); setSubmitted(true); }}
        />
      )}
    </>
  );
}
