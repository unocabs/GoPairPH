export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { FirstListingNudge } from '@/components/listings/FirstListingNudge';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { SaveSearchButton } from '@/components/listings/SaveSearchButton';
import { FilterPanel } from '@/components/listings/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { getSavedListingCounts, getSavedListingIds } from '@/lib/savedListings';
import { compareListingFreshness, isFreshListing } from '@/lib/listingFreshness';
import {
  getPersonalizationBadges,
  hasPreferredLocation,
  hasPreferredSize,
  sortByPersonalization,
  type PersonalizationBadges,
} from '@/lib/personalization';
import type { Profile, Shoe } from '@/types';
import { runningShoesFirst } from '@/lib/runningShoeReviews';
import { buildBrowseSections, getBrowseRecommendations, RECOMMENDATION_BATCH_SIZE } from '@/lib/browseSections';
import { getBrowseRotation, orderBrowseRotation } from '@/lib/browseRotation';
import { BrowseLoadMore } from '@/components/listings/BrowseLoadMore';
import { withFlashDealPrice } from '@/lib/flashDeals';

export const metadata: Metadata = {
  title: 'Browse Running Shoes',
  description:
    'Browse brand-new, pre-loved, second-hand, and free running shoes from Central Luzon and NCR sellers on Go Pair PH.',
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
    limit?: string;
    rotation?: string;
    recommended_limit?: string;
  };
}

type SizeUnit = 'eu' | 'us' | 'cm';
type SortKey = 'mixed' | 'price_asc' | 'price_desc';
const BROWSE_BATCH_SIZE = 24;
const BROWSE_MAX_VISIBLE = 240;
const SEARCH_QUERY_MAX_LENGTH = 80;

function getSearchTokens(rawQuery: string | undefined): string[] {
  return (rawQuery ?? '')
    .slice(0, SEARCH_QUERY_MAX_LENGTH)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Treat user-entered LIKE wildcard characters literally.
    .map(token => token.replace(/[\\%_]/g, '\\$&'));
}

function parseSort(raw: string | undefined): SortKey {
  if (raw === 'price_asc' || raw === 'price_desc') return raw;
  return 'mixed';
}

function parseVisibleLimit(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(value)) return BROWSE_BATCH_SIZE;

  const roundedToBatch = Math.ceil(value / BROWSE_BATCH_SIZE) * BROWSE_BATCH_SIZE;
  return Math.min(BROWSE_MAX_VISIBLE, Math.max(BROWSE_BATCH_SIZE, roundedToBatch));
}

function parseRecommendedLimit(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(value)) return RECOMMENDATION_BATCH_SIZE;
  return Math.min(BROWSE_MAX_VISIBLE, Math.max(RECOMMENDATION_BATCH_SIZE,
    Math.ceil(value / RECOMMENDATION_BATCH_SIZE) * RECOMMENDATION_BATCH_SIZE));
}

function getLoadMoreHref(searchParams: BrowsePageProps['searchParams'], nextLimit: number, rotation: string, recommendedLimit?: number): string {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== 'limit') params.set(key, value);
  });
  params.set('limit', String(nextLimit));
  params.set('rotation', rotation);
  if (recommendedLimit !== undefined) params.set('recommended_limit', String(recommendedLimit));
  return `/browse?${params.toString()}`;
}

function sortListings(listings: Shoe[], key: SortKey, profile: Profile | null | undefined, rotation: string, fresh = false): Shoe[] {
  let arr = [...listings];
  if (key === 'mixed') {
    // New and renewed listings lead for 24 hours, newest freshness action first.
    if (fresh) return sortByPersonalization(arr.sort(compareListingFreshness), profile);
    // Keep the rotation stable throughout Load more, including across midnight.
    return sortByPersonalization(orderBrowseRotation(arr, rotation), profile);
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

async function getListings(searchParams: BrowsePageProps['searchParams'], profile: Profile | null, rotation: string): Promise<Shoe[]> {
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
  getSearchTokens(searchParams.q).forEach((token) => {
    query = query.ilike('search_text', `%${token}%`);
  });

  const { data, error } = await query
    .order('running_relevance_flagged', { ascending: true })
    .order('freshness_at', { ascending: false })
    .order('id')
    .limit(BROWSE_MAX_VISIBLE);
  if (error) {
    console.error('[browse] Failed to load listings', error);
    throw new Error('Unable to load marketplace listings right now.');
  }
  const all = ((data as Shoe[]) ?? []).map(shoe => withFlashDealPrice(shoe));

  // Sort within quality buckets. Image-backed sponsored listings lead, fresh
  // image-backed listings come next, regular image-backed listings rotate in
  // mixed mode, and low-priority listings stay at the bottom even if sponsored.
  const sortKey = parseSort(searchParams.sort);
  const now = Date.now();
  const isActiveSponsored = (s: Shoe) =>
    s.sponsored_until != null && new Date(s.sponsored_until).getTime() > now;
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
    } else if (isFreshListing(shoe, now)) {
      freshWithPhoto.push(shoe);
    } else if (hasPhoto(shoe)) {
      regularWithPhoto.push(shoe);
    }
  });

  return runningShoesFirst([
    ...sortListings(sponsoredWithPhoto, sortKey, profile, rotation),
    ...sortListings(freshWithPhoto, sortKey, profile, rotation, true),
    ...sortListings(regularWithPhoto, sortKey, profile, rotation),
    ...sortListings(lowPriority, sortKey, profile, rotation),
  ]);
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
  const rotation = getBrowseRotation(searchParams.rotation);
  const shoes = await getListings(searchParams, profile, rotation);
  const visibleLimit = parseVisibleLimit(searchParams.limit);
  const personalizationEnabled = !!profile?.personalized_browse_enabled;
  const hasSizePreference = hasPreferredSize(profile);
  const hasLocationPreference = hasPreferredLocation(profile);
  const personalizationBadges: Record<string, PersonalizationBadges> = {};
  if (personalizationEnabled && (hasSizePreference || hasLocationPreference)) {
    shoes.forEach((shoe) => {
      personalizationBadges[shoe.id] = getPersonalizationBadges(profile, shoe);
    });
  }
  const canShowRecommendations = personalizationEnabled && hasSizePreference && hasLocationPreference;
  const totalRecommendations = canShowRecommendations ? getBrowseRecommendations(shoes, personalizationBadges).length : 0;
  const recommendedLimit = Math.min(parseRecommendedLimit(searchParams.recommended_limit), Math.max(RECOMMENDATION_BATCH_SIZE, totalRecommendations));
  // Expanding recommendations adds its own budget so discovery stays populated.
  const expandedVisibleLimit = Math.min(BROWSE_MAX_VISIBLE,
    visibleLimit + (canShowRecommendations ? recommendedLimit - RECOMMENDATION_BATCH_SIZE : 0));
  const sections = buildBrowseSections(shoes, canShowRecommendations, personalizationBadges, {
    recommendationLimit: recommendedLimit,
    visibleLimit: expandedVisibleLimit,
  });
  const visibleShoes = sections.flatMap(section => section.shoes);
  const userContext = await getCurrentProfileRequests(profile, visibleShoes.map(s => s.id));
  const offerCounts = await getOfferCounts(visibleShoes.map(s => s.id));
  const savedListingCounts = await getSavedListingCounts(visibleShoes.map(s => s.id));
  const hasMoreListings = visibleShoes.length < shoes.length;
  const nextVisibleLimit = Math.min(visibleLimit + BROWSE_BATCH_SIZE, BROWSE_MAX_VISIBLE, shoes.length);

  return (
    <PageShell>
      <FirstListingNudge />
      <PageHeader
        title="Browse Running Shoes"
      >
        <Suspense>
          <FilterPanel listingCount={shoes.length} />
        </Suspense>
      </PageHeader>

      <div className="flex flex-col gap-6" data-browse-results style={{ overflowAnchor: 'none' }}>
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

        {shoes.length === 0 && (
          <SurfaceCard className="border-teal-400/20 p-4">
            <h2 className="text-base font-semibold text-gray-100">No matching shoes yet</h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              {(searchParams.q ?? '').trim().length >= 2
                ? 'Save your search keywords and we’ll email you when a new listing matches. You can also check our Facebook group for more running shoes.'
                : 'Enter a brand or model in the search box to save a search and get email alerts for new matching listings. You can also check our Facebook group for more running shoes.'}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
              <SaveSearchButton keyword={(searchParams.q ?? '').slice(0, SEARCH_QUERY_MAX_LENGTH)} variant="button" />
              <a href="https://www.facebook.com/groups/gopairph" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-teal-400/35 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                Check Facebook group<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            {(searchParams.q ?? '').trim().length >= 2 && (
              <p className="mt-2 text-xs leading-5 text-gray-400">Alerts use your search keywords; size and other filters aren’t included.</p>
            )}
            <p className="mt-4 text-sm leading-6 text-gray-400">
              Try a broader search or{' '}
              <Link href="/browse" className="text-teal-300 underline underline-offset-4 hover:text-teal-200">clear filters and browse shoes</Link>.
            </p>
            <Link href="/looking-for/new" className="mt-1 inline-flex min-h-11 items-center text-sm text-gray-300 underline underline-offset-4 hover:text-white">Post what you’re looking for</Link>
          </SurfaceCard>
        )}

        {sections.map(({ kind, shoes: sectionShoes }) => (
          <section key={kind}>
            {kind === 'recommended' && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                  Matched to your profile
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-100">Recommended For You</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                  Shoes that match your saved size or location.
                </p>
              </div>
            )}
            {kind === 'discover' && (
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-100">Discover More Running Shoes</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                  More active shoes from the Go Pair PH marketplace.
                </p>
              </div>
            )}
            <ListingGrid
              shoes={sectionShoes}
              currentProfileId={profile?.id}
              currentProfileIsAdmin={profile?.is_admin}
              currentProfileFbUsername={profile?.fb_username}
              myRequestListingIds={userContext.requestListingIds}
              savedListingIds={userContext.savedListingIds}
              savedListingCounts={savedListingCounts}
              offerCounts={offerCounts}
              personalizationBadges={personalizationBadges}
            />
            {kind === 'recommended' && (
              <div className="mt-5">
                <BrowseLoadMore
                  href={sectionShoes.length < totalRecommendations
                    ? getLoadMoreHref(searchParams, visibleLimit, rotation, Math.min(recommendedLimit + RECOMMENDATION_BATCH_SIZE, totalRecommendations))
                    : null}
                  visibleCount={sectionShoes.length}
                  total={totalRecommendations}
                  label="Show more recommendations"
                  countLabel="recommended shoes"
                />
              </div>
            )}
          </section>
        ))}

        <BrowseLoadMore
          href={hasMoreListings ? getLoadMoreHref(searchParams, nextVisibleLimit, rotation) : null}
          visibleCount={visibleShoes.length}
          total={shoes.length}
        />

        {/* Looking For CTA — full width below on desktop, last on mobile */}
        {shoes.length > 0 && <section className="w-full">
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
        </section>}

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
              Check Shoe Price Estimator
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard className="border-white/[0.08] bg-slate-950/55 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                Marketplace Guides
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-100">
                Buying or selling running shoes?
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                Read our guides for buying, selling, and sharing brand-new, pre-loved,
                and second-hand running shoes in the Philippines and Pampanga.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:shrink-0">
              <Link href="/buy-and-sell-running-shoes-philippines" className="inline-flex w-full items-center justify-center rounded-lg border border-teal-400/35 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10">
                Philippines guide
              </Link>
              <Link href="/buy-and-sell-running-shoes-pampanga" className="inline-flex w-full items-center justify-center rounded-lg border border-teal-400/35 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10">
                Pampanga guide
              </Link>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </PageShell>
  );
}
