export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Button } from '@/components/ui/Button';
import { HeroFallback } from '@/components/home/HeroFallback';
import { FeaturedListing } from '@/components/home/FeaturedListing';
import { LogoMark } from '@/components/brand/Logo';
import type { Shoe } from '@/types';

async function getRecentListings(): Promise<Shoe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8);
  return (data as Shoe[]) ?? [];
}

/**
 * Returns the currently-featured active listing, or null.
 * Requires migration 008_featured_listing.sql (adds shoes.is_featured).
 * The partial unique index guarantees at most one row matches.
 */
async function getFeaturedListing(): Promise<Shoe | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*)')
    .eq('status', 'active')
    .eq('is_featured', true)
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

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <LogoMark size={40} />
                <span className="bg-teal-500/10 text-teal-400 text-xs font-semibold px-3 py-1 rounded-full border border-teal-500/20">
                  Pampanga Only
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
                Pre-Loved Soles,<br />
                <span className="text-teal-400">Fuel Your Runs</span>
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-lg">
                Buy, sell, and donate running shoes with fellow runners in Pampanga.
                Every pair has miles left to give.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/browse">
                  <Button size="lg" variant="secondary">Browse Listings</Button>
                </Link>
                <Link href="/listings/new">
                  <Button size="lg">List Your Shoes</Button>
                </Link>
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
      <section className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            {[
              { icon: '💰', label: 'For Sale', desc: 'Gently-used running shoes' },
              { icon: '🎁', label: 'Donate', desc: 'Give shoes a second life' },
              { icon: '📍', label: 'Pampanga', desc: 'Local marketplace for runners in Pampanga' },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-center gap-2 sm:gap-3 py-1.5">
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

      {/* Recent Listings */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Recent Listings</h2>
          <Link href="/browse" className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
            View all →
          </Link>
        </div>
        <ListingGrid
          shoes={recentShoes}
          currentProfileId={userContext?.profileId}
          myRequestListingIds={userContext?.requestListingIds}
          emptyMessage="No listings yet. Be the first to list your shoes!"
        />
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-teal-500/5 border border-teal-500/20 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-100">Can&apos;t find the right pair?</h3>
          <p className="text-gray-400 mt-1 text-sm">Post a wishlist item and let other runners know what you&apos;re looking for.</p>
          <Link href="/wishlist/new" className="mt-4 inline-block">
            <Button>Post a Wishlist Item</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
