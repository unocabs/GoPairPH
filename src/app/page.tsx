export const revalidate = 60;

import Link from 'next/link';
import { createPublicClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Button } from '@/components/ui/Button';
import { HeroFallback } from '@/components/home/HeroFallback';
import { FeaturedListing } from '@/components/home/FeaturedListing';
import { FirstListingNudge } from '@/components/listings/FirstListingNudge';
import { LogoMark } from '@/components/brand/Logo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { PostListingFeedbackPrompt } from '@/components/feedback/PostListingFeedbackPrompt';
import { getSavedListingCounts } from '@/lib/savedListings';
import type { Shoe } from '@/types';

type SellerBenefitIcon = 'user' | 'shoe' | 'form' | 'send' | 'check' | 'chat';

const sellerBenefits: ReadonlyArray<{
  title: string;
  text: string;
  icon: SellerBenefitIcon;
}> = [
  {
    title: 'Price before listing',
    text: 'Use Shoe Price Estimator to estimate a practical resale range before posting your running shoes.',
    icon: 'check',
  },
  {
    title: 'List once, share anywhere',
    text: 'Create one clean pair link, then share it to FB groups, Facebook Marketplace, Messenger, or friends.',
    icon: 'send',
  },
  {
    title: 'Cleaner than a normal FB post',
    text: 'Buyers can check photos, size, condition, mileage, price, and location in one place.',
    icon: 'form',
  },
  {
    title: 'Built for runners',
    text: 'Go Pair PH is focused on running shoes, not random marketplace items.',
    icon: 'shoe',
  },
  {
    title: 'Easier for serious buyers',
    text: 'Runners can browse by brand, size, and condition, then save pairs they like.',
    icon: 'check',
  },
  {
    title: 'Looks more trustworthy',
    text: 'A clean pair page and seller profile help buyers decide faster.',
    icon: 'user',
  },
  {
    title: 'Your pair is easier to revisit',
    text: 'FB posts can get buried, but your Go Pair PH link stays easy to share again.',
    icon: 'chat',
  },
];

const sellerBenefitIconPaths: Record<SellerBenefitIcon, React.ReactNode> = {
  user: (
    <>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  shoe: (
    <path d="M4 14.5c3.2.2 5.6-1.2 7.2-4.2l2 1.8c1.4 1.2 3.3 2 5.2 2.2l1.8.2c.8.1 1.4.8 1.4 1.6v1.4H4v-3Z" />
  ),
  form: (
    <>
      <path d="M8 6h9" />
      <path d="M8 12h9" />
      <path d="M8 18h5" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-5.4" />
    </>
  ),
  chat: (
    <>
      <path d="M21 12a7.5 7.5 0 0 1-7.5 7.5H8l-5 2 1.6-4.4A7.5 7.5 0 1 1 21 12Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </>
  ),
};

async function getRecentListings(): Promise<Shoe[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .order('created_at', { ascending: false })
    .limit(16);
  const all = (data as Shoe[]) ?? [];
  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return all
    .sort((a, b) => {
      const aPhoto = hasPhoto(a);
      const bPhoto = hasPhoto(b);
      if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 4);
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
  const [recentShoes, featured, activity] = await Promise.all([
    getRecentListings(),
    getFeaturedListing(),
    getMarketplaceActivity(),
  ]);
  const offerCounts = await getOfferCounts(recentShoes.map(s => s.id));
  const savedListingCounts = await getSavedListingCounts(recentShoes.map(s => s.id));

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

      {/* Features — tightened: row on mobile, single line on desktop */}
      <section className="border-b border-white/[0.08] bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="grid grid-cols-3 gap-2 divide-x divide-white/[0.08] rounded-xl border border-white/[0.08] bg-slate-900/45 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:gap-0 sm:p-3">
            {[
              { icon: '💰', label: 'Buy and sell', desc: 'Buy, sell, or donate with local runners' },
              { icon: '👟', label: 'Running shoes', desc: 'Brand-new and pre-loved pairs in one focused place' },
              { icon: '📍', label: 'Central Luzon & NCR', desc: 'Built for runners buying and selling across the region' },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-center gap-2 px-2 py-1.5 sm:gap-3">
                <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">{f.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-200 text-xs sm:text-sm leading-tight">{f.label}</p>
                  <p className="hidden sm:block text-xs text-gray-500 mt-0.5 leading-tight">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* Popular SEO paths */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10 lg:px-8">
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

      {/* Recent Listings */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Recent Listings</h2>
        </div>
        <ListingGrid
          shoes={recentShoes}
          offerCounts={offerCounts}
          savedListingCounts={savedListingCounts}
          emptyMessage="No listings yet. Be the first to list your shoes!"
        />
        <div className="mt-8 text-center">
          <Link href="/browse" className="inline-flex text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
            View all →
          </Link>
        </div>
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

      {/* Seller benefits */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10 lg:px-8">
        <SurfaceCard glow className="relative overflow-hidden border-teal-500/20 bg-slate-950/70 p-4 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.12),transparent_34%)]" />
          <div className="relative">
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300 sm:text-xs sm:tracking-[0.2em]">
                  Seller benefits
                </p>
                <h2 className="mt-2 text-xl font-extrabold leading-snug tracking-tight text-gray-100 sm:mt-3 sm:text-3xl sm:leading-tight">
                  Why add your running shoes on Go Pair PH?
                </h2>
                <p className="mt-2 text-sm leading-5 text-gray-400 sm:mt-3 sm:text-base sm:leading-7">
                  Use Go Pair PH as a clean seller page, then keep sharing your pair wherever your buyers already are.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Link
                  href="/listings/new"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400 sm:px-4 sm:py-2.5"
                >
                  List Your Running Shoes
                </Link>
                <Link
                  href="/price-guide"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 bg-slate-950/60 px-3.5 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-800 hover:text-gray-100 sm:px-4 sm:py-2.5"
                >
                  Shoe Price Estimator
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              {sellerBenefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3 transition-colors hover:border-teal-400/30 hover:bg-slate-950/65 sm:p-4"
                >
                  <div className="flex gap-2.5 sm:gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-400/30 bg-teal-400/10 text-teal-300 sm:h-10 sm:w-10">
                      <SellerBenefitIcon name={benefit.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-bold leading-snug text-gray-100 sm:text-sm">{benefit.title}</h3>
                      <p className="mt-1 text-[13px] leading-5 text-gray-400 sm:mt-1.5 sm:text-sm sm:leading-6">{benefit.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}

function SellerBenefitIcon({ name, className }: { name: SellerBenefitIcon; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {sellerBenefitIconPaths[name]}
    </svg>
  );
}
