export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { FilterPanel } from '@/components/listings/FilterPanel';
import type { Shoe } from '@/types';

export const metadata: Metadata = {
  title: 'Browse Listings',
  description:
    'Browse pre-loved running shoes for sale and donation in Pampanga. Filter by brand, condition, and size to find your next pair.',
  alternates: { canonical: '/browse' },
};

interface BrowsePageProps {
  searchParams: {
    type?: string;
    brand?: string;
    condition?: string;
    size_eu?: string;
    q?: string;
  };
}

async function getListings(searchParams: BrowsePageProps['searchParams']): Promise<Shoe[]> {
  const supabase = createClient();
  let query = supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (searchParams.type) query = query.eq('listing_type', searchParams.type);
  if (searchParams.brand) query = query.ilike('brand', searchParams.brand);
  if (searchParams.condition) query = query.eq('condition', searchParams.condition);
  if (searchParams.size_eu) query = query.eq('size_eu', parseFloat(searchParams.size_eu));
  if (searchParams.q) query = query.or(`brand.ilike.%${searchParams.q}%,model.ilike.%${searchParams.q}%`);

  const { data } = await query.limit(60);
  return (data as Shoe[]) ?? [];
}

function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/browse" className="mb-6">
      <div className="flex gap-2">
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Search brand or model..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
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

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const [shoes, userContext] = await Promise.all([
    getListings(searchParams),
    getCurrentProfileAndRequests(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-100">
        Browse Listings
      </h1>

      <SearchBar defaultValue={searchParams.q} />

      <div className="flex flex-col gap-6">
        {/* Filter + Listings row */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Listings — first on mobile, right side on desktop */}
          <div className="order-1 lg:order-2 flex-1 min-w-0">
            <p className="mb-4 text-sm text-gray-500">
              {shoes.length} listing{shoes.length !== 1 ? "s" : ""} found
            </p>

            <ListingGrid
              shoes={shoes}
              currentProfileId={userContext?.profileId}
              myRequestListingIds={userContext?.requestListingIds}
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

        {/* Wishlist CTA — full width below on desktop, last on mobile */}
        <section className="w-full">
          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6 text-center">
            <h3 className="text-lg font-bold text-gray-100">
              Can&apos;t find the right pair?
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              Post a wishlist item and let other runners know what
              you&apos;re looking for.
            </p>

            <Link
              href="/wishlist/new"
              className="mt-4 inline-block w-full"
            >
              <Button className="w-full sm:w-auto">
                Post a Wishlist Item
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}