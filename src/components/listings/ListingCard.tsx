'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { type Shoe } from '@/types';
import { LogoMark } from '@/components/brand/Logo';
import { ShopLogoOverlay } from '@/components/shop/ShopLogoOverlay';
import { OutOfStockBadge } from '@/components/shop/OutOfStockBadge';
import { ListingTypeBadge } from './ListingTypeBadge';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { formatPrice, formatSize, getPublicUrl, formatRelativeDate, formatListingName, getListingPath } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BuyModal } from '@/components/purchases/BuyModal';
import { DonateRequestModal } from '@/components/purchases/DonateRequestModal';
import { SponsoredPill } from './SponsoredPill';
import { NewPill } from './NewPill';
import { FlaggedPill } from './FlaggedPill';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { SaveListingButton } from './SaveListingButton';
import { type ShopTheme } from '@/lib/shopTheme';

const NEW_PILL_WINDOW_MS = 24 * 60 * 60 * 1000;
const SharePostModal = dynamic(
  () => import('./SharePostModal').then(mod => mod.SharePostModal),
  { ssr: false }
);

interface ListingCardProps {
  shoe: Shoe;
  currentProfileId?: string;
  currentProfileIsAdmin?: boolean;
  currentProfileFbUsername?: string | null;
  hasExistingRequest?: boolean;
  offerCount?: number;
  /** Owner-only: total + last-7-days view counts. Rendered as a pill on the card. */
  viewSummary?: { total: number; last7d: number };
  isSaved?: boolean;
  onSavedChange?: (listingId: string, saved: boolean) => void;
  theme?: ShopTheme;
}

export function ListingCard({ shoe, currentProfileId, currentProfileIsAdmin = false, currentProfileFbUsername, hasExistingRequest = false, offerCount = 0, viewSummary, isSaved = false, onSavedChange, theme }: ListingCardProps) {
  const [buyOpen, setBuyOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [sharePostOpen, setSharePostOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage = shoe.shoe_images?.find(img => img.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImage ? getPublicUrl(supabaseUrl, topImage.storage_path) : null;
  const isOwner = !!currentProfileId && shoe.seller_id === currentProfileId;
  const canSeeQualityFlag = !!shoe.quality_flagged_at && !!currentProfileId && (isOwner || currentProfileIsAdmin === true);
  const canSave = !!currentProfileId && !isOwner;
  const isSponsored = !!shoe.sponsored_until && new Date(shoe.sponsored_until) > new Date();
  const isFresh = Date.now() - new Date(shoe.created_at).getTime() < NEW_PILL_WINDOW_MS;
  const themedCardStyle = theme ? { backgroundColor: theme.surface, borderColor: isOwner ? theme.accent : theme.border } : undefined;
  const themedMutedStyle = theme ? { color: theme.mutedText } : undefined;
  const themedAccentStyle = theme ? { color: theme.accent } : undefined;
  const listingPath = getListingPath(shoe);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${listingPath}`;
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
  const showPlaceOrder = canAct && shoe.listing_type === 'for_sale' && !!shoe.shop_id && shoe.has_stock;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-slate-900/72 shadow-[0_16px_50px_rgba(0,0,0,0.26)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(0,0,0,0.36),0_0_36px_rgba(20,184,166,0.08)]',
      canSeeQualityFlag
        ? 'border-amber-300/45 hover:border-amber-300/70'
        : isOwner ? 'border-teal-500/60 hover:border-teal-400' : 'border-white/[0.08] hover:border-teal-400/30'
    )} style={themedCardStyle}>
      {/* Clickable area navigates to listing */}
      <Link href={listingPath} className="group block">
        {/* Image */}
        <div className="relative aspect-square bg-slate-950" style={theme ? { backgroundColor: theme.surfaceStrong } : undefined}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={formatListingName(shoe.brand, shoe.model)}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/40" style={theme ? { background: `linear-gradient(135deg, ${theme.surfaceStrong}, ${theme.background})` } : undefined}>
              <div className="opacity-30">
                <LogoMark size={64} />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600" style={themedMutedStyle}>
                No photo
              </span>
            </div>
          )}
          {shoe.shops && (
            <ShopLogoOverlay shop={shoe.shops} size="sm" asDiv />
          )}
          <div className={`absolute ${shoe.shops?.logo_storage_path ? 'top-2 left-12' : 'top-2 left-2'} flex flex-col items-start gap-1`}>
            {shoe.listing_type === 'donate' && <ListingTypeBadge type={shoe.listing_type} />}
            {canSeeQualityFlag && <FlaggedPill size="sm" />}
            {isSponsored && <SponsoredPill size="sm" />}
            {isFresh && shoe.status === 'active' && !isSponsored && <NewPill size="sm" />}
          </div>
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
        <div className="p-3.5">
          <div className="flex items-center gap-1 min-w-0">
            <h3 className="font-semibold text-gray-100 truncate text-sm" style={theme ? { color: theme.text } : undefined}>{formatListingName(shoe.brand, shoe.model)}</h3>
            {!shoe.shop_id && shoe.profiles?.is_verified && (
              <span className="shrink-0"><VerifiedBadge size="sm" iconOnly /></span>
            )}
          </div>
          {shoe.shop_id ? (
            (() => {
              const inStock = (shoe.shoe_variants ?? []).filter(v => v.quantity > 0);
              return (
                <p className="text-xs text-gray-500 mt-0.5" style={themedMutedStyle}>
                  {inStock.length > 0
                    ? `${inStock.length} size${inStock.length === 1 ? '' : 's'} available`
                    : 'Out of stock'}
                </p>
              );
            })()
          ) : (
            <p className="text-xs text-gray-500 mt-0.5" style={themedMutedStyle}>{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</p>
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
              <p className="font-bold text-teal-400 shrink-0" style={themedAccentStyle}>{formatPrice(shoe.price_php)}</p>
              {offerCount === 0 ? (
                <span></span>
              ) : (
                <span className="text-[10px] text-right">
                  <span className="text-teal-400 font-semibold" style={themedAccentStyle}>{offerCount}</span>
                  <span className="text-gray-500" style={themedMutedStyle}> offer{offerCount === 1 ? '' : 's'} so far</span>
                </span>
              )}
            </div>
          )}
          {shoe.listing_type === 'donate' && (
            <p className="mt-2 text-xs text-green-400 font-medium">Free Donation</p>
          )}

          <p className="mt-1.5 text-xs text-gray-600" style={themedMutedStyle}>{formatRelativeDate(shoe.created_at)}</p>

          {isOwner && viewSummary && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-800/70 border border-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-gray-300" title="Total views · last 7 days (only you can see this)">
              <svg className="h-3 w-3 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {viewSummary.total} view{viewSummary.total === 1 ? '' : 's'}
              {viewSummary.last7d > 0 && (
                <span className="text-teal-300"> · {viewSummary.last7d} this week</span>
              )}
            </p>
          )}
        </div>
      </Link>

      {isOwner && shoe.shop_id && shoe.status === 'active' && !shoe.has_stock && (
        <Link
          href={`/listings/${shoe.id}/edit#variants`}
          className="block px-3 pb-3 -mt-1 text-center text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
          style={themedAccentStyle}
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

      {!isOwner && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          <div className="pointer-events-auto absolute right-2 top-2">
            <SaveListingButton
              listingId={shoe.id}
              initialSaved={isSaved}
              canSave={canSave}
              onSavedChange={onSavedChange}
            />
          </div>
        </div>
      )}

      {/* Action buttons — outside Link to avoid nested interactive elements */}
      {(isOwner || showBuy || showDonate || showPlaceOrder) && (
        <div className="px-3.5 pb-3.5">
          {isOwner ? (
            <button
              type="button"
              onClick={() => setSharePostOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-800 bg-teal-950/70 px-3 py-2 text-sm font-semibold text-teal-300 transition-colors hover:border-teal-500 hover:bg-teal-900/70 hover:text-teal-100"
              style={theme ? { borderColor: theme.border, backgroundColor: theme.surfaceStrong, color: theme.accent } : undefined}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Share Post
            </button>
          ) : submitted ? (
            <div className="rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-xs text-teal-400 text-center" style={theme ? { borderColor: theme.border, backgroundColor: theme.surfaceStrong, color: theme.accent } : undefined}>
              <p>{showDonate ? 'Request sent. Track it in Sent Offers.' : 'Request sent. Track it in Sent Offers.'}</p>
              <Link href="/profile?tab=offers" className="mt-1 inline-flex font-semibold text-teal-100 underline underline-offset-2 hover:text-white">
                View Sent Offers
              </Link>
            </div>
          ) : hasExistingRequest ? (
            <div className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-400 text-center">
              Waiting for confirmation
            </div>
          ) : showBuy ? (
            <button
              onClick={() => setBuyOpen(true)}
              className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors"
              style={theme ? { backgroundColor: theme.accent, color: theme.accentText } : undefined}
            >
              Send Offer
            </button>
          ) : showPlaceOrder ? (
            <Link
              href={listingPath}
              className="block w-full rounded-lg bg-teal-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-500 transition-colors"
              style={theme ? { backgroundColor: theme.accent, color: theme.accentText } : undefined}
            >
              Place Order
            </Link>
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
          listingSlug={shoe.slug}
          listingName={formatListingName(shoe.brand, shoe.model)}
          priceFormatted={formatPrice(shoe.price_php)}
          pricePhp={shoe.price_php}
          isNegotiable={shoe.is_negotiable}
          seller={shoe.profiles}
          shop={shoe.shops}
          buyerProfileId={currentProfileId}
          buyerFbUsername={currentProfileFbUsername}
          onClose={() => setBuyOpen(false)}
          onSubmitted={() => { setBuyOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
      {sharePostOpen && isOwner && typeof window !== 'undefined' && createPortal(
        <SharePostModal
          shoe={shoe}
          seller={shoe.profiles ?? null}
          onClose={() => setSharePostOpen(false)}
          onDownloaded={() => setSharePostOpen(false)}
        />,
        document.body
      )}
      {donateOpen && currentProfileId && createPortal(
        <DonateRequestModal
          listingId={shoe.id}
          listingName={formatListingName(shoe.brand, shoe.model)}
          requesterId={currentProfileId}
          requesterFbUsername={currentProfileFbUsername}
          onClose={() => setDonateOpen(false)}
          onSubmitted={() => { setDonateOpen(false); setSubmitted(true); }}
        />,
        document.body
      )}
    </div>
  );
}
