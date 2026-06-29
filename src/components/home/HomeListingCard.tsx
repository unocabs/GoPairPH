'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Shoe } from '@/types';
import type { PersonalizationBadges } from '@/lib/personalization';
import { SaveListingButton } from '@/components/listings/SaveListingButton';
import { GreatDealPill } from '@/components/listings/GreatDealPill';
import { NewPill } from '@/components/listings/NewPill';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { getGreatDealEstimate } from '@/lib/pricing/greatDeal';
import {
  IMAGE_TRANSFORM_PRESETS,
  cn,
  formatListingFreshness,
  formatListingName,
  formatMileage,
  formatPrice,
  formatRelativeDate,
  formatSize,
  getListingPath,
  getPublicUrl,
} from '@/lib/utils';

const NEW_PILL_WINDOW_MS = 24 * 60 * 60 * 1000;

interface HomeListingCardProps {
  shoe: Shoe;
  currentProfileId?: string;
  isSaved?: boolean;
  saveCount?: number;
  personalizationBadges?: PersonalizationBadges;
  showSaveAction?: boolean;
  showFreshnessDate?: boolean;
}

export function HomeListingCard({
  shoe,
  currentProfileId,
  isSaved = false,
  saveCount = 0,
  personalizationBadges,
  showSaveAction = true,
  showFreshnessDate = true,
}: HomeListingCardProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage = shoe.shoe_images?.find(img => img.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImage
    ? getPublicUrl(supabaseUrl, topImage.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.listingCard)
    : null;
  const isActive = shoe.status === 'active';
  const isOwner = !!currentProfileId && shoe.seller_id === currentProfileId;
  const canSave = showSaveAction && isActive && !!currentProfileId && !isOwner;
  const listingPath = getListingPath(shoe);
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(listingPath)}`;
  const listingName = formatListingName(shoe.brand, shoe.model);
  const showSrp =
    shoe.listing_type === 'for_sale' &&
    shoe.price_php != null &&
    shoe.srp_php != null &&
    shoe.srp_php >= shoe.price_php;
  const discountPercent = showSrp && shoe.srp_php && shoe.price_php
    ? Math.max(0, Math.round(((shoe.srp_php - shoe.price_php) / shoe.srp_php) * 100))
    : 0;
  const greatDeal = getGreatDealEstimate(shoe);
  const isFresh = Date.now() - new Date(shoe.created_at).getTime() < NEW_PILL_WINDOW_MS;
  const freshnessLabel = shoe.status === 'sold'
    ? `Sold ${formatRelativeDate(shoe.updated_at).toLowerCase()}`
    : formatListingFreshness(shoe);

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/72 shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-teal-400/30 hover:shadow-[0_22px_70px_rgba(0,0,0,0.34),0_0_30px_rgba(20,184,166,0.07)]">
      <Link href={listingPath} className="group flex flex-1 flex-col">
        <div className="relative aspect-square bg-slate-950">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listingName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.035]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={54}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/40 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              No photo
            </div>
          )}
          {isFresh && shoe.status === 'active' && (
            <div className="absolute left-2 top-2">
              <NewPill size="sm" />
            </div>
          )}
          {saveCount > 0 && (
            <div
              className={cn(
                'absolute right-2 top-2 flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-black/60 px-2 text-white backdrop-blur-sm',
                !isOwner && 'hidden',
              )}
              title={`${saveCount} ${saveCount === 1 ? 'runner has' : 'runners have'} saved this pair`}
              aria-label={`${saveCount} ${saveCount === 1 ? 'runner has' : 'runners have'} saved this pair`}
            >
              <HeartIcon filled />
              <span className="text-[11px] font-bold leading-none tabular-nums">
                {saveCount > 99 ? '99+' : saveCount}
              </span>
            </div>
          )}
          {greatDeal && isActive && (
            <div className="absolute bottom-2 left-2">
              <GreatDealPill size="sm" />
            </div>
          )}
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/42 backdrop-blur-[1px]">
              <span className="rounded-full border border-white/15 bg-black/55 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:text-base">
                {shoe.status === 'sold'
                  ? 'Sold'
                  : shoe.status === 'donated'
                    ? 'Donated'
                    : shoe.status === 'reserved'
                      ? 'Deal Pending'
                      : shoe.status}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="truncate text-sm font-semibold text-gray-100">{listingName}</h3>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {shoe.shop_id
              ? getVariantSummary(shoe)
              : formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type)}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge className={cn('text-xs whitespace-nowrap', CONDITION_COLORS[shoe.condition])}>
              {CONDITIONS[shoe.condition]}
            </Badge>
            {!shoe.shop_id && (
              <span className="text-xs text-gray-600" title={shoe.mileage_km != null ? formatMileage(shoe.mileage_km) : 'Mileage not tracked'}>
                {formatMileage(shoe.mileage_km)}
              </span>
            )}
          </div>

          {shoe.listing_type === 'for_sale' && shoe.price_php ? (
            <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="shrink-0 font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
              {showSrp && (
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-gray-600 line-through">
                    {formatPrice(shoe.srp_php)}
                  </p>
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-bold uppercase leading-none text-red-400">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : shoe.listing_type === 'donate' ? (
            <p className="mt-2 text-xs font-medium text-green-400">Free Shoes</p>
          ) : null}

          {(personalizationBadges?.matchesSize || personalizationBadges?.nearYou) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {personalizationBadges.matchesSize && (
                <span className="rounded-full border border-teal-400/25 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-200">
                  Your size
                </span>
              )}
              {personalizationBadges.nearYou && (
                <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                  Near you
                </span>
              )}
            </div>
          )}

          {showFreshnessDate && (
            <p className="mt-1.5 text-xs text-gray-600">{freshnessLabel}</p>
          )}
        </div>
      </Link>

      {showSaveAction && isActive && !isOwner && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          <div className="pointer-events-auto absolute right-2 top-2">
            <SaveListingButton
              listingId={shoe.id}
              initialSaved={isSaved}
              canSave={canSave}
              initialSaveCount={saveCount}
              signInHref={signInHref}
              sellerId={shoe.seller_id}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function getVariantSummary(shoe: Shoe) {
  const inStock = (shoe.shoe_variants ?? []).filter(variant => variant.quantity > 0);
  if (inStock.length === 0) return 'Out of stock';
  return `${inStock.length} size${inStock.length === 1 ? '' : 's'} available`;
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-4 w-4 text-teal-200" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 1 0-7.5 7.5L12 21l8.8-7.9a5.3 5.3 0 0 0 0-7.5Z"
      />
    </svg>
  );
}
