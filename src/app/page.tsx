export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Button } from '@/components/ui/Button';
import { HeroFallback } from '@/components/home/HeroFallback';
import { FeaturedListing } from '@/components/home/FeaturedListing';
import { FirstListingNudge } from '@/components/listings/FirstListingNudge';
import { LogoMark } from '@/components/brand/Logo';
import type { Shoe } from '@/types';

async function getRecentListings(): Promise<Shoe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*), shops(*), shoe_variants(*)')
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
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .gt('featured_until', new Date().toISOString())
    .order('featured_until', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Shoe) ?? null;
}

async function getCurrentProfileAndRequests(): Promise<{ profileId: string; requestListingIds: Set<string> } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return null;

  const { data: requests } = await supabase
    .from('purchase_requests')
    .select('listing_id')
    .eq('buyer_id', profile.id)
    .in('status', ['pending', 'accepted']);

  const requestListingIds = new Set((requests ?? []).map((r: { listing_id: string }) => r.listing_id));
  return { profileId: profile.id, requestListingIds };
}

export default async function HomePage() {
  const [recentShoes, userContext, featured] = await Promise.all([
    getRecentListings(),
    getCurrentProfileAndRequests(),
    getFeaturedListing(),
  ]);
  const offerCounts = await getOfferCounts(recentShoes.map(s => s.id));

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
                  Pampanga Running Shoe Marketplace
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)] sm:text-5xl">
                Find Your Next<br />
                <span className="text-teal-300">Running Pair in Pampanga</span>
              </h1>
              <p className="mt-4 max-w-lg text-lg leading-8 text-gray-300/85">
                Buy from community sellers, local shops, and nearby sellers who can meet,
                deliver, or ship to Pampanga buyers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/browse">
                  <Button size="lg" variant="secondary">Browse Listings</Button>
                </Link>
                <Link href="/shop">
                  <Button size="lg" variant="outline">Browse Shops</Button>
                </Link>
                <a href="https://www.facebook.com/groups/gopairph" target="_blank" rel="noopener noreferrer">
                  <Button size="lg">Post on FB Group</Button>
                </a>
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
              { icon: '💰', label: 'Community', desc: 'Buy, sell, or donate with local runners' },
              { icon: '🏬', label: 'Shops', desc: 'Browse independent running-shoe resellers' },
              { icon: '📍', label: 'Pampanga', desc: 'Focused on Pampanga buyers, open to nearby sellers' },
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

      <FirstListingNudge />

      {/* Recent Listings */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Recent Listings</h2>
        </div>
        <ListingGrid
          shoes={recentShoes}
          currentProfileId={userContext?.profileId}
          myRequestListingIds={userContext?.requestListingIds}
          offerCounts={offerCounts}
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
          <p className="text-gray-400 mt-1 text-sm">Post a pair request and let the community drop available links.</p>
          <Link href="/find-my-pair/new" className="mt-4 inline-block">
            <Button>Post a Pair Request</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
