'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { BuyModal } from './BuyModal';
import type { Profile, ShoeVariant, Shop } from '@/types';

interface BuyButtonProps {
  listingId: string;
  listingSlug?: string | null;
  listingName: string;
  priceFormatted: string;
  pricePhp: number;
  isNegotiable: boolean;
  seller?: Profile;
  shop?: Shop | null;
  offerCount?: number;
  variants?: ShoeVariant[];
  initialVariantId?: string | null;
  buyerProfileId?: string | null;
  buyerFbUsername?: string | null;
  /** Override the default "Request to Buy" label (used by per-size buttons). */
  label?: string;
  className?: string;
}

export function BuyButton({ listingId, listingSlug, listingName, priceFormatted, pricePhp, isNegotiable, seller, shop, offerCount = 0, variants, initialVariantId, buyerProfileId, buyerFbUsername, label, className }: BuyButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const actionLabel = label ?? (shop ? 'Place Order' : isNegotiable ? 'Send Offer' : 'Request to Buy');

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-teal-800 bg-teal-950 px-4 py-3 text-sm text-teal-300">
        <p>{shop ? 'Order placed. Track it in Sent Offers.' : isNegotiable ? 'Offer sent. Track it in Sent Offers.' : 'Request sent. Track it in Sent Offers.'}</p>
        <Link href="/profile?tab=offers" className="mt-2 inline-flex text-xs font-semibold text-teal-100 underline underline-offset-2 hover:text-white">
          View Sent Offers
        </Link>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"}
      >
        {actionLabel}
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
      {open && typeof window !== 'undefined' && createPortal(
        <BuyModal
          listingId={listingId}
          listingSlug={listingSlug}
          listingName={listingName}
          priceFormatted={priceFormatted}
          pricePhp={pricePhp}
          isNegotiable={isNegotiable}
          seller={seller}
          shop={shop}
          variants={variants}
          initialVariantId={initialVariantId}
          buyerProfileId={buyerProfileId}
          buyerFbUsername={buyerFbUsername}
          onClose={() => setOpen(false)}
          onSubmitted={() => { setOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
    </>
  );
}
