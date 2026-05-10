'use client';

import { useState } from 'react';
import { BuyModal } from './BuyModal';
import type { Profile, ShoeVariant, Shop } from '@/types';

interface BuyButtonProps {
  listingId: string;
  listingName: string;
  priceFormatted: string;
  pricePhp: number;
  isNegotiable: boolean;
  seller?: Profile;
  shop?: Shop | null;
  offerCount?: number;
  variants?: ShoeVariant[];
  initialVariantId?: string | null;
  /** Override the default "Request to Buy" label (used by per-size buttons). */
  label?: string;
  className?: string;
}

export function BuyButton({ listingId, listingName, priceFormatted, pricePhp, isNegotiable, seller, shop, offerCount = 0, variants, initialVariantId, label, className }: BuyButtonProps) {
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
        className={className ?? "mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"}
      >
        {label ?? 'Request to Buy'}
      </button>
      {!label && (
        <p className="mt-2 text-xs text-center">
          {offerCount === 0 ? (
            <span></span>
          ) : (
            <>
              <span className="text-teal-400 font-semibold">{offerCount}</span>
              <span className="text-gray-500"> offer{offerCount === 1 ? '' : 's'} so far{offerCount >= 10 ? ' 🔥' : ''}</span>
            </>
          )}
        </p>
      )}
      {open && (
        <BuyModal
          listingId={listingId}
          listingName={listingName}
          priceFormatted={priceFormatted}
          pricePhp={pricePhp}
          isNegotiable={isNegotiable}
          seller={seller}
          shop={shop}
          variants={variants}
          initialVariantId={initialVariantId}
          onClose={() => setOpen(false)}
          onSubmitted={() => { setOpen(false); setSubmitted(true); }}
        />
      )}
    </>
  );
}
