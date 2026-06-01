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
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { getSavedListingIds } from '@/lib/savedListings';
import {
  getPersonalizationBadges,
  hasPreferredLocation,
  hasPreferredSize,
  sortByPersonalization,
  type PersonalizationBadges,
} from '@/lib/personalization';
import type { Profile, Shoe } from '@/types';

export const metadata: Metadata = {
  title: 'GP Marketplace',
  description:
    'Browse GP Marketplace for brand-new and pre-loved running shoes from Pampanga runners, plus Central Luzon and NCR sellers who serve Pampanga buyers.',
  alternates: { canonical: '/browse' },
};

interface BrowsePageProps {
  searchParams: {
    type?: string;
    brand?: string;
    condition?: string;
    size?: string;
    size_unit?: string;
    us_size_type?: string;
    size_eu?: string;
    q?: string;
    sort?: string;
  };
}

type SizeUnit = 'eu' | 'us' | 'cm';
type SortKey = 'mixed' | 'price_asc' | 'price_desc';
const FRESH_LISTING_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseSort(raw: string | undefined): SortKey {
  if (raw === 'price_asc' || raw === 'price_desc') return raw;
  return 'mixed';
}

function sortListings(listings: Shoe[], key: SortKey, profile?: Profile | null): Shoe[] {
  let arr = [...listings];
  if (key === 'mixed') {
    // Fisher-Yates shuffle. Default sort: fair rotation across all listings in
    // the bucket so old listings still surface and re-listing can't game the order.
    // Freshness is also communicated via the per-card "Just Posted" pill.
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return sortByPersonalization(arr, profile);
  }
  if (key === 'price_asc') {
    arr = arr.sort((a, b) => (a.price_php ?? Number.POSITIVE_INFINITY) - (b.price_php ?? Number.POSITIVE_INFINITY));
    return sortByPersonalization(arr, profile);
  }
  arr = arr.sort((a, b) => (b.price_php ?? Number.NEGATIVE_INFINITY) - (a.price_php ?? Number.NEGATIVE_INFINITY));
  return sortByPersonalization(arr, profile);
}

function getSizeFilter(searchParams: BrowsePageProps['searchParams']): { column: 'size_eu' | 'size_us' | 'size_cm'; value: number; usSizeType: string | null } | null {
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
    usSizeType: unit === 'us' && ['mens', 'womens', 'unisex'].includes(searchParams.us_size_type ?? '')
      ? searchParams.us_size_type ?? null
      : null,
  };
}

async function getListings(searchParams: BrowsePageProps['searchParams'], profile?: Profile | null): Promise<Shoe[]> {
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
  if (sizeFilter) {
    query = query.eq(sizeFilter.column, sizeFilter.value);
    if (sizeFilter.usSizeType) query = query.eq('us_size_type', sizeFilter.usSizeType);
  }
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
    ...sortListings(sponsoredWithPhoto, sortKey, profile),
    ...sortListings(freshWithPhoto, sortKey, profile),
    ...sortListings(regularWithPhoto, sortKey, profile),
    ...sortListings(lowPriority, sortKey, profile),
  ];
}

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if (!profile) return null;
  return profile as Profile;
}

async function getCurrentProfileRequests(profile: Profile | null, listingIds: string[]): Promise<{ requestListingIds: Set<string>; savedListingIds: Set<string> }> {
  if (!profile) return { requestListingIds: new Set(), savedListingIds: new Set() };
  const supabase = createClient();
  const { data: requests } = await supabase
    .from('purchase_requests')
    .select('listing_id')
    .eq('buyer_id', profile.id)
    .in('status', ['pending', 'accepted']);

  const requestListingIds = new Set((requests ?? []).map((r: { listing_id: string }) => r.listing_id));
  const savedListingIds = await getSavedListingIds(profile.id, listingIds);
  return { requestListingIds, savedListingIds };
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const profile = await getCurrentProfile();
  const shoes = await getListings(searchParams, profile);
  const userContext = await getCurrentProfileRequests(profile, shoes.map(s => s.id));
  const offerCounts = await getOfferCounts(shoes.map(s => s.id));
  const personalizationEnabled = !!profile?.personalized_browse_enabled;
  const hasSizePreference = hasPreferredSize(profile);
  const hasLocationPreference = hasPreferredLocation(profile);
  const personalizationBadges: Record<string, PersonalizationBadges> = {};
  if (personalizationEnabled && (hasSizePreference || hasLocationPreference)) {
    shoes.forEach((shoe) => {
      personalizationBadges[shoe.id] = getPersonalizationBadges(profile, shoe);
    });
  }

  return (
    <PageShell>
      <FirstListingNudge />
      <PageHeader
        title="GP Marketplace"
        subtitle="Running shoes for sale, donation, and local deals in one focused place for Pampanga runners, with Central Luzon and NCR sellers welcome if they serve Pampanga buyers."
      >
        <Suspense>
          <FilterPanel listingCount={shoes.length} />
        </Suspense>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {profile && personalizationEnabled && (!hasSizePreference || !hasLocationPreference) && (
          <SurfaceCard className="border-teal-500/20 bg-teal-500/[0.04] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-100">
                  Make GP Marketplace feel more personal
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Add {hasSizePreference ? 'your city/province' : hasLocationPreference ? 'your primary shoe size' : 'your primary size and city'} so matching pairs appear first.
                </p>
              </div>
              <Link
                href="/profile"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-teal-400/35 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10"
              >
                Update profile
              </Link>
            </div>
          </SurfaceCard>
        )}

        <ListingGrid
          shoes={shoes}
          currentProfileId={profile?.id}
          currentProfileIsAdmin={profile?.is_admin}
          currentProfileFbUsername={profile?.fb_username}
          myRequestListingIds={userContext.requestListingIds}
          savedListingIds={userContext.savedListingIds}
          offerCounts={offerCounts}
          personalizationBadges={personalizationBadges}
          emptyMessage="No listings match your filters. Try adjusting them."
        />

        {/* Looking For CTA — full width below on desktop, last on mobile */}
        <section className="w-full">
          <SurfaceCard glow className="border-teal-500/20 bg-teal-500/5 p-6 text-center">
            <h3 className="text-lg font-bold text-gray-100">
              Can&apos;t find the right pair?
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              Post what you&apos;re looking for and let the community drop available
              links.
            </p>

            <Link
              href="/looking-for/new"
              className="mt-4 inline-block w-full"
            >
              <Button className="w-full sm:w-auto">
                Post what you&apos;re looking for
              </Button>
            </Link>
          </SurfaceCard>
        </section>

        <SurfaceCard className="border-teal-500/20 bg-teal-500/[0.04] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                Price Check
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-100">
                Brand New Price Compare?
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                Compare official brand running shoe pages before buying pre-loved pairs
                from Go Pair PH sellers.
              </p>
            </div>
            <Link
              href="/official-running-shoe-brand-links-ph"
              className="inline-flex w-full items-center justify-center rounded-lg border border-teal-400/35 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10 sm:w-auto"
            >
              View official brand links
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard className="border-white/[0.08] bg-slate-950/55 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                Seller Tool
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-100">
                Not sure how much to sell your shoes for?
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                Estimate a suggested resale range for brand-new or pre-loved running
                shoes in the Philippines before posting.
              </p>
            </div>
            <Link
              href="/price-guide"
              className="inline-flex w-full items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400 sm:w-auto"
            >
              Check Price Guide
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </PageShell>
  );
}
