export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { compareListingFreshness } from '@/lib/listingFreshness';
import { isHomepageTopPick, selectHomepageTopPicks, type HomepageTopPickCandidate } from '@/lib/homepageTopPicks';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient, createPublicClient, createServiceClient } from '@/lib/supabase/server';
import { FeaturedListing } from '@/components/home/FeaturedListing';
import { HomeListingGrid } from '@/components/home/HomeListingGrid';
import { MobileHeroSearch } from '@/components/home/MobileHeroSearch';
import { HeroTrackedLink } from '@/components/home/HeroTrackedLink';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { PostListingFeedbackPrompt } from '@/components/feedback/PostListingFeedbackPrompt';
import { getSavedListingCounts, getSavedListingIds } from '@/lib/savedListings';
import {
  getPersonalizationBadges,
  hasPreferredLocation,
  hasPreferredSize,
  sortByPersonalization,
  type PersonalizationBadges,
} from '@/lib/personalization';
import type { Profile, Shoe } from '@/types';
import { runningShoesFirst } from '@/lib/runningShoeReviews';

const HOME_TITLE = 'Go Pair PH — Buy and Sell Running Shoes';
const HOME_DESCRIPTION = 'Buy and sell running shoes in one focused place. Sellers can create one clean Go Pair PH listing, then share it to Facebook, Messenger, Marketplace, and running groups.';

type HomepageSiteSettings = {
  showHomepageActivityPublicly: boolean;
};

const HOME_LISTING_SELECT = `
  id,
  slug,
  seller_id,
  brand,
  model,
  size_eu,
  size_us,
  size_cm,
  us_size_type,
  condition,
  mileage_km,
  listing_type,
  price_php,
  srp_php,
  status,
  created_at,
  updated_at,
  renewed_at,
  shop_id,
  has_stock,
  listed_in_main_feed,
  inventory_mode,
  inspected_by_go_pair_at,
  featured_until,
  sponsored_until,
  is_negotiable,
  quality_flagged_at,
  running_relevance_flagged,
  profiles!shoes_seller_id_fkey(
    id,
    display_name,
    location_city,
    location_province,
    location_region,
    is_verified
  ),
  shops(
    id,
    location
  ),
  shoe_images(
    id,
    shoe_id,
    storage_path,
    view_type,
    order,
    created_at
  ),
  shoe_variants(
    id,
    shoe_id,
    size_eu,
    size_us,
    size_cm,
    us_size_type,
    quantity,
    created_at,
    updated_at
  )
`;

const RECENTLY_SOLD_LIMIT = 4;
const RECENTLY_SOLD_LOOKAHEAD_LIMIT = 24;
const DEFAULT_RECENTLY_SOLD_EXCLUDED_EMAILS = [
  'rgiancabrera@gmail.com',
  'rgianmcabrera@gmail.com',
  'pandarunningclub@gmail.com',
];

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: HOME_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  return (profile as Profile) ?? null;
}

const getHomepageListings = unstable_cache(async function getHomepageListings(): Promise<Shoe[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('shoes')
    .select(HOME_LISTING_SELECT)
    .eq('status', 'active')
    .eq('has_stock', true)
    .eq('listed_in_main_feed', true)
    .is('quality_flagged_at', null)
    .order('running_relevance_flagged', { ascending: true })
    .order('freshness_at', { ascending: false })
    .order('id')
    .limit(24);
  const all = (data as unknown as Shoe[]) ?? [];
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return runningShoesFirst(all
    .sort((a, b) => {
      const aPhoto = hasPhoto(a);
      const bPhoto = hasPhoto(b);
      if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
      return compareListingFreshness(a, b);
    }));
}, ['homepage-listings'], { revalidate: 60, tags: ['homepage-listings'] });

// Load only the rotation pool here; images and seller/stock details are fetched
// for the four selected listings below, independently of recent-listing age.
const getHomepageTopPickCandidates = unstable_cache(async function getHomepageTopPickCandidates(): Promise<HomepageTopPickCandidate[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('shoes')
    .select('id, status, has_stock, listed_in_main_feed, quality_flagged_at, running_relevance_flagged, sponsored_until, shoe_images!inner(id)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .eq('listed_in_main_feed', true)
    .is('quality_flagged_at', null)
    .eq('running_relevance_flagged', false)
    .gt('sponsored_until', new Date().toISOString())
    .order('id');

  if (error) {
    console.error('Unable to load homepage Top Picks:', error);
    return [];
  }
  return (data as HomepageTopPickCandidate[]) ?? [];
}, ['homepage-top-pick-candidates'], { revalidate: 60, tags: ['homepage-listings'] });

const getHomepageTopPickListings = unstable_cache(async function getHomepageTopPickListings(ids: string[]): Promise<Shoe[]> {
  if (ids.length === 0) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('shoes')
    .select(HOME_LISTING_SELECT)
    .in('id', ids)
    .eq('status', 'active')
    .eq('has_stock', true)
    .eq('listed_in_main_feed', true)
    .is('quality_flagged_at', null)
    .eq('running_relevance_flagged', false)
    .gt('sponsored_until', new Date().toISOString());

  if (error) {
    console.error('Unable to load homepage Top Pick details:', error);
    return [];
  }
  const shoes = (data as unknown as Shoe[]) ?? [];
  return ids.flatMap(id => shoes.filter(shoe => shoe.id === id));
}, ['homepage-top-pick-listings'], { revalidate: 60, tags: ['homepage-listings'] });

function getRecentlySoldExcludedEmails() {
  return (process.env.HOMEPAGE_RECENTLY_SOLD_EXCLUDED_EMAILS ?? DEFAULT_RECENTLY_SOLD_EXCLUDED_EMAILS.join(','))
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

async function getExcludedSellerIdsByEmail(service: ReturnType<typeof createServiceClient>, emails: string[]) {
  const targetEmails = new Set(emails);
  if (targetEmails.size === 0) return [];

  const userIds: string[] = [];
  const perPage = 1000;
  for (let page = 1; page < 50 && targetEmails.size > 0; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    for (const user of users) {
      const email = user.email?.toLowerCase();
      if (email && targetEmails.has(email)) {
        userIds.push(user.id);
        targetEmails.delete(email);
      }
    }

    if (users.length < perPage) break;
  }

  if (userIds.length === 0) return [];

  const { data, error } = await service
    .from('profiles')
    .select('id')
    .in('user_id', userIds);

  if (error) throw error;
  return ((data as Array<{ id: string }> | null) ?? []).map(profile => profile.id);
}

const getRecentlySoldListings = unstable_cache(async function getRecentlySoldListings(): Promise<Shoe[]> {
  const service = createServiceClient();

  try {
    const excludedSellerIds = new Set(await getExcludedSellerIdsByEmail(service, getRecentlySoldExcludedEmails()));
    const { data, error } = await service
      .from('shoes')
      .select(HOME_LISTING_SELECT)
      .in('status', ['sold', 'donated'])
      .is('quality_flagged_at', null)
      .order('updated_at', { ascending: false })
      .limit(RECENTLY_SOLD_LOOKAHEAD_LIMIT);

    if (error) throw error;

    return ((data as unknown as Shoe[]) ?? [])
      .filter(shoe => !excludedSellerIds.has(shoe.seller_id))
      .slice(0, RECENTLY_SOLD_LIMIT);
  } catch (error) {
    console.error('Unable to load recently sold homepage listings:', error);
    return [];
  }
}, ['homepage-recently-sold-listings'], { revalidate: 3600, tags: ['homepage-recently-sold-listings'] });

function getRecommendedListings(profile: Profile | null, shoes: Shoe[]): Shoe[] {
  if (!profile?.personalized_browse_enabled) return [];
  if (!hasPreferredSize(profile) || !hasPreferredLocation(profile)) return [];

  return sortByPersonalization(
    shoes.filter((shoe) => {
      const badges = getPersonalizationBadges(profile, shoe);
      return !shoe.running_relevance_flagged && (badges.matchesSize || badges.nearYou);
    }),
    profile
  );
}

/**
 * Returns the currently-featured active listing, or null.
 * Requires migration 012_sponsored_and_featured_until.sql (replaces is_featured
 * with featured_until). Picks the row with the latest featured_until in case
 * an admin accidentally features more than one.
 */
const getFeaturedListing = unstable_cache(async function getFeaturedListing(): Promise<Shoe | null> {
  const supabase = createPublicClient();
  await supabase.rpc('reconcile_featured_promotions');
  const { data } = await supabase
    .from('shoes')
    .select(HOME_LISTING_SELECT)
    .eq('status', 'active')
    .eq('has_stock', true)
    .is('quality_flagged_at', null)
    .eq('running_relevance_flagged', false)
    .gt('featured_until', new Date().toISOString())
    .order('featured_until', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as Shoe) ?? null;
}, ['homepage-featured-listing'], { revalidate: 60, tags: ['homepage-featured-listing'] });

const getMarketplaceActivity = unstable_cache(async function getMarketplaceActivity(): Promise<{
  totalActiveListings: number;
  newListingsThisWeek: number;
  activePairRequests: number;
  soldOrReservedPairs: number;
  recentSellers: number;
}> {
  const supabase = createPublicClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [totalActiveRes, newListingsRes, pairRequestsRes, soldReservedRes, recentSellerRes] = await Promise.all([
    supabase
      .from('shoes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('has_stock', true),
    supabase
      .from('shoes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('wishlist_items')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('shoes')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sold', 'reserved', 'donated']),
    supabase
      .from('shoes')
      .select('seller_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return {
    totalActiveListings: totalActiveRes.count ?? 0,
    newListingsThisWeek: newListingsRes.count ?? 0,
    activePairRequests: pairRequestsRes.count ?? 0,
    soldOrReservedPairs: soldReservedRes.count ?? 0,
    recentSellers: new Set((recentSellerRes.data ?? []).map(row => row.seller_id)).size,
  };
}, ['homepage-marketplace-activity'], { revalidate: 300 });

function getDailyRearListings(shoes: Shoe[], featuredId: string | null): Shoe[] {
  const daySeed = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  function seededScore(value: string) {
    let hash = 2166136261;
    for (const character of `${daySeed}:${value}`) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  return shoes
    .filter(shoe => (
      shoe.id !== featuredId &&
      !shoe.quality_flagged_at &&
      !shoe.running_relevance_flagged &&
      (shoe.shoe_images?.length ?? 0) > 0
    ))
    .sort((a, b) => seededScore(a.id) - seededScore(b.id))
    .slice(0, 2);
}

const getHomepageSiteSettings = unstable_cache(async function getHomepageSiteSettings(): Promise<HomepageSiteSettings> {
  const service = createServiceClient();
  const { data } = await service
    .from('site_settings')
    .select('show_homepage_activity_publicly')
    .eq('id', true)
    .maybeSingle();

  return {
    showHomepageActivityPublicly: Boolean(data?.show_homepage_activity_publicly),
  };
}, ['homepage-site-settings'], { revalidate: 300 });

export default async function HomePage() {
  const [profile, homepageShoes, recentlySoldShoes, featured, siteSettings, topPickCandidates] = await Promise.all([
    getCurrentProfile(),
    getHomepageListings(),
    getRecentlySoldListings(),
    getFeaturedListing(),
    getHomepageSiteSettings(),
    getHomepageTopPickCandidates(),
  ]);
  const topPickIds = selectHomepageTopPicks(topPickCandidates, featured?.id ?? null).map(shoe => shoe.id);
  const topPickListings = await getHomepageTopPickListings(topPickIds);
  // Recheck expiry after the cache read so a cached promotion cannot outlive its window.
  const topPickShoes = topPickListings.filter(shoe => isHomepageTopPick(shoe));
  const spotlightIds = new Set(topPickShoes.map(shoe => shoe.id));
  if (featured) spotlightIds.add(featured.id);
  // Keep this guard in addition to the database filters so stale or unexpected
  // cached data can never put a quality-flagged listing into homepage discovery.
  const homepageVisibleShoes = homepageShoes.filter(shoe => !shoe.quality_flagged_at && !spotlightIds.has(shoe.id));
  const recommendedShoes = getRecommendedListings(profile, homepageVisibleShoes).slice(0, 4);
  const recommendedIds = new Set(recommendedShoes.map((shoe) => shoe.id));
  const recentShoes = homepageVisibleShoes.filter((shoe) => !recommendedIds.has(shoe.id)).slice(0, 8);
  const organicIds = new Set([...recommendedShoes, ...recentShoes].map(shoe => shoe.id));
  const rearHeroListings = getDailyRearListings(homepageVisibleShoes.filter(shoe => !organicIds.has(shoe.id)), featured?.id ?? null);
  const displayedShoes = [...topPickShoes, ...recommendedShoes, ...recentShoes];
  const displayedListingIds = displayedShoes.map((shoe) => shoe.id);
  const [savedListingCounts, savedListingIds] = await Promise.all([
    getSavedListingCounts(displayedListingIds),
    profile ? getSavedListingIds(profile.id, displayedListingIds) : Promise.resolve(new Set<string>()),
  ]);
  const personalizationBadges: Record<string, PersonalizationBadges> = {};
  displayedShoes.forEach((shoe) => {
    if (profile) personalizationBadges[shoe.id] = getPersonalizationBadges(profile, shoe);
  });
  const showMarketplaceActivity = Boolean(profile?.is_admin) || siteSettings.showHomepageActivityPublicly;
  const activity = showMarketplaceActivity ? await getMarketplaceActivity() : null;

  return (
    <div>
      <section className="border-b border-white/[0.06] bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
          <p className="text-xs font-semibold text-teal-300">Running shoes · Central Luzon & NCR</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">Find your next running shoes</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">Shop new and pre-loved shoes, or list yours for free.</p>
          <div className="mt-4 max-w-2xl"><MobileHeroSearch /></div>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
            <HeroTrackedLink href="/browse" action="hero_marketplace_cta_click" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-400 px-3 py-2.5 text-sm font-bold text-gray-950 hover:bg-teal-300">Browse Shoes</HeroTrackedLink>
            <HeroTrackedLink href="/listings/new" action="hero_sell_cta_click" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-600 px-3 py-2.5 text-sm font-semibold text-gray-100 hover:bg-gray-800">Sell Shoes</HeroTrackedLink>
          </div>
        </div>
      </section>

      {recommendedShoes.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-xl font-bold text-gray-100">Recommended for you</h2>
        <HomeListingGrid shoes={recommendedShoes} currentProfileId={profile?.id} savedListingIds={savedListingIds} savedListingCounts={savedListingCounts} personalizationBadges={personalizationBadges} emptyMessage="No matching shoes yet." />
      </section>}

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-100">Available shoes</h2>
          <Link href="/browse" className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-teal-300">View all →</Link>
        </div>
        <HomeListingGrid shoes={recentShoes} currentProfileId={profile?.id} savedListingIds={savedListingIds} savedListingCounts={savedListingCounts} personalizationBadges={personalizationBadges} emptyMessage="No listings yet. Be the first to list your shoes!" />
      </section>

      {(featured || topPickShoes.length > 0) && <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mb-4"><p className="text-xs font-semibold text-amber-300">Promoted listings</p><h2 className="mt-1 text-xl font-bold text-gray-100">Seller spotlight</h2></div>
        {featured && <div className="mx-auto mb-6 max-w-lg"><FeaturedListing shoe={featured} rearShoes={rearHeroListings} /></div>}
        {topPickShoes.length > 0 && <HomeListingGrid shoes={topPickShoes} currentProfileId={profile?.id} savedListingIds={savedListingIds} savedListingCounts={savedListingCounts} className="sm:grid-cols-2" emptyMessage="No promoted shoes right now." />}
      </section>}

      {recentlySoldShoes.length > 0 && <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-gray-100">Recently sold</h2>
        <p className="mb-4 mt-1 text-xs text-gray-400">Listings marked sold or donated by sellers.</p>
        <HomeListingGrid shoes={recentlySoldShoes} currentProfileId={profile?.id} showSaveActions={false} showFreshnessDates={false} emptyMessage="No recently sold shoes yet." />
      </section>}

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SurfaceCard className="p-4 sm:p-5">
          <h2 className="font-semibold text-gray-100">Need a hand?</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-teal-300">
            <Link href="/price-guide" className="inline-flex min-h-11 items-center">Check resale price</Link>
            <Link href="/help/how-to-buy" className="inline-flex min-h-11 items-center">How to buy</Link>
            <Link href="/help/how-to-sell" className="inline-flex min-h-11 items-center">How to sell</Link>
            <Link href="/looking-for/new" className="inline-flex min-h-11 items-center">Can’t find your shoes?</Link>
          </div>
          <div className="mt-3 border-t border-white/[0.06] pt-3"><PostListingFeedbackPrompt title="Got any feedback for Go Pair PH?" body="Got suggestions or something confusing? Send quick feedback." successBody="Thanks. Your feedback helps shape Go Pair PH." buttonLabel="Send Feedback" compact inline /></div>
        </SurfaceCard>
      </section>
      {activity && <div className="mx-auto max-w-7xl px-4 pb-6 text-xs text-gray-400 sm:px-6 lg:px-8">{activity.totalActiveListings} active listings · {activity.newListingsThisWeek} new this week</div>}
    </div>
  );
}
