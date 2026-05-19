export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { FirstListingNudge } from '@/components/listings/FirstListingNudge';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { FilterPanel } from '@/components/listings/FilterPanel';
import { SortSelector } from '@/components/listings/SortSelector';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { getSavedListingIds } from '@/lib/savedListings';
import type { Shoe } from '@/types';

export const metadata: Metadata = {
  title: 'Marketplace',
  description:
    'Shop the Go Pair PH marketplace for new and pre-loved running shoes from community sellers, shop sellers, and nearby sellers who serve Pampanga buyers.',
  alternates: { canonical: '/browse' },
};

interface BrowsePageProps {
  searchParams: {
    type?: string;
    brand?: string;
    condition?: string;
    size?: string;
    size_unit?: string;
    size_eu?: string;
    q?: string;
    sort?: string;
  };
}

type SizeUnit = 'eu' | 'us' | 'cm';
type SortKey = 'mixed' | 'newest' | 'price_asc' | 'price_desc';
const FRESH_LISTING_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseSort(raw: string | undefined): SortKey {
  if (raw === 'newest' || raw === 'price_asc' || raw === 'price_desc') return raw;
  return 'mixed';
}

function sortListings(listings: Shoe[], key: SortKey): Shoe[] {
  const arr = [...listings];
  if (key === 'mixed') {
    // Fisher-Yates shuffle. Default sort: fair rotation across all listings in
    // the bucket so old listings still surface and re-listing can't game the order.
    // Freshness is also communicated via the per-card "Just Posted" pill.
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  if (key === 'newest') {
    return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  if (key === 'price_asc') {
    return arr.sort((a, b) => (a.price_php ?? Number.POSITIVE_INFINITY) - (b.price_php ?? Number.POSITIVE_INFINITY));
  }
  return arr.sort((a, b) => (b.price_php ?? Number.NEGATIVE_INFINITY) - (a.price_php ?? Number.NEGATIVE_INFINITY));
}

function getSizeFilter(searchParams: BrowsePageProps['searchParams']): { column: 'size_eu' | 'size_us' | 'size_cm'; value: number } | null {
  const rawValue = searchParams.size ?? searchParams.size_eu;
  if (!rawValue) return null;

  const value = Number.parseFloat(rawValue);
  if (!Number.isFinite(value)) return null;

  const unit = ['eu', 'us', 'cm'].includes(searchParams.size_unit ?? '')
    ? searchParams.size_unit as SizeUnit
    : 'eu';

  return {
    column: unit === 'us' ? 'size_us' : unit === 'cm' ? 'size_cm' : 'size_eu',
    value,
  };
}

async function getListings(searchParams: BrowsePageProps['searchParams']): Promise<Shoe[]> {
  const supabase = createClient();
  let query = supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('status', 'active')
    .eq('listed_in_main_feed', true)
    .eq('has_stock', true);

  if (searchParams.type) query = query.eq('listing_type', searchParams.type);
  if (searchParams.brand) query = query.ilike('brand', searchParams.brand);
  if (searchParams.condition) query = query.eq('condition', searchParams.condition);
  const sizeFilter = getSizeFilter(searchParams);
  if (sizeFilter) query = query.eq(sizeFilter.column, sizeFilter.value);
  if (searchParams.q) query = query.or(`brand.ilike.%${searchParams.q}%,model.ilike.%${searchParams.q}%`);

  const { data } = await query.limit(60);
  const all = (data as Shoe[]) ?? [];

  // Sort within quality buckets. Image-backed sponsored listings lead, fresh
  // image-backed listings come next, regular image-backed listings rotate in
  // mixed mode, and low-priority listings stay at the bottom even if sponsored.
  const sortKey = parseSort(searchParams.sort);
  const now = Date.now();
  const isActiveSponsored = (s: Shoe) =>
    s.sponsored_until != null && new Date(s.sponsored_until).getTime() > now;
  const isFresh = (s: Shoe) =>
    now - new Date(s.created_at).getTime() < FRESH_LISTING_WINDOW_MS;
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  const isQualityFlagged = (s: Shoe) => !!s.quality_flagged_at;

  const sponsoredWithPhoto: Shoe[] = [];
  const freshWithPhoto: Shoe[] = [];
  const regularWithPhoto: Shoe[] = [];
  const lowPriority: Shoe[] = [];

  all.forEach((shoe) => {
    if (isQualityFlagged(shoe) || !hasPhoto(shoe)) {
      lowPriority.push(shoe);
    } else if (isActiveSponsored(shoe)) {
      sponsoredWithPhoto.push(shoe);
    } else if (isFresh(shoe)) {
      freshWithPhoto.push(shoe);
    } else if (hasPhoto(shoe)) {
      regularWithPhoto.push(shoe);
    }
  });

  return [
    ...sortListings(sponsoredWithPhoto, sortKey),
    ...sortListings(freshWithPhoto, sortKey),
    ...sortListings(regularWithPhoto, sortKey),
    ...sortListings(lowPriority, sortKey),
  ];
}

function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/browse">
      <div className="flex gap-2">
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Search brand or model..."
          className="flex-1 rounded-lg border border-white/[0.08] bg-slate-950/70 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 shadow-inner shadow-black/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/15 transition-colors hover:bg-teal-400"
        >
          Search
        </button>
      </div>
    </form>
  );
}

async function getCurrentProfileAndRequests(listingIds: string[]): Promise<{ profileId: string; isAdmin: boolean; requestListingIds: Set<string>; savedListingIds: Set<string> } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id, is_admin').eq('user_id', user.id).single();
  if (!profile) return null;

  const { data: requests } = await supabase
    .from('purchase_requests')
    .select('listing_id')
    .eq('buyer_id', profile.id)
    .in('status', ['pending', 'accepted']);

  const requestListingIds = new Set((requests ?? []).map((r: { listing_id: string }) => r.listing_id));
  const savedListingIds = await getSavedListingIds(profile.id, listingIds);
  return { profileId: profile.id, isAdmin: !!profile.is_admin, requestListingIds, savedListingIds };
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const shoes = await getListings(searchParams);
  const userContext = await getCurrentProfileAndRequests(shoes.map(s => s.id));
  const offerCounts = await getOfferCounts(shoes.map(s => s.id));

  return (
    <PageShell>
      <FirstListingNudge />
      <PageHeader
        title="Marketplace"
        subtitle="Find running shoes from community sellers, independent shop sellers, and nearby sellers who can meet, deliver, or ship to Pampanga buyers."
      >
        <SurfaceCard className="p-3 sm:p-4">
          <SearchBar defaultValue={searchParams.q} />
        </SurfaceCard>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {/* Filter + Listings row */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Listings — first on mobile, right side on desktop */}
          <div className="order-1 lg:order-2 flex-1 min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {shoes.length} listing{shoes.length !== 1 ? "s" : ""} found
              </p>
              <Suspense>
                <SortSelector />
              </Suspense>
            </div>

            <ListingGrid
              shoes={shoes}
              currentProfileId={userContext?.profileId}
              currentProfileIsAdmin={userContext?.isAdmin}
              myRequestListingIds={userContext?.requestListingIds}
              savedListingIds={userContext?.savedListingIds}
              offerCounts={offerCounts}
              emptyMessage="No listings match your filters. Try adjusting them."
            />
          </div>

          {/* Filter Panel — second on mobile, left sidebar on desktop */}
          <div className="order-2 lg:order-1 lg:shrink-0 lg:w-fit">
            <Suspense>
              <FilterPanel />
            </Suspense>
          </div>
        </div>

        {/* Find My Pair CTA — full width below on desktop, last on mobile */}
        <section className="w-full">
          <SurfaceCard glow className="border-teal-500/20 bg-teal-500/5 p-6 text-center">
            <h3 className="text-lg font-bold text-gray-100">
              Can&apos;t find the right pair?
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              Post a pair request and let the community drop available
              links.
            </p>

            <Link
              href="/find-my-pair/new"
              className="mt-4 inline-block w-full"
            >
              <Button className="w-full sm:w-auto">
                Post a Pair Request
              </Button>
            </Link>
          </SurfaceCard>
        </section>
      </div>
    </PageShell>
  );
}
