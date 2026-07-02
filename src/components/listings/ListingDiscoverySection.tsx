import Image from 'next/image';
import Link from 'next/link';
import type { Shoe } from '@/types';
import { CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize, getListingPath, getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

interface ListingDiscoverySectionProps {
  similarListings: Shoe[];
  sellerListings: Shoe[];
}

export function ListingDiscoverySection({ similarListings, sellerListings }: ListingDiscoverySectionProps) {
  if (similarListings.length === 0 && sellerListings.length === 0) {
    return (
      <SurfaceCard className="mt-6 border-teal-500/20 bg-teal-500/[0.04] p-4 sm:p-5">
        <FindSizeCta compact />
      </SurfaceCard>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {similarListings.length > 0 && (
        <SurfaceCard className="overflow-hidden p-0">
          <DiscoveryHeader title="Similar pairs" subtitle="Same brand, nearby size, or similar price" />
          <ListingRail listings={similarListings} />
        </SurfaceCard>
      )}

      {sellerListings.length > 0 && (
        <SurfaceCard className="overflow-hidden p-0">
          <DiscoveryHeader title="More from this seller" subtitle="Other active running shoes from this seller" />
          <ListingRail listings={sellerListings} />
        </SurfaceCard>
      )}

      <SurfaceCard className="border-teal-500/20 bg-teal-500/[0.04] p-4 sm:p-5">
        <FindSizeCta />
      </SurfaceCard>
    </div>
  );
}

function DiscoveryHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-gray-100">{title}</h2>
        <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ListingRail({ listings }: { listings: Shoe[] }) {
  return (
    <div className="overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3">
        {listings.map((shoe) => (
          <MiniListingCard key={shoe.id} shoe={shoe} />
        ))}
      </div>
    </div>
  );
}

function MiniListingCard({ shoe }: { shoe: Shoe }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const image = shoe.shoe_images?.find((item) => item.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = image && supabaseUrl
    ? getPublicUrl(supabaseUrl, image.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.miniListing)
    : null;
  const title = formatListingName(shoe.brand, shoe.model);
  const size = shoe.shop_id && shoe.inventory_mode === 'multi'
    ? getVariantSizeLabel(shoe)
    : formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type);
  const price = shoe.listing_type === 'donate'
    ? 'Free'
    : shoe.price_php != null
      ? formatPrice(shoe.price_php)
      : 'See listing';

  return (
    <Link
      href={getListingPath(shoe)}
      className="group flex w-[235px] shrink-0 gap-3 rounded-xl border border-white/[0.08] bg-slate-950/55 p-2.5 transition-colors hover:border-teal-400/35 hover:bg-slate-950/80"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
            GP
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-100 group-hover:text-teal-200">
          {title}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500">{size || CONDITIONS[shoe.condition]}</p>
        <p className="mt-1 text-sm font-bold text-teal-300">{price}</p>
      </div>
    </Link>
  );
}

function getVariantSizeLabel(shoe: Shoe): string {
  const inStock = (shoe.shoe_variants ?? []).filter((variant) => variant.quantity > 0);
  if (inStock.length === 0) return 'Check sizes';
  if (inStock.length === 1) {
    return formatSize(inStock[0].size_eu, inStock[0].size_us, inStock[0].size_cm, inStock[0].us_size_type) || '1 size';
  }
  return `${inStock.length} sizes available`;
}

function FindSizeCta({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-gray-100">Can&apos;t find your size?</h2>
        {!compact && (
          <p className="mt-1 text-xs leading-5 text-gray-400">
            Post what you&apos;re looking for so sellers can offer the right pair.
          </p>
        )}
      </div>
      <Link
        href="/looking-for/new"
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
      >
        Post Looking For
      </Link>
    </div>
  );
}
