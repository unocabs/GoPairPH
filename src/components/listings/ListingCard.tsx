'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { type Shoe } from '@/types';
import { LogoMark } from '@/components/brand/Logo';
import { ShopLogoOverlay } from '@/components/shop/ShopLogoOverlay';
import { OutOfStockBadge } from '@/components/shop/OutOfStockBadge';
import { ListingTypeBadge } from './ListingTypeBadge';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { formatPrice, formatSize, getPublicUrl, formatRelativeDate, formatListingName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BuyModal } from '@/components/purchases/BuyModal';
import { DonateRequestModal } from '@/components/purchases/DonateRequestModal';
import { SponsoredPill } from './SponsoredPill';

interface ListingCardProps {
  shoe: Shoe;
  currentProfileId?: string;
  hasExistingRequest?: boolean;
  offerCount?: number;
}

export function ListingCard({ shoe, currentProfileId, hasExistingRequest = false, offerCount = 0 }: ListingCardProps) {
  const [buyOpen, setBuyOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage = shoe.shoe_images?.find(img => img.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImage ? getPublicUrl(supabaseUrl, topImage.storage_path) : null;
  const isOwner = !!currentProfileId && shoe.seller_id === currentProfileId;
  const isSponsored = !!shoe.sponsored_until && new Date(shoe.sponsored_until) > new Date();

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${shoe.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canAct = !isOwner && !!currentProfileId && shoe.status === 'active';
  // Shop variant listings need size selection — done on the detail page, not the card.
  const showBuy = canAct && shoe.listing_type === 'for_sale' && !!shoe.price_php && !shoe.shop_id;
  const showDonate = canAct && shoe.listing_type === 'donate';

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-gray-900 transition-all hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5',
      isOwner ? 'border-teal-600 hover:border-teal-500' : 'border-gray-800 hover:border-gray-700'
    )}>
      {/* Clickable area navigates to listing */}
      <Link href={`/listings/${shoe.id}`} className="group block">
        {/* Image */}
        <div className="relative aspect-square bg-gray-800">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={formatListingName(shoe.brand, shoe.model)}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/40">
              <div className="opacity-30">
                <LogoMark size={64} />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">
                No photo
              </span>
            </div>
          )}
          {shoe.shops && (
            <ShopLogoOverlay shop={shoe.shops} size="sm" asDiv />
          )}
          <div className={`absolute ${shoe.shops?.logo_storage_path ? 'top-2 left-12' : 'top-2 left-2'} flex flex-col items-start gap-1`}>
            <ListingTypeBadge type={shoe.listing_type} />
            {isSponsored && <SponsoredPill size="sm" />}
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
          {offerCount > 0 && shoe.status === 'active' && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-400" />
              </span>
              <span className="text-[10px] font-medium text-white leading-none">
                {offerCount === 1 ? '1 offer' : `${offerCount} offers`}{offerCount >= 10 ? ' 🔥' : ''}
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
          {/* Shop listing, every variant out of stock — overlay for owner view */}
          {shoe.shop_id && shoe.status === 'active' && !shoe.has_stock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <OutOfStockBadge />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-100 truncate text-sm">{formatListingName(shoe.brand, shoe.model)}</h3>
          {shoe.shop_id ? (
            (() => {
              const inStock = (shoe.shoe_variants ?? []).filter(v => v.quantity > 0);
              return (
                <p className="text-xs text-gray-500 mt-0.5">
                  {inStock.length > 0
                    ? `${inStock.length} size${inStock.length === 1 ? '' : 's'} available`
                    : 'Out of stock'}
                </p>
              );
            })()
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge className={cn('text-xs whitespace-nowrap', CONDITION_COLORS[shoe.condition])}>
              {CONDITIONS[shoe.condition]}
            </Badge>
            {!shoe.shop_id && (
              <span className="text-xs text-gray-600 whitespace-nowrap" title={shoe.mileage_km != null ? `${shoe.mileage_km.toLocaleString()} km` : 'Mileage not provided'}>
                {shoe.mileage_km != null ? `${shoe.mileage_km.toLocaleString()} km` : '—'}
              </span>
            )}
          </div>

          {shoe.listing_type === 'for_sale' && shoe.price_php && (
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <p className="font-bold text-teal-400 shrink-0">{formatPrice(shoe.price_php)}</p>
              {offerCount === 0 ? (
                <span></span>
              ) : (
                <span className="text-[10px] text-right">
                  <span className="text-teal-400 font-semibold">{offerCount}</span>
                  <span className="text-gray-500"> offer{offerCount === 1 ? '' : 's'} so far</span>
                </span>
              )}
            </div>
          )}
          {shoe.listing_type === 'donate' && (
            <p className="mt-2 text-xs text-green-400 font-medium">Free Donation</p>
          )}

          <p className="mt-1.5 text-xs text-gray-600">{formatRelativeDate(shoe.created_at)}</p>
        </div>
      </Link>

      {isOwner && shoe.shop_id && shoe.status === 'active' && !shoe.has_stock && (
        <Link
          href={`/listings/${shoe.id}/edit#variants`}
          className="block px-3 pb-3 -mt-1 text-center text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
        >
          Restock →
        </Link>
      )}

      {/* Copy-link overlay — owner only, positioned over the bottom-right of the image */}
      {isOwner && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          <button
            onClick={handleCopy}
            aria-label="Copy listing link"
            className="pointer-events-auto absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-white hover:bg-black/80 transition-colors"
          >
            {copied ? (
              <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        </div>
      )}

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
          listingName={formatListingName(shoe.brand, shoe.model)}
          priceFormatted={formatPrice(shoe.price_php)}
          pricePhp={shoe.price_php}
          isNegotiable={shoe.is_negotiable}
          seller={shoe.profiles}
          onClose={() => setBuyOpen(false)}
          onSubmitted={() => { setBuyOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
      {donateOpen && currentProfileId && createPortal(
        <DonateRequestModal
          listingId={shoe.id}
          listingName={formatListingName(shoe.brand, shoe.model)}
          requesterId={currentProfileId}
          onClose={() => setDonateOpen(false)}
          onSubmitted={() => { setDonateOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
    </div>
  );
}
