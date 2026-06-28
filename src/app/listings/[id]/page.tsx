export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCount } from '@/lib/offers';
import { PhotoGallery } from '@/components/listings/PhotoGallery';
import { ShopLogoOverlay } from '@/components/shop/ShopLogoOverlay';
import { ShopBadge } from '@/components/shop/ShopBadge';
import { ListingTypeBadge } from '@/components/listings/ListingTypeBadge';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { formatMileage, formatPrice, formatProfileLocation, formatSize, formatRelativeDate, getPublicUrl, formatListingName, getListingPath, getAbsoluteListingUrl, getListingFreshnessDate, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Shoe, PurchaseRequest } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { StatusButton } from './StatusButton';
import { CompleteSaleButtons } from './CompleteSaleButtons';
import { FeatureToggleButton } from './FeatureToggleButton';
import { SponsoredAdminToggle } from './SponsoredAdminToggle';
import { QualityFlagAdminPanel } from './QualityFlagAdminPanel';
import { AdminCheckedListingButton } from './AdminCheckedListingButton';
import { OwnerMoreActions } from './OwnerMoreActions';
import { BuyButton } from '@/components/purchases/BuyButton';
import { DonateRequestButton } from '@/components/purchases/DonateRequestButton';
import { ListingShareActions } from '@/components/listings/ListingShareActions';
import { ListingDiscoverySection } from '@/components/listings/ListingDiscoverySection';
import { AskSellerButton } from '@/components/listings/AskSellerButton';
import { SaveListingButton } from '@/components/listings/SaveListingButton';
import { ListingViewTracker } from '@/components/listings/ListingViewTracker';
import { PromoteListingButton } from '@/components/listings/PromoteListingButton';
import { SponsoredPill } from '@/components/listings/SponsoredPill';
import { FeaturedPill } from '@/components/listings/FeaturedPill';
import { FlaggedPill } from '@/components/listings/FlaggedPill';
import { GreatDealPill } from '@/components/listings/GreatDealPill';
import { QualityFlagNotice } from '@/components/listings/QualityFlagNotice';
import { ListingTrustBadges } from '@/components/listings/ListingTrustBadges';
import { ListingCompletenessCard } from '@/components/listings/ListingCompletenessCard';
import { SafeDealTips } from '@/components/listings/SafeDealTips';
import { ReportListingButton } from '@/components/listings/ReportListingButton';
import { PostListingFeedbackPrompt } from '@/components/feedback/PostListingFeedbackPrompt';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { getSponsoredSlotInfo } from '@/lib/sponsored';
import { SafeShopImage } from '@/components/shop/SafeShopImage';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { getSavedListingCount, isListingSaved } from '@/lib/savedListings';
import { getViewSummariesForListings } from '@/lib/listingViews';
import { buildMessengerUrl, getFacebookContactUrl } from '@/lib/facebook';
import { listingLocationScore, listingMatchesPreferredSize, type PersonalizationProfile } from '@/lib/personalization';
import { getCompletedSalesCount } from '@/lib/sales';
import { getListingCompletenessItems, getListingCompletenessScore, getListingTrustSignals } from '@/lib/listingTrust';
import { getGreatDealEstimate } from '@/lib/pricing/greatDeal';
import type { Profile } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSchemaCondition(condition: Shoe['condition']): string {
  if (condition === 'new') return 'https://schema.org/NewCondition';
  return 'https://schema.org/UsedCondition';
}

function SellerTrustPanel({ seller, completedSales }: { seller: Profile; completedSales: number }) {
  const location = formatProfileLocation(seller);
  const facts = [
    { label: 'Member since', value: formatRelativeDate(seller.created_at), active: true },
    { label: 'Verified profile', value: seller.is_verified ? 'Yes' : 'Not yet', active: seller.is_verified },
    { label: 'Location', value: location || 'Not added', active: Boolean(location) },
    { label: 'Messenger', value: buildMessengerUrl(seller.fb_username) ? 'Ready' : 'Not added', active: Boolean(buildMessengerUrl(seller.fb_username)) },
    { label: 'Go Pair PH deals', value: completedSales > 0 ? `${completedSales} completed` : 'No completed deals yet', active: completedSales > 0 },
  ];

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Seller trust</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {facts.map(fact => (
          <div key={fact.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] font-medium text-gray-500">{fact.label}</p>
            <p className={cn('mt-0.5 text-xs font-semibold', fact.active ? 'text-gray-100' : 'text-gray-500')}>{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopTrustPanel({ shop }: { shop: NonNullable<Shoe['shops']> }) {
  const facts = [
    { label: 'Shop page', value: 'Active on Go Pair PH', active: true },
    { label: 'Location', value: shop.location || 'Not added', active: Boolean(shop.location) },
    { label: 'Facebook contact', value: getFacebookContactUrl(shop.fb_page_url) ? 'Ready' : 'Not added', active: Boolean(getFacebookContactUrl(shop.fb_page_url)) },
  ];

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Shop trust</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {facts.map(fact => (
          <div key={fact.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] font-medium text-gray-500">{fact.label}</p>
            <p className={cn('mt-0.5 text-xs font-semibold', fact.active ? 'text-gray-100' : 'text-gray-500')}>{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shoe = await getShoe(params.id);
  if (!shoe) return { title: 'Listing not found' };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImg && supabaseUrl
    ? getPublicUrl(supabaseUrl, topImg.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.shareHero)
    : '/og-image.png';

  const priceLabel =
    shoe.listing_type === 'for_sale' && shoe.price_php
      ? formatPrice(shoe.price_php) + (shoe.is_negotiable ? ' (Negotiable)' : '')
      : 'Free';

  const listingName = formatListingName(shoe.brand, shoe.model);
  const title = `${listingName} — ${priceLabel}`;
  const sellerType = shoe.shop_id ? 'shop seller' : 'community seller';
  const sizeLabel = formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type);
  const sizeDetails = sizeLabel ? `, size ${sizeLabel}` : '';
  const mileageDetails = shoe.mileage_km != null ? `, ${shoe.mileage_km}km` : '';
  const description = `${CONDITIONS[shoe.condition]} ${listingName} in ${shoe.color}${sizeDetails}${mileageDetails}. Listed by a ${sellerType} on Go Pair PH.`;

  return {
    title,
    description,
    alternates: { canonical: getListingPath(shoe) },
    openGraph: {
      type: 'website',
      title,
      description,
      url: getListingPath(shoe),
      images: [{ url: imageUrl, alt: formatListingName(shoe.brand, shoe.model) }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

async function getShoe(id: string): Promise<Shoe | null> {
  const supabase = createClient();
  const query = supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)');

  const { data } = UUID_RE.test(id)
    ? await query.eq('id', id).single()
    : await query.eq('slug', id).single();

  return data as Shoe | null;
}

async function getShoeByRouteParam(id: string): Promise<Shoe | null> {
  const shoe = await getShoe(id);
  if (!shoe) return null;
  if (UUID_RE.test(id) && shoe.slug) redirect(getListingPath(shoe));
  return shoe;
}

type CurrentProfile = Profile & { authEmail: string | null };

async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (!data) return null;
  return { ...(data as Profile), authEmail: user.email ?? null };
}

async function getGpCoinBalance(profileId: string | null): Promise<number> {
  if (!profileId) return 0;
  const supabase = createClient();
  await supabase.rpc('gp_coin_expire_available', { p_profile_id: profileId });
  const { data } = await supabase
    .from('gp_coin_wallets')
    .select('available_balance')
    .eq('profile_id', profileId)
    .maybeSingle();
  return Math.max(0, Number(data?.available_balance ?? 0));
}

const listingDiscoverySelect = '*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)';

function uniqueListings(listings: Shoe[], currentId: string): Shoe[] {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    if (listing.id === currentId || seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
}

function getComparableSize(shoe: Shoe): number | null {
  if (shoe.size_eu != null) return shoe.size_eu;
  const firstVariant = (shoe.shoe_variants ?? []).find((variant) => variant.quantity > 0);
  return firstVariant?.size_eu ?? null;
}

function scoreSimilarListing(base: Shoe, candidate: Shoe, viewerProfile?: PersonalizationProfile | null): number {
  let score = 0;
  if (candidate.brand === base.brand) score += 5;
  if (candidate.condition === base.condition) score += 1;
  if (viewerProfile?.personalized_browse_enabled) {
    if (listingMatchesPreferredSize(viewerProfile, candidate)) score += 4;
    score += listingLocationScore(viewerProfile, candidate);
  }

  const baseSize = getComparableSize(base);
  const candidateSize = getComparableSize(candidate);
  if (baseSize != null && candidateSize != null) {
    const sizeDiff = Math.abs(baseSize - candidateSize);
    if (sizeDiff <= 0.5) score += 4;
    else if (sizeDiff <= 1.5) score += 3;
    else if (sizeDiff <= 2.5) score += 1;
  }

  if (base.price_php != null && candidate.price_php != null && base.price_php > 0) {
    const priceDiff = Math.abs(candidate.price_php - base.price_php) / base.price_php;
    if (priceDiff <= 0.15) score += 3;
    else if (priceDiff <= 0.35) score += 1;
  }

  return score;
}

async function getListingDiscovery(shoe: Shoe, viewerProfile?: PersonalizationProfile | null): Promise<{ similarListings: Shoe[]; sellerListings: Shoe[] }> {
  const supabase = createClient();

  const [sameBrandRes, broadRes, sellerRes] = await Promise.all([
    supabase
      .from('shoes')
      .select(listingDiscoverySelect)
      .eq('status', 'active')
      .eq('has_stock', true)
      .eq('listed_in_main_feed', true)
      .eq('brand', shoe.brand)
      .neq('id', shoe.id)
      .order('created_at', { ascending: false })
      .limit(18),
    supabase
      .from('shoes')
      .select(listingDiscoverySelect)
      .eq('status', 'active')
      .eq('has_stock', true)
      .eq('listed_in_main_feed', true)
      .neq('id', shoe.id)
      .order('created_at', { ascending: false })
      .limit(36),
    supabase
      .from('shoes')
      .select(listingDiscoverySelect)
      .eq('status', 'active')
      .eq('has_stock', true)
      .eq('seller_id', shoe.seller_id)
      .neq('id', shoe.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const sellerListings = uniqueListings((sellerRes.data as Shoe[]) ?? [], shoe.id).slice(0, 4);
  const sellerListingIds = new Set(sellerListings.map((listing) => listing.id));
  const candidates = uniqueListings([
    ...(((sameBrandRes.data as Shoe[]) ?? [])),
    ...(((broadRes.data as Shoe[]) ?? [])),
  ], shoe.id)
    .filter((listing) => !sellerListingIds.has(listing.id))
    .sort((a, b) => {
      const scoreDiff = scoreSimilarListing(shoe, b, viewerProfile) - scoreSimilarListing(shoe, a, viewerProfile);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return {
    similarListings: candidates.slice(0, 6),
    sellerListings,
  };
}

type PurchaseContext =
  | { type: 'my_request_pending'; request: PurchaseRequest }       // I'm the buyer, request pending
  | { type: 'my_request_accepted'; request: PurchaseRequest }      // I'm the buyer, accepted, meetup time
  | { type: 'my_request_declined_reserved' }                       // my request declined, item reserved for someone else
  | { type: 'reserved_for_someone_else' }                          // not me, listing reserved for another
  | { type: 'sale_in_progress'; request: PurchaseRequest }         // I'm the seller, accepted request
  | { type: 'incoming_pending'; count: number };                   // I'm the seller, pending requests

async function getPurchaseContext(shoeId: string, profileId: string | null, isOwner: boolean, status: string): Promise<PurchaseContext | null> {
  if (!profileId) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from('purchase_requests')
    .select('*, profiles(*)')
    .eq('listing_id', shoeId)
    .in('status', ['pending', 'accepted', 'declined']);

  const requests = (data as PurchaseRequest[]) ?? [];

  if (isOwner) {
    const accepted = requests.find(r => r.status === 'accepted');
    if (accepted) return { type: 'sale_in_progress', request: accepted };
    const pending = requests.filter(r => r.status === 'pending');
    if (pending.length > 0) return { type: 'incoming_pending', count: pending.length };
    return null;
  }

  // Buyer perspective
  const myRequest = requests.find(r => r.buyer_id === profileId);
  if (myRequest?.status === 'accepted') return { type: 'my_request_accepted', request: myRequest };
  if (myRequest?.status === 'pending') return { type: 'my_request_pending', request: myRequest };

  // My request was declined but item is reserved for someone else
  if (myRequest?.status === 'declined' && status === 'reserved') {
    return { type: 'my_request_declined_reserved' };
  }

  // Listing is reserved but I have no prior request
  if (status === 'reserved') return { type: 'reserved_for_someone_else' };

  return null;
}

export default async function ListingDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { listed?: string; updated?: string; renewed?: string; closed?: string; share?: string } }) {
  const [shoe, currentProfile] = await Promise.all([
    getShoeByRouteParam(params.id),
    getCurrentProfile(),
  ]);

  const offerCount = await getOfferCount(params.id);

  if (!shoe) notFound();

  const currentProfileId = currentProfile?.id ?? null;
  const currentProfileFbUsername = currentProfile?.fb_username ?? null;
  const isAdmin = currentProfile?.is_admin ?? false;
  const isVerified = currentProfile?.is_verified ?? false;
  const isOwner = currentProfileId === shoe.seller_id;
  const canSeeQualityFlag = !!shoe.quality_flagged_at && !!currentProfileId && (isOwner || isAdmin === true);
  const seller = shoe.profiles;
  const sellerLocation = formatProfileLocation(seller);
  const shop = shoe.shops && shoe.shops.status === 'active' ? shoe.shops : null;
  const shopLogoUrl = shop?.logo_storage_path ? getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, shop.logo_storage_path, 'shop-logos', IMAGE_TRANSFORM_PRESETS.shopLogo) : null;
  const topImage = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const productImageUrl = topImage
    ? getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, topImage.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.detailMain)
    : null;
  const purchaseContext = await getPurchaseContext(shoe.id, currentProfileId, isOwner, shoe.status);
  const isSaved = await isListingSaved(currentProfileId, shoe.id);
  const saveCount = await getSavedListingCount(shoe.id);
  const sellerCompletedSales = seller && !shop ? await getCompletedSalesCount(seller.id) : 0;
  const viewSummary = isOwner
    ? (await getViewSummariesForListings([shoe.id])).get(shoe.id) ?? { total: 0, last7d: 0 }
    : null;
  const discovery = await getListingDiscovery(shoe, currentProfile);
  const trustSignals = getListingTrustSignals(shoe);
  const completenessItems = getListingCompletenessItems(shoe);
  const completenessScore = getListingCompletenessScore(shoe);
  const showSrp = shoe.listing_type === 'for_sale' && shoe.price_php != null && shoe.srp_php != null && shoe.srp_php >= shoe.price_php;
  const discountPercent = showSrp && shoe.srp_php && shoe.price_php
    ? Math.max(0, Math.round(((shoe.srp_php - shoe.price_php) / shoe.srp_php) * 100))
    : 0;
  const greatDeal = getGreatDealEstimate(shoe);

  const now = new Date();
  const isSponsored = !!shoe.sponsored_until && new Date(shoe.sponsored_until) > now;
  const isFeatured = !!shoe.featured_until && new Date(shoe.featured_until) > now;
  const slotInfo = isOwner ? await getSponsoredSlotInfo() : null;
  const gpCoinBalance = isOwner ? await getGpCoinBalance(currentProfileId) : 0;
  const listingName = formatListingName(shoe.brand, shoe.model);
  const justListed = isOwner && searchParams?.listed === '1';
  const justUpdated = isOwner && searchParams?.updated === '1';
  const justRenewed = isOwner && searchParams?.renewed === '1';
  const justClosedStatus = isOwner && (searchParams?.closed === 'sold' || searchParams?.closed === 'donated')
    ? searchParams.closed
    : null;
  const showUnavailablePanel = !isOwner && (shoe.status === 'sold' || shoe.status === 'donated' || shoe.status === 'archived');
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(getListingPath(shoe))}`;
  const shopContactHref = getFacebookContactUrl(shop?.fb_page_url ?? null);
  const sellerMessengerHref = buildMessengerUrl(seller?.fb_username ?? null);
  const askSellerHref = shopContactHref ?? sellerMessengerHref;
  const canAskSeller = shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner;
  const signedOutForSaleCtaLabel = shoe.shop_id
    ? 'Sign in to Place Order'
    : 'Sign in to Send Offer';
  const productJsonLd = shoe.listing_type === 'for_sale' && shoe.price_php && productImageUrl ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listingName,
    image: [productImageUrl],
    description: shoe.description ?? `${CONDITIONS[shoe.condition]} ${listingName} listed on Go Pair PH.`,
    brand: { '@type': 'Brand', name: shoe.brand === 'Other' ? listingName : shoe.brand },
    color: shoe.color,
    itemCondition: getSchemaCondition(shoe.condition),
    offers: {
      '@type': 'Offer',
      url: getAbsoluteListingUrl(SITE_URL, shoe),
      priceCurrency: 'PHP',
      price: shoe.price_php,
      availability: shoe.status === 'active' && shoe.has_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: shop
        ? { '@type': 'Store', name: shop.name, url: `${SITE_URL}/shop/${shop.slug}` }
        : { '@type': 'Person', name: seller?.display_name ?? 'Go Pair PH seller' },
    },
  } : null;
  const galleryOverlay = (
    <>
      {shoe.shops && shoe.shops.status === 'active' && <ShopLogoOverlay shop={shoe.shops} size="lg" />}
      {greatDeal && (
        <div className="absolute bottom-3 left-3 z-20">
          <GreatDealPill size="md" />
        </div>
      )}
      {!isOwner && (
        <div className="absolute right-3 top-3 z-20">
          <SaveListingButton
            listingId={shoe.id}
            initialSaved={isSaved}
            canSave={!!currentProfileId}
            initialSaveCount={saveCount}
            signInHref={signInHref}
            sellerId={shoe.seller_id}
          />
        </div>
      )}
    </>
  );
  const renderBuyerCtas = (className = '') => (
    <div className={className}>
      {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && shoe.price_php && !shoe.shop_id && (
        <div className="mt-4 space-y-2">
          <div className={cn('grid gap-2', canAskSeller && 'sm:grid-cols-2')}>
            {canAskSeller && (
              <AskSellerButton
                contactUrl={askSellerHref}
                listingName={listingName}
                listingHref={getListingPath(shoe)}
                sellerName={shop?.name ?? seller?.display_name}
                isShop={!!shop}
                buyerNeedsMessenger={!currentProfileFbUsername}
                ariaLabel={askSellerHref ? 'Message seller on Messenger' : 'Seller has not added Messenger'}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                  askSellerHref
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'border border-blue-400/15 bg-blue-600/35 text-blue-100/60 hover:border-blue-300/25 hover:bg-blue-600/45 hover:text-blue-50',
                )}
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
                </svg>
                Message Seller
              </AskSellerButton>
            )}
            <BuyButton
              listingId={shoe.id}
              listingSlug={shoe.slug}
              listingName={listingName}
              priceFormatted={formatPrice(shoe.price_php)}
              pricePhp={shoe.price_php}
              isNegotiable={shoe.is_negotiable}
              seller={seller ?? undefined}
              offerCount={offerCount}
              buyerProfileId={currentProfileId}
              buyerFbUsername={currentProfileFbUsername}
              showOfferCount={false}
              className="w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            />
          </div>
          {canAskSeller && (
            <p className="text-center text-xs leading-5 text-gray-500">
              Not ready to offer yet? Ask about condition, meetup, or extra photos first.
            </p>
          )}
        </div>
      )}
      {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && shoe.price_php && shoe.shop_id && shoe.has_stock && shoe.shoe_variants && shoe.shoe_variants.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className={cn('grid gap-2', canAskSeller && 'sm:grid-cols-2')}>
            {canAskSeller && (
              <AskSellerButton
                contactUrl={askSellerHref}
                listingName={listingName}
                listingHref={getListingPath(shoe)}
                sellerName={shop?.name ?? seller?.display_name}
                isShop={!!shop}
                buyerNeedsMessenger={!currentProfileFbUsername}
                ariaLabel={askSellerHref ? 'Message seller on Messenger' : 'Seller has not added Messenger'}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                  askSellerHref
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'border border-blue-400/15 bg-blue-600/35 text-blue-100/60 hover:border-blue-300/25 hover:bg-blue-600/45 hover:text-blue-50',
                )}
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
                </svg>
                Message Seller
              </AskSellerButton>
            )}
            <BuyButton
              listingId={shoe.id}
              listingSlug={shoe.slug}
              listingName={listingName}
              priceFormatted={formatPrice(shoe.price_php)}
              pricePhp={shoe.price_php}
              isNegotiable={shoe.is_negotiable}
              seller={seller ?? undefined}
              shop={shoe.shops}
              variants={shoe.shoe_variants}
              label="Place Order"
              buyerProfileId={currentProfileId}
              buyerFbUsername={currentProfileFbUsername}
              className="w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            />
          </div>
          {canAskSeller && (
            <p className="text-center text-xs leading-5 text-gray-500">
              Not ready to order yet? Ask about stock, pickup, or delivery first.
            </p>
          )}
        </div>
      )}
      {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && !currentProfileId && (
        <div className="mt-4 space-y-2">
          <div className={cn('grid gap-2', canAskSeller && 'sm:grid-cols-2')}>
            {canAskSeller && (
              <AskSellerButton
                contactUrl={askSellerHref}
                listingName={listingName}
                listingHref={getListingPath(shoe)}
                sellerName={shop?.name ?? seller?.display_name}
                isShop={!!shop}
                sendOfferLabel={signedOutForSaleCtaLabel}
                sendOfferHref={signInHref}
                ariaLabel={askSellerHref ? 'Message seller on Messenger' : 'Seller has not added Messenger'}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                  askSellerHref
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'border border-blue-400/15 bg-blue-600/35 text-blue-100/60 hover:border-blue-300/25 hover:bg-blue-600/45 hover:text-blue-50',
                )}
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
                </svg>
                Message Seller
              </AskSellerButton>
            )}
            <Link
              href={signInHref}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L3 13V3h10l7.59 7.59a2 2 0 010 2.82z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01" />
              </svg>
              {signedOutForSaleCtaLabel}
            </Link>
          </div>
          {canAskSeller && (
            <p className="text-center text-xs leading-5 text-gray-500">
              Ask first if you need condition, meetup, or extra photo details.
            </p>
          )}
        </div>
      )}

      {shoe.listing_type === 'donate' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && (
        <DonateRequestButton
          listingId={shoe.id}
          listingName={listingName}
          requesterId={currentProfileId}
          requesterFbUsername={currentProfileFbUsername}
        />
      )}
      {shoe.listing_type === 'donate' && shoe.status === 'active' && !isOwner && !currentProfileId && (
        <Link
          href={signInHref}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-500"
        >
          Sign in to Claim Free Pair
        </Link>
      )}
    </div>
  );

  const renderOwnerCtas = (className = '', autoOpenPromotion = true) => (
    <div className={cn('grid gap-2 sm:grid-flow-col sm:auto-cols-fr', className)}>
      {shoe.status === 'active' && slotInfo && (
        <PromoteListingButton
          listingId={shoe.id}
          listingName={listingName}
          isVerified={isVerified}
          slotsAvailable={slotInfo.slotsAvailable || isSponsored}
          nextSlotOpensAt={slotInfo.nextSlotOpensAt}
          ownListingAlreadySponsored={isSponsored}
          ownSponsoredUntil={shoe.sponsored_until}
          ownListingAlreadyFeatured={isFeatured}
          ownFeaturedUntil={shoe.featured_until}
          gpCoinBalance={gpCoinBalance}
          autoOpenFromSearchParams={autoOpenPromotion}
        />
      )}
      {shoe.status === 'active' && (
        <Link
          href={`/listings/${shoe.id}/edit`}
          className="inline-flex w-full items-center justify-center rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-base font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 sm:text-sm"
        >
          Edit Listing
        </Link>
      )}
      <StatusButton shoeId={shoe.id} currentStatus={shoe.status} listingType={shoe.listing_type} />
      <OwnerMoreActions shoeId={shoe.id} listingType={shoe.listing_type} status={shoe.status} />
    </div>
  );

  return (
    <PageShell>
      <ListingViewTracker listingId={shoe.id} shareToken={searchParams?.share} />
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <Link href="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 transition-colors">
        ← Back to GP Marketplace
      </Link>

      {justListed && (
        <SurfaceCard glow className="mb-6 border-teal-500/25 bg-teal-500/[0.05] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Your listing is live</p>
              <h2 className="mt-2 text-xl font-bold text-gray-100">Your listing is live. Now post it where buyers already are.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Use your listing link so buyers can check size, photos,
                price, condition, and status in one place.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100/80">
                Facebook gets the reach. Go Pair PH keeps the details clean.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['1', 'Copy FB caption'],
              ['2', 'Download image'],
              ['3', 'Open Go Pair PH group'],
              ['4', 'Post to running groups'],
            ].map(([step, title]) => (
              <div key={step} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2 text-gray-400">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[11px] font-bold text-teal-300 ring-1 ring-teal-400/25">
                  {step}
                </span>
                <span className="font-medium text-gray-300">{title}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <PostListingFeedbackPrompt
              listingId={shoe.id}
              initialContactEmail={currentProfile?.authEmail ?? null}
            />
          </div>
        </SurfaceCard>
      )}

      {justRenewed && !justListed && (
        <SurfaceCard glow className="mb-6 border-teal-500/25 bg-teal-500/[0.05] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Listing renewed</p>
              <h2 className="mt-2 text-xl font-bold text-gray-100">Buyers will see this pair was checked recently.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                This updates the checked timestamp without marking the listing as just posted.
              </p>
            </div>
          </div>
        </SurfaceCard>
      )}

      {justUpdated && !justListed && !justRenewed && (
        <SurfaceCard glow className="mb-6 border-teal-500/25 bg-teal-500/[0.05] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Listing updated</p>
              <h2 className="mt-2 text-xl font-bold text-gray-100">Your changes are live.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                If you changed price, condition, sizes, or notes, share it again so runners see the latest details.
              </p>
            </div>
          </div>
        </SurfaceCard>
      )}

      {justClosedStatus && !justListed && !justUpdated && !justRenewed && (
        <SurfaceCard glow className="mb-6 border-teal-500/25 bg-teal-500/[0.05] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-200 ring-1 ring-teal-400/25">
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                {justClosedStatus === 'sold' ? 'Listing marked sold' : 'Listing marked claimed'}
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-100">
                {justClosedStatus === 'sold'
                  ? 'Nice, your running shoes found their next runner.'
                  : 'Nice, your pair found a new runner.'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                This listing is now closed, so buyers will no longer see it as available in the marketplace.
              </p>
            </div>
            </div>
            <div className="grid shrink-0 gap-2 sm:w-[220px]">
              <Link
                href="/listings/new"
                className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
              >
                List another pair
              </Link>
              <Link
                href="/profile?tab=listings"
                className="inline-flex items-center justify-center rounded-lg border border-white/[0.1] bg-slate-950/45 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
              >
                View my listings
              </Link>
            </div>
          </div>
        </SurfaceCard>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        {/* Gallery */}
        <div className="min-w-0">
          <PhotoGallery
            images={shoe.shoe_images ?? []}
            listingName={formatListingName(shoe.brand, shoe.model)}
            isOwner={isOwner}
            listingPath={getListingPath(shoe)}
            overlay={galleryOverlay}
          />
          <div className="lg:hidden">
            {isOwner ? renderOwnerCtas('mt-4', false) : renderBuyerCtas('mt-1')}
            <div className="mt-4">
              <ListingShareActions shoe={shoe} seller={seller ?? null} isOwner={isOwner} />
            </div>
          </div>
        </div>

        {/* Details */}
        <SurfaceCard glow className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ListingTypeBadge type={shoe.listing_type} />
            <Badge className={cn(CONDITION_COLORS[shoe.condition])}>
              {CONDITIONS[shoe.condition]}
            </Badge>
            {shoe.status !== 'active' && (
              <Badge className="bg-gray-800 text-gray-400 border border-gray-700 capitalize">{shoe.status}</Badge>
            )}
            {isFeatured && (
              <FeaturedPill featuredUntil={shoe.featured_until} />
            )}
            {isSponsored && <SponsoredPill />}
            {canSeeQualityFlag && <FlaggedPill />}
          </div>

          <h1 className="text-3xl font-bold text-gray-100">{formatListingName(shoe.brand, shoe.model)}</h1>
          <p className="text-gray-500 mt-1">{shoe.color}</p>
          <ListingTrustBadges signals={trustSignals} className="mt-3" />
          {shoe.shops && shoe.shops.status === 'active' && (
            <div className="mt-2">
              <ShopBadge shop={shoe.shops} variant="sold-by" />
            </div>
          )}

          {canSeeQualityFlag && (
            <div className="mt-4">
              <QualityFlagNotice
                reasons={shoe.quality_flag_reasons}
                note={shoe.quality_flag_note}
              />
            </div>
          )}

          {showUnavailablePanel && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-gray-100">
                {shoe.status === 'sold'
                  ? 'This pair has already found its next runner.'
                  : shoe.status === 'donated'
                    ? 'This free pair has already been claimed.'
                    : 'This listing is no longer available.'}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                You can keep browsing active running shoes or post what you&apos;re looking for so sellers can find you.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/browse"
                  className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
                >
                  Browse GP Marketplace
                </Link>
                <Link
                  href="/looking-for/new"
                  className="inline-flex items-center justify-center rounded-lg border border-white/[0.1] bg-slate-950/45 px-3 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
                >
                  Post Looking For
                </Link>
              </div>
            </div>
          )}

          {(isOwner || isAdmin) && (
            <div className="mt-4">
              <ListingCompletenessCard items={completenessItems} percent={completenessScore.percent} />
            </div>
          )}

          {/* Price / Free Shoes */}
          <div className="mt-4">
            {shoe.listing_type === 'for_sale' && shoe.price_php && (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-3xl font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
                  {shoe.is_negotiable && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full">
                      Negotiable
                    </span>
                  )}
                </div>
                {showSrp && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 line-through">
                      {formatPrice(shoe.srp_php)}
                    </span>
                    {discountPercent > 0 && (
                      <span className="text-xs font-bold uppercase leading-none text-red-400">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {shoe.listing_type === 'donate' && (
              <div className="rounded-lg bg-green-950 border border-green-800 p-4">
                <p className="text-sm font-semibold text-green-400">Free Shoes</p>
                <p className="text-xs text-green-600 mt-0.5">Send a request to arrange pickup or shipping with the seller</p>
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            {isOwner ? renderOwnerCtas('mt-4') : renderBuyerCtas()}
            <div className="mt-4">
              <ListingShareActions shoe={shoe} seller={seller ?? null} isOwner={isOwner} />
            </div>
          </div>

          {/* Available sizes — shop variant listings only */}
          {shoe.shop_id && shoe.shoe_variants && shoe.shoe_variants.length > 0 && (
            <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/55">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-gray-100">Available sizes</h3>
                {!shoe.has_stock && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 bg-red-950 border border-red-800 px-2 py-0.5 rounded-full">
                    Out of stock
                  </span>
                )}
              </div>
              <ul className="divide-y divide-gray-800">
                {shoe.shoe_variants
                  .filter(v => isOwner || v.quantity > 0)
                  .sort((a, b) => a.size_eu - b.size_eu)
                  .map(v => {
                    const inStock = v.quantity > 0;
                    return (
                      <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-200">
                            {formatSize(v.size_eu, v.size_us, v.size_cm, v.us_size_type)}
                          </p>
                          <p className={`text-xs ${inStock ? 'text-gray-500' : 'text-red-400'}`}>
                            {inStock ? `${v.quantity} left` : 'Out of stock'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {/* Specs */}
          <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
            {[
              ...(shoe.shop_id ? [] : [{ label: 'Size', value: formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type) }]),
              ...(shoe.shop_id ? [] : [{ label: 'Mileage', value: formatMileage(shoe.mileage_km) }]),
              { label: 'Brand', value: shoe.brand === 'Other' ? shoe.model : shoe.brand },
              { label: 'Model', value: shoe.model },
              { label: 'Color', value: shoe.color },
              {
                label: shoe.renewed_at ? 'Checked' : 'Listed',
                value: formatRelativeDate(getListingFreshnessDate(shoe)),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-gray-500">{label}</dt>
                <dd className="text-sm font-semibold text-gray-200 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>

          {shoe.description && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{shoe.description}</p>
            </div>
          )}

          {/* Seller / Shop Card */}
          {shop ? (
            <div className="mt-6 rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
              <div className="flex items-center gap-4">
                <Link href={`/shop/${shop.slug}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
                  <SafeShopImage src={shopLogoUrl} alt={shop.name} className="h-full w-full object-cover" logoSize={32} />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Shop</p>
                  <Link href={`/shop/${shop.slug}`} className="font-semibold text-gray-200 hover:text-teal-400 transition-colors">
                    {shop.name}
                  </Link>
                  {shop.location && <p className="text-xs text-gray-500 mt-0.5">{shop.location}</p>}
                </div>
                <Link href={`/shop/${shop.slug}`} className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors shrink-0">
                  View Shop
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                <ShopTrustPanel shop={shop} />
                {!isOwner && shopContactHref && (
                  <a
                    href={shopContactHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                    </svg>
                    Verify shop on Facebook
                  </a>
                )}
              </div>
            </div>
          ) : seller && (
            <div className="mt-6 rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
              <div className="flex items-center gap-4">
                <Link href={`/profile/${seller.id}`} className="shrink-0">
                  <Avatar
                    src={seller.avatar_url}
                    alt={seller.display_name}
                    size={48}
                    className="border border-gray-700"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Seller</p>
                  <Link href={`/profile/${seller.id}`} className="font-semibold text-gray-200 hover:text-teal-400 transition-colors inline-flex items-center gap-1.5">
                    {seller.display_name}
                    {seller.is_verified && <VerifiedBadge size="sm" />}
                  </Link>
                  {sellerLocation && <p className="text-xs text-gray-500 mt-0.5">{sellerLocation}</p>}
                </div>
                <Link href={`/profile/${seller.id}`} className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors shrink-0">
                  View Profile
                </Link>
              </div>
              <SellerTrustPanel seller={seller} completedSales={sellerCompletedSales} />
            </div>
          )}

          {!isOwner && (
            <div className="mt-4 space-y-3">
              <SafeDealTips />
              <div className="flex justify-end">
                <ReportListingButton listingId={shoe.id} listingName={listingName} />
              </div>
            </div>
          )}

          {/* Purchase context — for_sale listings */}
          {purchaseContext?.type === 'my_request_pending' && (
            <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950 p-4">
              <p className="text-sm font-semibold text-amber-300">Your offer is pending</p>
              <p className="text-xs text-amber-400 mt-1">Waiting for the seller to accept or decline.</p>
            </div>
          )}

          {purchaseContext?.type === 'my_request_accepted' && (
            <div className="mt-4 rounded-xl border border-teal-500/35 bg-teal-500/[0.07] p-4">
              <p className="text-sm font-semibold text-teal-200">Offer accepted. Reserved for you.</p>
              <p className="mt-1 text-xs leading-5 text-teal-100/80">
                Message the seller, confirm meetup/payment/shipping, then receive the pair. The seller marks it sold after completion.
              </p>
            </div>
          )}

          {purchaseContext?.type === 'my_request_declined_reserved' && (
            <div className="mt-4 rounded-xl border border-orange-800 bg-orange-950 p-4">
              <p className="text-sm font-semibold text-orange-300">Item reserved for another buyer</p>
              <p className="text-xs text-orange-400 mt-1">
                Your request wasn&apos;t accepted — the seller is currently in a deal with someone else. The deal may still fall through, so check back later.
              </p>
            </div>
          )}

          {purchaseContext?.type === 'reserved_for_someone_else' && (
            <div className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-4">
              <p className="text-sm font-semibold text-teal-200">Deal in progress</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">This pair is reserved for another buyer while they coordinate with the seller.</p>
            </div>
          )}

          {purchaseContext?.type === 'sale_in_progress' && (
            <div className="mt-4 space-y-3 rounded-xl border border-teal-500/35 bg-teal-500/[0.07] p-4">
              <div>
                <p className="text-sm font-semibold text-teal-200">Offer accepted. Reserved for buyer.</p>
                <p className="mt-1 text-xs leading-5 text-teal-100/80">
                  Message{' '}
                  <Link href={`/profile/${purchaseContext.request.buyer_id}`} className="underline hover:text-teal-200">
                    {purchaseContext.request.profiles?.display_name ?? 'the buyer'}
                  </Link>
                  , complete meetup/payment/shipping, then mark it sold below.
                </p>
              </div>
              <CompleteSaleButtons requestId={purchaseContext.request.id} />
            </div>
          )}

          {purchaseContext?.type === 'incoming_pending' && (
            <div className="mt-4 rounded-xl border border-sky-700 bg-sky-950 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-sky-300">
                <span className="font-semibold">{purchaseContext.count}</span> pending offer{purchaseContext.count !== 1 ? 's' : ''} on this listing
              </p>
              <Link
                href="/profile?tab=purchases"
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shrink-0"
              >
                Review
              </Link>
            </div>
          )}

          {isOwner && shoe.status === 'active' && viewSummary && viewSummary.total > 0 && (
            <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Find more offers</p>
              <h3 className="mt-2 text-sm font-semibold text-gray-100">Your listing is getting seen.</h3>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                Fresh shares can bring it back to Facebook groups, Facebook Marketplace, Messenger, and running chats.
              </p>
              <div className="mt-3 rounded-lg border border-teal-400/20 bg-teal-400/[0.06] px-3 py-2">
                <p className="text-xs font-semibold text-teal-100">Post this on Facebook again to bring buyers back to the full listing.</p>
              </div>
            </div>
          )}

          {/* Admin-only: feature + sponsor toggles */}
          {isAdmin && (
            <div className="mt-6 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/[0.03] p-4 space-y-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-teal-400 font-semibold">
                Admin controls
              </p>
              <div>
                <AdminCheckedListingButton
                  listingId={shoe.id}
                  checkedAt={shoe.admin_checked_at}
                />
              </div>
              <div className="border-t border-gray-800 pt-4">
                <FeatureToggleButton
                  shoeId={shoe.id}
                  isFeatured={isFeatured}
                  featuredUntil={shoe.featured_until}
                  status={shoe.status}
                  sellerIsVerified={seller?.is_verified ?? false}
                />
                <p className="mt-2 text-[11px] text-gray-500">
                  Only one listing can be featured at a time. Featuring this one will replace the current pick.
                </p>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <SponsoredAdminToggle
                  shoeId={shoe.id}
                  sponsoredUntil={shoe.sponsored_until}
                  status={shoe.status}
                  sellerIsVerified={seller?.is_verified ?? false}
                />
                <p className="mt-2 text-[11px] text-gray-500">
                  Activate after the seller pays. The 15% Top Pick slot cap is enforced when sellers try to buy a slot.
                </p>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <QualityFlagAdminPanel
                  shoeId={shoe.id}
                  flaggedAt={shoe.quality_flagged_at}
                  reasons={shoe.quality_flag_reasons}
                  note={shoe.quality_flag_note}
                />
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>

      <ListingDiscoverySection
        similarListings={discovery.similarListings}
        sellerListings={discovery.sellerListings}
      />
    </PageShell>
  );
}
