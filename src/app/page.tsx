export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient, createPublicClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { HeroFallback } from '@/components/home/HeroFallback';
import { FeaturedListing } from '@/components/home/FeaturedListing';
import { HomeCarousel } from '@/components/home/HomeCarousel';
import { HomeListingGrid } from '@/components/home/HomeListingGrid';
import { MobileHeroSearch } from '@/components/home/MobileHeroSearch';
import { SellShoesChoiceModal } from '@/components/home/SellShoesChoiceModal';
import { HeroTrackedLink } from '@/components/home/HeroTrackedLink';
import { FirstListingNudge } from '@/components/listings/FirstListingNudge';
import { LogoMark } from '@/components/brand/Logo';
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
  featured_until,
  sponsored_until,
  is_negotiable,
  quality_flagged_at,
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
    .order('created_at', { ascending: false })
    .limit(24);
  const all = (data as unknown as Shoe[]) ?? [];
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return all
    .sort((a, b) => {
      const aPhoto = hasPhoto(a);
      const bPhoto = hasPhoto(b);
      if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}, ['homepage-listings'], { revalidate: 60, tags: ['homepage-listings'] });

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
      return badges.matchesSize || badges.nearYou;
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
      (shoe.shoe_images?.length ?? 0) > 0
    ))
    .sort((a, b) => seededScore(a.id) - seededScore(b.id))
    .slice(0, 2);
}

function HeroTrustIndicators({ totalActive }: { totalActive: number }) {
  const indicators = [
    {
      label: 'Active Listings',
      value: totalActive > 0 ? totalActive.toLocaleString() : 'Growing',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5h16M4 12h16M4 17.5h16M7 4v5M17 9v6M9 15v5" />
        </svg>
      ),
    },
    {
      label: 'Region Coverage',
      value: 'Central Luzon & NCR',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      ),
    },
    {
      label: 'Focused Marketplace',
      value: 'Built For Runners',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="14" cy="4.5" r="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m12.5 8-3 4 3 2 2.5 5M12.5 8l3 3 3 .5M9.5 12 6 17H3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 border-t border-white/10 pt-3 sm:gap-3 sm:pt-4">
      {indicators.map(indicator => (
        <div key={indicator.label} className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-400/25 bg-teal-400/10 text-teal-300 sm:h-9 sm:w-9">
            <span className="h-4 w-4 sm:h-[18px] sm:w-[18px]">{indicator.icon}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-bold leading-tight text-gray-100 sm:text-xs">{indicator.value}</span>
            <span className={`${indicator.label === 'Active Listings' ? 'block' : 'hidden sm:block'} text-[8px] leading-tight text-gray-500 sm:text-[10px]`}>
              {indicator.label}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
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
  const [profile, homepageShoes, recentlySoldShoes, featured, activity, siteSettings] = await Promise.all([
    getCurrentProfile(),
    getHomepageListings(),
    getRecentlySoldListings(),
    getFeaturedListing(),
    getMarketplaceActivity(),
    getHomepageSiteSettings(),
  ]);
  const recommendedShoes = getRecommendedListings(profile, homepageShoes).slice(0, 4);
  const rearHeroListings = getDailyRearListings(homepageShoes, featured?.id ?? null);
  const recommendedIds = new Set(recommendedShoes.map((shoe) => shoe.id));
  const recentShoes = homepageShoes.filter((shoe) => !recommendedIds.has(shoe.id)).slice(0, 4);
  const displayedShoes = [...recommendedShoes, ...recentShoes];
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

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-800 bg-[#020617]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 28% 42%, rgba(20,184,166,0.2), transparent 34%), linear-gradient(120deg, #020617 0%, #0f172a 44%, #022c22 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(255,255,255,0.9) 0.7px, transparent 0.7px)',
            backgroundSize: '4px 4px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gray-950/70 to-transparent pointer-events-none" />
        <div className="relative mx-auto flex max-w-7xl px-4 py-5 sm:px-6 sm:py-10 lg:min-h-[500px] lg:items-center lg:px-8 lg:py-8 xl:min-h-[530px]">
          <div className="grid min-w-0 w-full gap-4 sm:gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)] lg:items-center lg:gap-8 xl:gap-12">
            <div className="min-w-0 max-w-xl">
              <div className="mb-4 hidden items-center gap-2 md:flex">
                <LogoMark size={36} />
                <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-300 shadow-[0_0_28px_rgba(20,184,166,0.12)] backdrop-blur-sm">
                  Go Pair PH Marketplace
                </span>
              </div>
              <MobileHeroSearch />
              <h1 className="text-[32px] font-extrabold leading-[1.02] tracking-tight text-gray-100 drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-[58px] xl:text-[64px]">
                Find Your Next<br />
                <span className="bg-gradient-to-r from-teal-300 via-teal-400 to-cyan-300 bg-clip-text text-transparent">Running Shoes</span>
              </h1>
              <p className="mt-3 max-w-lg text-[13px] leading-5 text-gray-300/85 sm:mt-4 sm:text-lg sm:leading-8">
                Buy and sell running shoes in one focused place. Sellers can create one
                clean listing, then share it to Facebook, Marketplace, Messenger, and
                running groups.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 md:hidden">
                <HeroTrackedLink
                  href="/listings/new"
                  action="hero_sell_cta_click"
                  className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-2 py-2 text-center text-[11px] font-bold text-white shadow-[0_10px_30px_rgba(20,184,166,0.24)] transition-colors hover:from-teal-400 hover:to-cyan-300 sm:px-3 sm:text-xs"
                >
                  Sell Your Shoes
                </HeroTrackedLink>
                <HeroTrackedLink
                  href="/price-guide"
                  action="hero_price_estimator_cta_click"
                  className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg border border-sky-500/50 bg-sky-700 px-2 py-2 text-center text-[11px] font-bold text-white shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:px-3 sm:text-xs"
                >
                  Check Resale Price
                </HeroTrackedLink>
              </div>
              <div className="mt-7 hidden gap-3 md:flex">
                <HeroTrackedLink href="/browse" action="hero_marketplace_cta_click" className="min-w-0 sm:inline-flex">
                  <Button size="lg" variant="secondary" className="h-full w-full px-3 py-2 text-xs sm:px-6 sm:py-3 sm:text-base">
                    Browse Running Shoes
                  </Button>
                </HeroTrackedLink>
                <SellShoesChoiceModal buttonClassName="h-full w-full bg-gradient-to-r from-teal-500 to-teal-400 px-3 text-xs shadow-[0_10px_30px_rgba(20,184,166,0.24)] hover:from-teal-400 hover:to-cyan-300 sm:w-auto sm:px-6 sm:text-base" />
              </div>
              <div className="mt-7 hidden lg:block">
                <HeroTrustIndicators totalActive={activity.totalActiveListings} />
              </div>
            </div>

            {/* Right slot — featured listing if set, else marketplace pulse.
                On mobile this stacks below the buttons; on lg+ it sits to the right. */}
            <div className="flex w-full items-center justify-center lg:justify-end">
              {featured ? <FeaturedListing shoe={featured} rearShoes={rearHeroListings} /> : <HeroFallback />}
            </div>

            <div className="lg:hidden">
              <HeroTrustIndicators totalActive={activity.totalActiveListings} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.06] bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/80 sm:text-xs">
            List once. Share anywhere. Keep shoe details clean.
          </p>
          <PostListingFeedbackPrompt
            title="Got any feedback for Go Pair PH?"
            body="Got suggestions or something confusing? Send quick feedback."
            successBody="Thanks. Your feedback helps shape Go Pair PH."
            buttonLabel="Send Feedback"
            compact
            inline
          />
        </div>
      </section>

      <HomeCarousel />

      {recommendedShoes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                Matched to your profile
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-100">Recommended For You</h2>
            </div>
            <Link href="/browse" className="text-sm font-medium text-teal-400 transition-colors hover:text-teal-300">
              See more matches →
            </Link>
          </div>
          <HomeListingGrid
            shoes={recommendedShoes}
            currentProfileId={profile?.id}
            savedListingIds={savedListingIds}
            savedListingCounts={savedListingCounts}
            personalizationBadges={personalizationBadges}
            emptyMessage="No recommended pairs yet."
          />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Recent Listings</h2>
        </div>
        <HomeListingGrid
          shoes={recentShoes}
          currentProfileId={profile?.id}
          savedListingIds={savedListingIds}
          savedListingCounts={savedListingCounts}
          personalizationBadges={personalizationBadges}
          emptyMessage="No listings yet. Be the first to list your shoes!"
        />
        <div className="mt-8 text-center">
          <Link href="/browse" className="inline-flex text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
            View all →
          </Link>
        </div>
      </section>

      {recentlySoldShoes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Marketplace sold listings
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-100">Recently Sold</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Recently closed pairs in Go Pair PH.
              </p>
            </div>
            <Link href="/browse" className="text-sm font-medium text-teal-400 transition-colors hover:text-teal-300">
              Browse available pairs →
            </Link>
          </div>
          <HomeListingGrid
            shoes={recentlySoldShoes}
            currentProfileId={profile?.id}
            showSaveActions={false}
            showFreshnessDates={false}
            emptyMessage="No recently sold pairs yet."
          />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <Image
          src="/promos/footer-images.jpg"
          alt="Go Pair PH marketplace benefits for runners in Central Luzon and NCR"
          width={1898}
          height={829}
          loading="lazy"
          className="block w-full rounded-2xl border border-white/[0.08] bg-slate-950 object-cover shadow-2xl shadow-black/30"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SurfaceCard className="border-white/[0.08] bg-slate-950/55 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.18)] sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: 'One link for every post',
                text: 'Post on Facebook for reach, but keep the full shoe details on one Go Pair PH listing link.',
              },
              {
                title: 'Fewer repeated questions',
                text: 'Size, price, condition, mileage, location, photos, and seller details stay in one place.',
              },
              {
                title: 'Still searchable later',
                text: 'FB posts get buried. Go Pair PH listings can be revisited, shared again, and found by runners.',
              },
            ].map((benefit) => (
              <div key={benefit.title} className="min-w-0 rounded-xl border border-white/[0.08] bg-slate-950/45 p-3">
                <p className="text-sm font-bold text-gray-100">{benefit.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{benefit.text}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SurfaceCard className="border-white/[0.08] bg-slate-950/55 p-4 sm:p-5">
          <div className="space-y-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                Popular searches
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-100">
                Buy and sell running shoes in one focused place
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                href="/buy-and-sell-running-shoes-philippines"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-3.5 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
              >
                Running shoes Philippines
              </Link>
              <Link
                href="/buy-and-sell-running-shoes-pampanga"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-3.5 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
              >
                Running shoes Pampanga
              </Link>
              <Link
                href="/price-guide"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-teal-300/50 bg-gradient-to-r from-teal-500 to-teal-400 px-3.5 py-2 text-center text-sm font-bold text-gray-950 shadow-[0_10px_28px_rgba(20,184,166,0.2)] transition-all hover:-translate-y-0.5 hover:from-teal-400 hover:to-cyan-300"
              >
                Price Estimator
              </Link>
              <Link
                href="/help/how-to-buy"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-3.5 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
              >
                How to Buy
              </Link>
              <Link
                href="/help/how-to-sell"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-3.5 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
              >
                How to Sell
              </Link>
            </div>
          </div>
        </SurfaceCard>
      </section>

      {showMarketplaceActivity && (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'New running shoes for sale this week', value: activity.newListingsThisWeek },
              { label: 'Recent active sellers', value: activity.recentSellers },
              { label: 'Looking for shoes', value: activity.activePairRequests },
              { label: 'Sold, reserved, or claimed', value: activity.soldOrReservedPairs },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-slate-950/55 px-3 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.18)] sm:px-4 sm:py-3">
                <p className="text-lg font-bold tabular-nums text-gray-100 sm:text-xl">
                  {stat.value.toLocaleString()}
                  {stat.label === 'New running shoes for sale this week' && stat.value >= 2 ? (
                    <span className="ml-1" aria-label="celebration">🎉</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <FirstListingNudge />

      {/* CTA banner */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-teal-500/5 border border-teal-500/20 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-100">Can&apos;t find the right pair?</h3>
          <p className="text-gray-400 mt-1 text-sm">Post what you&apos;re looking for and let the community drop available links.</p>
          <Link href="/looking-for/new" className="mt-4 inline-block">
            <Button>Post what you&apos;re looking for</Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
