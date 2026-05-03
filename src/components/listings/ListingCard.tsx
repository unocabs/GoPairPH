'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { type Shoe } from '@/types';
import { ListingTypeBadge } from './ListingTypeBadge';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { formatPrice, formatSize, getPublicUrl, formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BuyModal } from '@/components/purchases/BuyModal';
import { DonateRequestModal } from '@/components/purchases/DonateRequestModal';

interface ListingCardProps {
  shoe: Shoe;
  currentProfileId?: string;
  hasExistingRequest?: boolean;
}

export function ListingCard({ shoe, currentProfileId, hasExistingRequest = false }: ListingCardProps) {
  const [buyOpen, setBuyOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage = shoe.shoe_images?.find(img => img.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImage ? getPublicUrl(supabaseUrl, topImage.storage_path) : null;
  const isOwner = !!currentProfileId && shoe.seller_id === currentProfileId;

  const canAct = !isOwner && !!currentProfileId && shoe.status === 'active';
  const showBuy = canAct && shoe.listing_type === 'for_sale' && !!shoe.price_php;
  const showDonate = canAct && shoe.listing_type === 'donate';

  return (
    <div className={cn(
      'overflow-hidden rounded-xl border bg-gray-900 transition-all hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5',
      isOwner ? 'border-teal-600 hover:border-teal-500' : 'border-gray-800 hover:border-gray-700'
    )}>
      {/* Clickable area navigates to listing */}
      <Link href={`/listings/${shoe.id}`} className="group block">
        {/* Image */}
        <div className="relative aspect-square bg-gray-800">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${shoe.brand} ${shoe.model}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-700">
              <svg className="h-14 w-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <ListingTypeBadge type={shoe.listing_type} />
          </div>
          {isOwner && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-500/50 px-2 py-0.5 text-[10px] font-semibold text-teal-300 backdrop-blur-sm">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                My Listing
              </span>
            </div>
          )}
          {shoe.status !== 'active' && (
            <div className={`absolute inset-0 flex items-center justify-center ${
              shoe.status === 'reserved' ? 'bg-orange-500/30' : 'bg-gray-900/30'
            }`}>
              <span className={`font-bold text-xl uppercase tracking-widest drop-shadow-lg ${
                shoe.status === 'reserved' ? 'text-orange-300' : 'text-white/70'
              }`}>
                {shoe.status === 'sold' ? 'SOLD'
                  : shoe.status === 'donated' ? 'DONATED'
                  : shoe.status === 'reserved' ? 'RESERVED'
                  : shoe.status.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-100 truncate text-sm">{shoe.brand} {shoe.model}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</p>

          <div className="mt-2 flex items-center justify-between">
            <Badge className={cn('text-xs', CONDITION_COLORS[shoe.condition])}>
              {CONDITIONS[shoe.condition]}
            </Badge>
            {shoe.mileage_km != null
              ? <span className="text-xs text-gray-600">{shoe.mileage_km.toLocaleString()} km</span>
              : <span className="text-xs text-yellow-600">No mileage</span>
            }
          </div>

          {shoe.listing_type === 'for_sale' && shoe.price_php && (
            <p className="mt-2 font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
          )}
          {shoe.listing_type === 'donate' && (
            <p className="mt-2 text-xs text-green-400 font-medium">Free Donation</p>
          )}

          <p className="mt-2 text-xs text-gray-600">{formatRelativeDate(shoe.created_at)}</p>
        </div>
      </Link>

      {/* Action buttons — outside Link to avoid nested interactive elements */}
      {(showBuy || showDonate) && (
        <div className="px-3 pb-3">
          {submitted ? (
            <div className="rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-xs text-teal-400 text-center">
              ✓ Request sent!
            </div>
          ) : hasExistingRequest ? (
            <div className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-400 text-center">
              Waiting for confirmation
            </div>
          ) : showBuy ? (
            <button
              onClick={() => setBuyOpen(true)}
              className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors"
            >
              Send Offer
            </button>
          ) : (
            <button
              onClick={() => setDonateOpen(true)}
              className="w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              Request Pair
            </button>
          )}
        </div>
      )}

      {buyOpen && currentProfileId && shoe.price_php && createPortal(
        <BuyModal
          listingId={shoe.id}
          listingName={`${shoe.brand} ${shoe.model}`}
          buyerId={currentProfileId}
          priceFormatted={formatPrice(shoe.price_php)}
          pricePhp={shoe.price_php}
          isNegotiable={shoe.is_negotiable}
          onClose={() => setBuyOpen(false)}
          onSubmitted={() => { setBuyOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
      {donateOpen && currentProfileId && createPortal(
        <DonateRequestModal
          listingId={shoe.id}
          listingName={`${shoe.brand} ${shoe.model}`}
          requesterId={currentProfileId}
          onClose={() => setDonateOpen(false)}
          onSubmitted={() => { setDonateOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
    </div>
  );
}
