export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { createClient, createPublicClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Button } from '@/components/ui/Button';
import { HeroFallback } from '@/components/home/HeroFallback';
import { FeaturedListing } from '@/components/home/FeaturedListing';
import { HomeCarousel } from '@/components/home/HomeCarousel';
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

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  return (profile as Profile) ?? null;
}

async function getHomepageListings(): Promise<Shoe[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .order('created_at', { ascending: false })
    .limit(24);
  const all = (data as Shoe[]) ?? [];
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return all
    .sort((a, b) => {
      const aPhoto = hasPhoto(a);
      const bPhoto = hasPhoto(b);
      if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

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
async function getFeaturedListing(): Promise<Shoe | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .gt('featured_until', new Date().toISOString())
    .order('featured_until', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Shoe) ?? null;
}

async function getMarketplaceActivity(): Promise<{
  newListingsThisWeek: number;
  activePairRequests: number;
  soldOrReservedPairs: number;
  recentSellers: number;
}> {
  const supabase = createPublicClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [newListingsRes, pairRequestsRes, soldReservedRes, recentSellerRes] = await Promise.all([
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
    newListingsThisWeek: newListingsRes.count ?? 0,
    activePairRequests: pairRequestsRes.count ?? 0,
    soldOrReservedPairs: soldReservedRes.count ?? 0,
    recentSellers: new Set((recentSellerRes.data ?? []).map(row => row.seller_id)).size,
  };
}

export default async function HomePage() {
  const [profile, homepageShoes, featured, activity] = await Promise.all([
    getCurrentProfile(),
    getHomepageListings(),
    getFeaturedListing(),
    getMarketplaceActivity(),
  ]);
  const recommendedShoes = getRecommendedListings(profile, homepageShoes).slice(0, 4);
  const recommendedIds = new Set(recommendedShoes.map((shoe) => shoe.id));
  const recentShoes = homepageShoes.filter((shoe) => !recommendedIds.has(shoe.id)).slice(0, 4);
  const displayedShoes = [...recommendedShoes, ...recentShoes];
  const displayedListingIds = displayedShoes.map((shoe) => shoe.id);
  const [offerCounts, savedListingCounts, savedListingIds] = await Promise.all([
    getOfferCounts(displayedListingIds),
    getSavedListingCounts(displayedListingIds),
    profile ? getSavedListingIds(profile.id, displayedListingIds) : Promise.resolve(new Set<string>()),
  ]);
  const personalizationBadges: Record<string, PersonalizationBadges> = {};
  displayedShoes.forEach((shoe) => {
    if (profile) personalizationBadges[shoe.id] = getPersonalizationBadges(profile, shoe);
  });

  return (
    <div>
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
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <LogoMark size={40} />
                <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-300 shadow-[0_0_28px_rgba(20,184,166,0.12)] backdrop-blur-sm">
                  Go Pair PH Marketplace
                </span>
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-100 drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)] sm:text-5xl">
                Find Your Next<br />
                <span className="text-teal-300">Running Shoes</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-gray-300/85 sm:mt-4 sm:text-lg sm:leading-8">
                Buy brand-new, pre-loved, and second-hand running shoes from Central
                Luzon and NCR sellers in one focused marketplace built for runners.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
                <Link href="/browse">
                  <Button size="lg" variant="secondary" className="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base">Browse Running Shoes</Button>
                </Link>
                <Link href="/listings/new">
                  <Button size="lg" className="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base">List Your Shoes</Button>
                </Link>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-teal-300/80">
                List once. Share anywhere.
              </p>
              <div className="mt-4 max-w-md">
                <PostListingFeedbackPrompt
                  title="Got any feedback for Go Pair PH?"
                  body="Got suggestions or something confusing? Send quick feedback."
                  successBody="Thanks. Your feedback helps shape Go Pair PH."
                  buttonLabel="Send Feedback"
                  compact
                  inline
                />
              </div>
            </div>

            {/* Right slot — featured listing if set, else marketplace pulse.
                On mobile this stacks below the buttons; on lg+ it sits to the right. */}
            <div className="flex w-full justify-center lg:w-auto lg:flex-1 lg:justify-end items-center">
              {featured ? <FeaturedListing shoe={featured} /> : <HeroFallback />}
            </div>
          </div>
        </div>
      </section>

      <HomeCarousel />

      {/* Marketplace activity */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'New running shoes for sale this week', value: activity.newListingsThisWeek },
            { label: 'Recent active sellers', value: activity.recentSellers },
            { label: 'Looking for shoes', value: activity.activePairRequests },
            { label: 'Sold, reserved, or donated', value: activity.soldOrReservedPairs },
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

      <FirstListingNudge />

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
          <ListingGrid
            shoes={recommendedShoes}
            currentProfileId={profile?.id}
            currentProfileIsAdmin={profile?.is_admin}
            currentProfileFbUsername={profile?.fb_username}
            offerCounts={offerCounts}
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
        <ListingGrid
          shoes={recentShoes}
          currentProfileId={profile?.id}
          currentProfileIsAdmin={profile?.is_admin}
          currentProfileFbUsername={profile?.fb_username}
          offerCounts={offerCounts}
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
        <SurfaceCard className="border-white/[0.08] bg-slate-950/55 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                Popular searches
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-100">
                Buy and sell running shoes in one focused place
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/buy-and-sell-running-shoes-philippines"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
              >
                Running shoes Philippines
              </Link>
              <Link
                href="/buy-and-sell-running-shoes-pampanga"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
              >
                Running shoes Pampanga
              </Link>
            </div>
          </div>
        </SurfaceCard>
      </section>

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
