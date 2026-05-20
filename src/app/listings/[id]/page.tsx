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
import { formatPrice, formatSize, formatRelativeDate, getPublicUrl, formatListingName, getListingPath, getAbsoluteListingUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Shoe, PurchaseRequest } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { StatusButton } from './StatusButton';
import { DeleteListingButton } from './DeleteListingButton';
import { CompleteSaleButtons } from './CompleteSaleButtons';
import { FeatureToggleButton } from './FeatureToggleButton';
import { SponsoredAdminToggle } from './SponsoredAdminToggle';
import { QualityFlagAdminPanel } from './QualityFlagAdminPanel';
import { BuyButton } from '@/components/purchases/BuyButton';
import { DonateRequestButton } from '@/components/purchases/DonateRequestButton';
import { ContactSellerButtons } from '@/components/listings/ContactSellerButtons';
import { SaveListingButton } from '@/components/listings/SaveListingButton';
import { ListingViewTracker } from '@/components/listings/ListingViewTracker';
import { PromoteListingButton } from '@/components/listings/PromoteListingButton';
import { SponsoredPill } from '@/components/listings/SponsoredPill';
import { FeaturedPill } from '@/components/listings/FeaturedPill';
import { FlaggedPill } from '@/components/listings/FlaggedPill';
import { QualityFlagNotice } from '@/components/listings/QualityFlagNotice';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { getSponsoredSlotInfo } from '@/lib/sponsored';
import { SafeShopImage } from '@/components/shop/SafeShopImage';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { isListingSaved } from '@/lib/savedListings';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSchemaCondition(condition: Shoe['condition']): string {
  if (condition === 'new') return 'https://schema.org/NewCondition';
  return 'https://schema.org/UsedCondition';
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shoe = await getShoe(params.id);
  if (!shoe) return { title: 'Listing not found' };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const imageUrl = topImg && supabaseUrl ? getPublicUrl(supabaseUrl, topImg.storage_path) : '/og-image.png';

  const priceLabel =
    shoe.listing_type === 'for_sale' && shoe.price_php
      ? formatPrice(shoe.price_php) + (shoe.is_negotiable ? ' (Negotiable)' : '')
      : 'Free Donation';

  const listingName = formatListingName(shoe.brand, shoe.model);
  const title = `${listingName} — ${priceLabel}`;
  const sellerType = shoe.shop_id ? 'shop seller' : 'community seller';
  const sizeLabel = formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm);
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

async function getCurrentProfile(): Promise<{ id: string; isAdmin: boolean; isVerified: boolean; fbUsername: string | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, is_admin, is_verified, fb_username')
    .eq('user_id', user.id)
    .single();
  if (!data) return null;
  return { id: data.id, isAdmin: !!data.is_admin, isVerified: !!data.is_verified, fbUsername: data.fb_username ?? null };
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

export default async function ListingDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { listed?: string } }) {
  const [shoe, currentProfile] = await Promise.all([
    getShoeByRouteParam(params.id),
    getCurrentProfile(),
  ]);

  const offerCount = await getOfferCount(params.id);

  if (!shoe) notFound();

  const currentProfileId = currentProfile?.id ?? null;
  const currentProfileFbUsername = currentProfile?.fbUsername ?? null;
  const isAdmin = currentProfile?.isAdmin ?? false;
  const isVerified = currentProfile?.isVerified ?? false;
  const isOwner = currentProfileId === shoe.seller_id;
  const canSeeQualityFlag = !!shoe.quality_flagged_at && !!currentProfileId && (isOwner || isAdmin === true);
  const seller = shoe.profiles;
  const shop = shoe.shops && shoe.shops.status === 'active' ? shoe.shops : null;
  const shopLogoUrl = shop?.logo_storage_path ? getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, shop.logo_storage_path, 'shop-logos') : null;
  const topImage = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const productImageUrl = topImage ? getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, topImage.storage_path) : null;
  const purchaseContext = await getPurchaseContext(shoe.id, currentProfileId, isOwner, shoe.status);
  const isSaved = await isListingSaved(currentProfileId, shoe.id);

  const now = new Date();
  const isSponsored = !!shoe.sponsored_until && new Date(shoe.sponsored_until) > now;
  const isFeatured = !!shoe.featured_until && new Date(shoe.featured_until) > now;
  const slotInfo = isOwner ? await getSponsoredSlotInfo() : null;
  const listingName = formatListingName(shoe.brand, shoe.model);
  const listingUrl = getAbsoluteListingUrl(SITE_URL, shoe);
  const justListed = isOwner && searchParams?.listed === '1';
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(getListingPath(shoe))}`;
  const signedOutForSaleCtaLabel = shoe.shop_id
    ? 'Sign in to Place Order'
    : shoe.is_negotiable ? 'Sign in to Send Offer' : 'Sign in to Request to Buy';
  const shareSizeLabel = shoe.shop_id
    ? 'See listing for available sizes'
    : formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm);
  const sharePriceLabel = shoe.listing_type === 'for_sale' && shoe.price_php
    ? `${formatPrice(shoe.price_php)}${shoe.is_negotiable ? ' negotiable' : ''}`
    : 'Free donation';
  const shareLocationLabel = shop?.location ?? seller?.location ?? 'Pampanga';
  const suggestedCaption = [
    `Selling my ${listingName} on Go Pair PH.`,
    `Size: ${shareSizeLabel || 'See listing'}`,
    `Condition: ${CONDITIONS[shoe.condition]}`,
    `Price: ${sharePriceLabel}`,
    `Location: ${shareLocationLabel}`,
    `Full details and photos: ${listingUrl}`,
  ].join('\n');
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
      {!isOwner && (
        <div className="absolute right-3 top-3 z-20">
          <SaveListingButton
            listingId={shoe.id}
            initialSaved={isSaved}
            canSave={!!currentProfileId}
            signInHref={signInHref}
          />
        </div>
      )}
    </>
  );

  return (
    <PageShell>
      <ListingViewTracker listingId={shoe.id} />
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <Link href="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 transition-colors">
        ← Back to Marketplace
      </Link>

      {justListed && (
        <SurfaceCard glow className="mb-6 border-teal-500/25 bg-teal-500/[0.05] p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.5fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Your listing is live</p>
              <h2 className="mt-2 text-xl font-bold text-gray-100">Share it anywhere buyers already are.</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Copy the Go Pair PH link for Facebook groups, Marketplace, Messenger, or your shop page.
                This clean page keeps the price, size, condition, mileage, photos, and seller details in one place.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-slate-950/55 p-3">
              <ContactSellerButtons
                fbUsername={null}
                listingId={shoe.id}
                isOwner
                shoe={shoe}
                seller={seller ?? null}
              />
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-950/55 p-3">
            <label htmlFor="suggested-share-caption" className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Suggested FB caption
            </label>
            <textarea
              id="suggested-share-caption"
              readOnly
              value={suggestedCaption}
              className="mt-2 min-h-[150px] w-full resize-none rounded-lg border border-gray-800 bg-slate-950 px-3 py-2 text-sm leading-6 text-gray-300 outline-none"
            />
          </div>
        </SurfaceCard>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        {/* Gallery */}
        <div className="min-w-0">
          <PhotoGallery
            images={shoe.shoe_images ?? []}
            isOwner={isOwner}
            overlay={galleryOverlay}
          />
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

          {/* Price / Donate */}
          <div className="mt-4">
            {shoe.listing_type === 'for_sale' && shoe.price_php && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-3xl font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
                {shoe.is_negotiable && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full">
                    Negotiable
                  </span>
                )}
              </div>
            )}
            {shoe.listing_type === 'donate' && (
              <div className="rounded-lg bg-green-950 border border-green-800 p-4">
                <p className="text-sm font-semibold text-green-400">Free Donation</p>
                <p className="text-xs text-green-600 mt-0.5">Send a request to arrange pickup or shipping with the donor</p>
              </div>
            )}
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
                            {formatSize(v.size_eu, v.size_us, v.size_cm)}
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
              ...(shoe.shop_id ? [] : [{ label: 'Size', value: formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm) }]),
              ...(shoe.shop_id ? [] : [{ label: 'Mileage', value: shoe.mileage_km != null ? `${shoe.mileage_km.toLocaleString()} km` : 'Not provided' }]),
              { label: 'Brand', value: shoe.brand === 'Other' ? shoe.model : shoe.brand },
              { label: 'Model', value: shoe.model },
              { label: 'Color', value: shoe.color },
              { label: 'Listed', value: formatRelativeDate(shoe.created_at) },
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
                <ContactSellerButtons
                  fbUsername={null}
                  listingId={shoe.id}
                  isOwner={isOwner}
                  shoe={shoe}
                  seller={seller ?? null}
                />
                {!isOwner && shop.fb_page_url && (
                  <a
                    href={shop.fb_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                    </svg>
                    Visit shop Facebook page
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
                  {seller.location && <p className="text-xs text-gray-500 mt-0.5">{seller.location}</p>}
                </div>
                <Link href={`/profile/${seller.id}`} className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors shrink-0">
                  View Profile
                </Link>
              </div>
              <ContactSellerButtons
                fbUsername={!isOwner ? seller.fb_username : null}
                listingId={shoe.id}
                isOwner={isOwner}
                shoe={shoe}
                seller={seller}
              />
              {!isOwner && !seller.fb_username && (
                <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
                  This seller has not added a Messenger contact yet. You can still send a request and send your contact details in the message,
                  and they will see it in their Go Pair PH profile.
                </div>
              )}
            </div>
          )}

          {/* Purchase context — for_sale listings */}
          {purchaseContext?.type === 'my_request_pending' && (
            <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950 p-4">
              <p className="text-sm font-semibold text-amber-300">Your purchase request is pending</p>
              <p className="text-xs text-amber-400 mt-1">Waiting for the seller to accept or decline.</p>
            </div>
          )}

          {purchaseContext?.type === 'my_request_accepted' && (
            <div className="mt-4 rounded-xl border border-teal-700 bg-teal-950 p-4">
              <p className="text-sm font-semibold text-teal-300">Your purchase request was accepted!</p>
              <p className="text-xs text-teal-400 mt-1">
                Coordinate with the seller for a meetup. They&apos;ll mark this as sold once you&apos;ve completed the exchange in person.
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
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-gray-300">Sale Pending</p>
              <p className="text-xs text-gray-500 mt-1">This listing is reserved for another buyer right now.</p>
            </div>
          )}

          {purchaseContext?.type === 'sale_in_progress' && (
            <div className="mt-4 rounded-xl border border-teal-700 bg-teal-950 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-teal-300">Sale in progress</p>
                <p className="text-xs text-teal-400 mt-1">
                  You accepted a request from{' '}
                  <Link href={`/profile/${purchaseContext.request.buyer_id}`} className="underline hover:text-teal-200">
                    {purchaseContext.request.profiles?.display_name ?? 'the buyer'}
                  </Link>
                  . Meet up to complete the sale or complete the transaction online and process the shipping, then mark it sold below.
                </p>
              </div>
              <CompleteSaleButtons requestId={purchaseContext.request.id} />
            </div>
          )}

          {purchaseContext?.type === 'incoming_pending' && (
            <div className="mt-4 rounded-xl border border-sky-700 bg-sky-950 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-sky-300">
                <span className="font-semibold">{purchaseContext.count}</span> pending purchase request{purchaseContext.count !== 1 ? 's' : ''} on this listing
              </p>
              <Link
                href="/profile?tab=purchases"
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shrink-0"
              >
                Review
              </Link>
            </div>
          )}

          {/* Buy button — for_sale, active, non-owners only, no existing request. */}
          {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && shoe.price_php && !shoe.shop_id && (
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
            />
          )}
          {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && shoe.price_php && shoe.shop_id && shoe.has_stock && shoe.shoe_variants && shoe.shoe_variants.length > 0 && (
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
            />
          )}
          {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && !currentProfileId && (
            <Link
              href={signInHref}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              {signedOutForSaleCtaLabel}
            </Link>
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
              Sign in to Request Donation
            </Link>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="mt-4 flex flex-wrap items-start gap-2">
              {shoe.status === 'active' && (
                <Link href={`/listings/${shoe.id}/edit`}>
                  <button className="rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors">
                    Edit Listing
                  </button>
                </Link>
              )}
              {shoe.status === 'active' && slotInfo && (
                <PromoteListingButton
                  listingId={shoe.id}
                  listingName={listingName}
                  isVerified={isVerified}
                  slotsAvailable={slotInfo.slotsAvailable || isSponsored}
                  nextSlotOpensAt={slotInfo.nextSlotOpensAt}
                  ownListingAlreadySponsored={isSponsored}
                  ownSponsoredUntil={shoe.sponsored_until}
                />
              )}
              {/* StatusButton returns null for reserved (handled by CompleteSaleButtons above) */}
              <StatusButton shoeId={shoe.id} currentStatus={shoe.status} listingType={shoe.listing_type} />
              <DeleteListingButton shoeId={shoe.id} />
            </div>
          )}

          {/* Admin-only: feature + sponsor toggles */}
          {isAdmin && (
            <div className="mt-6 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/[0.03] p-4 space-y-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-teal-400 font-semibold">
                Admin controls
              </p>
              <div>
                <FeatureToggleButton
                  shoeId={shoe.id}
                  isFeatured={isFeatured}
                  featuredUntil={shoe.featured_until}
                  status={shoe.status}
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
                />
                <p className="mt-2 text-[11px] text-gray-500">
                  Activate after the seller pays. The 15% slot cap is enforced when sellers try to buy a slot.
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
    </PageShell>
  );
}
