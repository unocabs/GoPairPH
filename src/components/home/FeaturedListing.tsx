import Image from 'next/image';
import type { Shoe } from '@/types';
import { CONDITIONS } from '@/lib/constants';
import { formatMileage, formatPrice, formatProfileLocation, formatSize, getPublicUrl, formatListingName, getListingPath, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { FeaturedPill } from '@/components/listings/FeaturedPill';
import { FeaturedSpotlightInfoButton } from '@/components/home/FeaturedSpotlightInfoButton';
import { HeroTrackedLink } from '@/components/home/HeroTrackedLink';

interface FeaturedListingProps {
  shoe: Shoe;
  rearShoes?: Shoe[];
}

export function FeaturedListing({ shoe, rearShoes = [] }: FeaturedListingProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage =
    shoe.shoe_images?.find(img => img.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImage ? getPublicUrl(supabaseUrl, topImage.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.featuredListing) : null;
  const seller = shoe.profiles;
  const sellerLocation = formatProfileLocation(seller);
  const listingName = formatListingName(shoe.brand, shoe.model);
  const showSrp = shoe.listing_type === 'for_sale' && shoe.price_php != null && shoe.srp_php != null && shoe.srp_php >= shoe.price_php;
  const discountPercent = showSrp && shoe.srp_php && shoe.price_php
    ? Math.max(0, Math.round(((shoe.srp_php - shoe.price_php) / shoe.srp_php) * 100))
    : 0;

  return (
    <div className="group/stack relative flex w-full items-center justify-center lg:h-[430px] lg:w-[580px] xl:w-[620px]">
      {rearShoes.slice(0, 2).map((rearShoe, index) => (
        <RearListingCard key={rearShoe.id} shoe={rearShoe} side={index === 0 ? 'left' : 'right'} />
      ))}

      <article className="hero-feature-float group relative z-10 h-[290px] w-full max-w-[390px] overflow-hidden rounded-2xl border border-white/15 bg-gray-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_54px_rgba(20,184,166,0.13)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/30 hover:shadow-[0_30px_90px_rgba(0,0,0,0.62),0_0_68px_rgba(20,184,166,0.18)] sm:h-[380px] sm:max-w-[470px] sm:rounded-[26px] lg:h-[420px] lg:w-[330px] lg:rounded-[26px]">
        <HeroTrackedLink
          href={getListingPath(shoe)}
          action="hero_featured_listing_click"
          listingId={shoe.id}
          aria-label={`View featured listing: ${listingName}`}
          className="absolute inset-0 z-30"
        >
          <span className="sr-only">View featured listing: {listingName}</span>
        </HeroTrackedLink>

      {/* Background image (full bleed) */}
      <div className="absolute inset-0 bg-stone-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listingName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1023px) 470px, 360px"
            quality={68}
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-stone-800 via-stone-900 to-black" />
        )}
      </div>

      {/* Gradient overlay for legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* TOP HUD: Live Spotlight, Pair of the Week, tooltip, and optional location. */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-40 sm:left-5 sm:right-5 sm:top-5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 pt-1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </span>
            <span className="min-w-0 truncate whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.24em] text-teal-300 sm:text-[10px] sm:tracking-[0.3em]">
              Live Spotlight
            </span>
          </div>

          <div className="flex max-w-[72%] shrink-0 flex-col items-end gap-1 sm:max-w-[68%]">
            <div className="flex min-w-0 max-w-full items-center justify-end gap-1.5 sm:gap-2">
              <div className="pointer-events-none min-w-0">
                <FeaturedPill compact featuredUntil={shoe.featured_until} />
              </div>
              <FeaturedSpotlightInfoButton className="pointer-events-auto relative z-40 shrink-0" />
            </div>
            {sellerLocation && (
              <span className="max-w-full truncate rounded bg-black/35 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-stone-300 backdrop-blur-sm sm:text-[10px]">
                {sellerLocation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE: huge brand + model */}
      <div className="pointer-events-none absolute bottom-[126px] left-4 right-4 sm:bottom-[150px] sm:left-6 sm:right-6 lg:bottom-[174px]">
        <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.24em] text-teal-300 sm:mb-2 sm:text-[10px] sm:tracking-[0.3em]">
          Featured Listing
        </div>
        <p className="line-clamp-2 text-[24px] font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl sm:text-[40px] lg:text-[36px]">
          {shoe.brand === 'Other' ? (
            <span className="text-teal-300">{shoe.model}</span>
          ) : (
            <>{shoe.brand}<br /><span className="text-teal-300">{shoe.model}</span></>
          )}
        </p>
      </div>

      {/* BOTTOM: spec chips + price + CTA */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5">
        {/* Chips */}
        <div className="mb-2 flex flex-wrap items-center gap-1 sm:mb-3 sm:gap-1.5">
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
            {CONDITIONS[shoe.condition]}
          </span>
          {(shoe.size_eu || shoe.size_us || shoe.size_cm) && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[9px] tabular-nums text-white backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
              {formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type)}
            </span>
          )}
          {!shoe.shop_id && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[9px] tabular-nums text-white backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
              {formatMileage(shoe.mileage_km)}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          {/* Price block */}
          <div className="min-w-0">
            {shoe.listing_type === 'for_sale' && shoe.price_php ? (
              <>
                <div className="font-mono text-[9px] uppercase tracking-[0.26em] text-stone-400 sm:text-[10px] sm:tracking-[0.3em]">
                  {shoe.is_negotiable ? 'From' : 'Asking'}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-black leading-none tracking-tight text-white tabular-nums sm:text-[40px] lg:text-[42px]">
                    {formatPrice(shoe.price_php)}
                  </span>
                </div>
                {showSrp && (
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-stone-400 line-through sm:text-[11px]">
                      {formatPrice(shoe.srp_php)}
                    </span>
                    {discountPercent > 0 && (
                      <span className="text-[10px] font-bold uppercase leading-none text-red-400">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : shoe.listing_type === 'donate' ? (
              <>
                <div className="font-mono text-[9px] uppercase tracking-[0.26em] text-green-300 sm:text-[10px] sm:tracking-[0.3em]">
                  Free Shoes
                </div>
                <div className="text-[34px] font-black leading-none tracking-tight text-white sm:text-[40px]">
                  Free
                </div>
              </>
            ) : (
              <div className="text-2xl font-black text-white">Open to offers</div>
            )}
            {seller?.display_name && (
              <div className="mt-1 truncate text-[10px] text-stone-300 sm:text-[11px]">
                Listed by{' '}
                <span className="font-semibold text-white">{seller.display_name}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <span className="flex min-h-9 flex-none items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-teal-300 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-950 shadow-[0_10px_28px_rgba(20,184,166,0.24)] transition-all group-hover:scale-[1.03] group-hover:from-teal-400 group-hover:to-cyan-300 sm:min-h-11 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm sm:tracking-wider lg:min-h-9 lg:gap-1.5 lg:px-3 lg:py-2 lg:text-xs">
            View Pair
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>

      {/* Decorative racing stripes */}
      <div
        className="pointer-events-none absolute right-2 top-0 z-20 h-16 w-1.5 bg-teal-400 sm:right-3 sm:h-20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-6 top-0 z-20 h-10 w-1 bg-orange-400 sm:right-8 sm:h-12"
        aria-hidden="true"
      />
      </article>
    </div>
  );
}

function RearListingCard({ shoe, side }: { shoe: Shoe; side: 'left' | 'right' }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage = shoe.shoe_images?.find(image => image.view_type === 'top') ?? shoe.shoe_images?.[0];
  if (!topImage) return null;

  const imageUrl = getPublicUrl(
    supabaseUrl,
    topImage.storage_path,
    'shoe-images',
    IMAGE_TRANSFORM_PRESETS.listingCard,
  );
  const listingName = formatListingName(shoe.brand, shoe.model);
  const sideClasses = side === 'left'
    ? 'left-3 -rotate-[7deg] group-hover/stack:-translate-x-3 group-hover/stack:-rotate-[9deg] xl:left-8'
    : 'right-3 rotate-[7deg] group-hover/stack:translate-x-3 group-hover/stack:rotate-[9deg] xl:right-8';

  return (
    <HeroTrackedLink
      href={getListingPath(shoe)}
      action="hero_rear_listing_click"
      listingId={shoe.id}
      aria-label={`View listing: ${listingName}`}
      className={`absolute top-10 hidden h-[340px] w-[235px] overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/90 shadow-[0_20px_60px_rgba(0,0,0,0.52)] transition-all duration-500 lg:block ${sideClasses}`}
    >
      <picture>
        <source media="(min-width: 1024px)" srcSet={imageUrl} />
        {/* The transparent fallback prevents mobile browsers from requesting the rear image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          alt={listingName}
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 hover:scale-105"
          loading="lazy"
        />
      </picture>
      <span className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      <span className="absolute inset-x-0 bottom-0 p-5">
        <span className="line-clamp-2 block text-xl font-black leading-tight text-white">{listingName}</span>
        {shoe.listing_type === 'for_sale' && shoe.price_php ? (
          <span className="mt-2 block text-xl font-black text-teal-300">{formatPrice(shoe.price_php)}</span>
        ) : (
          <span className="mt-2 block text-sm font-bold text-green-300">Free Shoes</span>
        )}
        <span className="mt-3 block truncate text-xs text-gray-300">
          {formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type)}
        </span>
        {formatProfileLocation(shoe.profiles) && (
          <span className="mt-1 block truncate text-xs text-gray-400">{formatProfileLocation(shoe.profiles)}</span>
        )}
      </span>
    </HeroTrackedLink>
  );
}
