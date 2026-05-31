import Link from 'next/link';
import Image from 'next/image';
import type { Shoe } from '@/types';
import { CONDITIONS } from '@/lib/constants';
import { formatPrice, formatSize, getPublicUrl, formatListingName, getListingPath } from '@/lib/utils';
import { FeaturedPill } from '@/components/listings/FeaturedPill';

interface FeaturedListingProps {
  shoe: Shoe;
}

export function FeaturedListing({ shoe }: FeaturedListingProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImage =
    shoe.shoe_images?.find(img => img.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImage ? getPublicUrl(supabaseUrl, topImage.storage_path) : null;
  const seller = shoe.profiles;
  const listingName = formatListingName(shoe.brand, shoe.model);

  return (
    <article
      className="group relative block w-full max-w-[500px] aspect-[4/5] overflow-hidden rounded-[24px] border border-white/10 bg-gray-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(20,184,166,0.12)] backdrop-blur-md transition-transform hover:scale-[1.01] sm:h-[420px] sm:aspect-auto sm:rounded-[28px]"
    >
      <Link
        href={getListingPath(shoe)}
        aria-label={`View featured listing: ${listingName}`}
        className="absolute inset-0 z-30"
      >
        <span className="sr-only">View featured listing: {listingName}</span>
      </Link>

      {/* Background image (full bleed) */}
      <div className="absolute inset-0 bg-stone-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listingName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="500px"
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

      {/* TOP: live spotlight indicator + location */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between sm:left-5 sm:right-5 sm:top-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-teal-300 sm:text-[10px] sm:tracking-[0.3em]">
            Live Spotlight
          </span>
        </div>
        {seller?.location && (
          <span className="rounded bg-black/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-stone-300 backdrop-blur-sm sm:text-[10px]">
            {seller.location}
          </span>
        )}
      </div>

      {/* TOP-RIGHT: pick-of-the-week badge */}
      <div className="pointer-events-none absolute right-4 top-12 origin-top-right scale-[0.82] sm:right-5 sm:top-16 sm:scale-100">
        <FeaturedPill compact featuredUntil={shoe.featured_until} />
      </div>

      {/* MIDDLE: huge brand + model */}
      <div className="pointer-events-none absolute left-5 right-5 bottom-[172px] sm:left-6 sm:right-6 sm:bottom-[140px]">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.26em] text-teal-300 sm:mb-2 sm:text-[10px] sm:tracking-[0.3em]">
          Featured Listing
        </div>
        <p className="text-[26px] font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl sm:text-5xl">
          {shoe.brand === 'Other' ? (
            <span className="text-teal-300">{shoe.model}</span>
          ) : (
            <>{shoe.brand}<br /><span className="text-teal-300">{shoe.model}</span></>
          )}
        </p>
      </div>

      {/* BOTTOM: spec chips + price + CTA */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
        {/* Chips */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:mb-4">
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
            {CONDITIONS[shoe.condition]}
          </span>
          {(shoe.size_eu || shoe.size_us || shoe.size_cm) && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[9px] tabular-nums text-white backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
              {formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type)}
            </span>
          )}
          {shoe.mileage_km != null && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[9px] tabular-nums text-white backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
              {shoe.mileage_km.toLocaleString()} km
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
                  <span className="text-[34px] font-black leading-none tracking-tight text-white tabular-nums sm:text-[44px]">
                    {formatPrice(shoe.price_php)}
                  </span>
                </div>
              </>
            ) : shoe.listing_type === 'donate' ? (
              <>
                <div className="font-mono text-[9px] uppercase tracking-[0.26em] text-green-300 sm:text-[10px] sm:tracking-[0.3em]">
                  Donation
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
          <span className="flex-none flex min-h-10 items-center gap-1.5 rounded-full bg-teal-400 px-3.5 py-2 text-xs font-black uppercase tracking-wide text-gray-900 transition-all group-hover:scale-[1.03] group-hover:bg-teal-300 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm sm:tracking-wider">
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
        className="absolute right-10 top-0 h-16 w-1.5 bg-teal-400 sm:right-12 sm:h-20"
        aria-hidden="true"
      />
      <div
        className="absolute right-14 top-0 h-10 w-1 bg-orange-400 sm:right-16 sm:h-12"
        aria-hidden="true"
      />
    </article>
  );
}
