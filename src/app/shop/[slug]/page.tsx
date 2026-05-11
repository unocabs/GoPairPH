export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { getPublicUrl, formatListingName } from '@/lib/utils';
import { getShopTheme } from '@/lib/shopTheme';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { ShopCarousel } from '@/components/shop/ShopCarousel';
import { ShopListingsFilter } from '@/components/shop/ShopListingsFilter';
import type { Shoe, Shop } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';

type SizeUnit = 'eu' | 'us' | 'cm';

interface ShopLandingPageProps {
  params: { slug: string };
  searchParams: {
    q?: string;
    condition?: string;
    size?: string;
    size_unit?: string;
    stock?: string;
    sort?: string;
  };
}

async function getShop(slug: string): Promise<Shop | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  return (data as Shop) ?? null;
}

function getSizeFilter(searchParams: ShopLandingPageProps['searchParams']): { unit: SizeUnit; value: number } | null {
  if (!searchParams.size) return null;
  const value = Number.parseFloat(searchParams.size);
  if (!Number.isFinite(value)) return null;
  const unit = ['eu', 'us', 'cm'].includes(searchParams.size_unit ?? '') ? searchParams.size_unit as SizeUnit : 'eu';
  return { unit, value };
}

function shoeMatchesSize(shoe: Shoe, sizeFilter: { unit: SizeUnit; value: number } | null): boolean {
  if (!sizeFilter) return true;
  const key = sizeFilter.unit === 'us' ? 'size_us' : sizeFilter.unit === 'cm' ? 'size_cm' : 'size_eu';
  if (shoe[key] === sizeFilter.value) return true;
  return (shoe.shoe_variants ?? []).some(variant => variant.quantity > 0 && variant[key] === sizeFilter.value);
}

async function getShopListings(shopId: string, searchParams: ShopLandingPageProps['searchParams']): Promise<Shoe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('shop_id', shopId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(200);

  let all = (data as Shoe[]) ?? [];
  if ((searchParams.stock ?? 'available') === 'available') all = all.filter(shoe => shoe.has_stock);
  if (searchParams.condition) all = all.filter(shoe => shoe.condition === searchParams.condition);
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    all = all.filter(shoe => `${shoe.brand} ${shoe.model}`.toLowerCase().includes(q));
  }
  const sizeFilter = getSizeFilter(searchParams);
  all = all.filter(shoe => shoeMatchesSize(shoe, sizeFilter));

  const hasPhoto = (s: Shoe) => (s.shoe_images?.length ?? 0) > 0;
  return all.sort((a, b) => {
    const aPhoto = hasPhoto(a);
    const bPhoto = hasPhoto(b);
    if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
    if (searchParams.sort === 'price_asc') return (a.price_php ?? Number.MAX_SAFE_INTEGER) - (b.price_php ?? Number.MAX_SAFE_INTEGER);
    if (searchParams.sort === 'price_desc') return (b.price_php ?? 0) - (a.price_php ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function getShopListingCount(shopId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('shoes')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('status', 'active');
  return count ?? 0;
}

async function getCurrentProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const shop = await getShop(params.slug);
  if (!shop) return { title: 'Shop not found' };
  return {
    title: `${shop.name} — Go Pair PH`,
    description: shop.about ?? `Browse running shoes from ${shop.name} on Go Pair PH.`,
    alternates: { canonical: `/shop/${shop.slug}` },
  };
}

export default async function ShopLandingPage({ params, searchParams }: ShopLandingPageProps) {
  const shop = await getShop(params.slug);
  if (!shop) notFound();

  const [listings, count, profileId] = await Promise.all([
    getShopListings(shop.id, searchParams),
    getShopListingCount(shop.id),
    getCurrentProfileId(),
  ]);
  const offerCounts = await getOfferCounts(listings.map(s => s.id));
  const isOwner = profileId === shop.owner_profile_id;
  const theme = getShopTheme(shop.background_color, shop.accent_color);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const shopLogoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos') : null;
  const listingTitleById = new Map(listings.map(listing => [listing.id, formatListingName(listing.brand, listing.model)]));
  const carouselItems = (shop.carousel_items ?? [])
    .filter(item => item.image_storage_path)
    .slice(0, 4)
    .map(item => ({
      ...item,
      imageUrl: getPublicUrl(supabaseUrl, item.image_storage_path, 'shop-logos'),
      listingTitle: item.listing_id ? listingTitleById.get(item.listing_id) ?? null : null,
    }));
  const shopJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    url: `${SITE_URL}/shop/${shop.slug}`,
    description: shop.about ?? `Independent running shoe shop on Go Pair PH.`,
    image: shopLogoUrl ?? `${SITE_URL}/og-image.png`,
    logo: shopLogoUrl ?? `${SITE_URL}/icon.svg`,
    address: shop.location ? {
      '@type': 'PostalAddress',
      addressLocality: shop.location,
      addressRegion: 'Pampanga',
      addressCountry: 'PH',
    } : undefined,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Pampanga, Philippines',
    },
  };

  return (
    <div style={{ backgroundColor: theme.background }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }}
      />
      <ShopHeader shop={shop} listingCount={count} />
      <ShopCarousel items={carouselItems} accentColor={theme.accent} backgroundColor={theme.background} />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: theme.text }}>All listings</h2>
            <p className="mt-1 text-sm" style={{ color: theme.mutedText }}>
              {listings.length} shown from {count} active listing{count === 1 ? '' : 's'}
            </p>
          </div>
          {isOwner && (
            <a href="/shop/dashboard" className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: theme.accent }}>
              Customize shop
            </a>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="order-1 flex-1 lg:order-2">
            <ListingGrid
              shoes={listings}
              offerCounts={offerCounts}
              currentProfileId={profileId ?? undefined}
              emptyMessage="No shop listings match these filters yet."
              theme={theme}
            />
          </div>
          <div className="order-2 lg:order-1">
            <Suspense>
              <ShopListingsFilter basePath={`/shop/${shop.slug}`} theme={theme} />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
