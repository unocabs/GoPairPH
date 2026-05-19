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
      className="group relative block w-full max-w-[500px] aspect-[4/5] overflow-hidden rounded-[28px] border border-white/10 bg-gray-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(20,184,166,0.12)] backdrop-blur-md transition-transform hover:scale-[1.01] sm:h-[420px] sm:aspect-auto"
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
      <div className="pointer-events-none absolute top-5 left-5 right-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
          <span className="text-[10px] font-bold text-teal-300 uppercase tracking-[0.3em]">
            Live Spotlight
          </span>
        </div>
        {seller?.location && (
          <span className="text-[10px] font-mono text-stone-300 uppercase tracking-widest backdrop-blur-sm bg-black/30 px-2 py-1 rounded">
            {seller.location}
          </span>
        )}
      </div>

      {/* TOP-RIGHT: pick-of-the-week badge */}
      <div className="pointer-events-none absolute top-16 right-5">
        <FeaturedPill compact featuredUntil={shoe.featured_until} />
      </div>

      {/* MIDDLE: huge brand + model */}
      <div className="pointer-events-none absolute left-6 right-6 bottom-[160px] sm:bottom-[140px]">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-teal-300 mb-2">
          Featured Listing
        </div>
        <p className="text-3xl sm:text-5xl font-black text-white leading-[0.95] tracking-tight drop-shadow-2xl">
          {shoe.brand === 'Other' ? (
            <span className="text-teal-300">{shoe.model}</span>
          ) : (
            <>{shoe.brand}<br /><span className="text-teal-300">{shoe.model}</span></>
          )}
        </p>
      </div>

      {/* BOTTOM: spec chips + price + CTA */}
      <div className="pointer-events-none absolute left-5 right-5 bottom-5">
        {/* Chips */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <span className="rounded-full backdrop-blur-md bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
            {CONDITIONS[shoe.condition]}
          </span>
          {(shoe.size_eu || shoe.size_us || shoe.size_cm) && (
            <span className="rounded-full backdrop-blur-md bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-mono text-white tabular-nums">
              {formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}
            </span>
          )}
          {shoe.mileage_km != null && (
            <span className="rounded-full backdrop-blur-md bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-mono text-white tabular-nums">
              {shoe.mileage_km.toLocaleString()} km
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          {/* Price block */}
          <div className="min-w-0">
            {shoe.listing_type === 'for_sale' && shoe.price_php ? (
              <>
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-stone-400">
                  {shoe.is_negotiable ? 'From' : 'Asking'}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[44px] font-black text-white leading-none tabular-nums tracking-tight">
                    {formatPrice(shoe.price_php)}
                  </span>
                </div>
              </>
            ) : shoe.listing_type === 'donate' ? (
              <>
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-green-300">
                  Donation
                </div>
                <div className="text-[40px] font-black text-white leading-none tracking-tight">
                  Free
                </div>
              </>
            ) : (
              <div className="text-2xl font-black text-white">Open to offers</div>
            )}
            {seller?.display_name && (
              <div className="text-[11px] text-stone-300 mt-1 truncate">
                Listed by{' '}
                <span className="font-semibold text-white">{seller.display_name}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <span className="flex-none flex items-center gap-2 rounded-full bg-teal-400 group-hover:bg-teal-300 text-gray-900 px-5 py-3 text-sm font-black uppercase tracking-wider transition-all group-hover:scale-[1.03]">
            View Pair
            <svg
              width="14"
              height="14"
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
        className="absolute top-0 right-12 w-1.5 h-20 bg-teal-400"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-16 w-1 h-12 bg-orange-400"
        aria-hidden="true"
      />
    </article>
  );
}
