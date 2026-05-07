export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getOfferCount } from '@/lib/offers';
import { PhotoGallery } from '@/components/listings/PhotoGallery';
import { ListingTypeBadge } from '@/components/listings/ListingTypeBadge';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { formatPrice, formatSize, formatRelativeDate, getPublicUrl, formatListingName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Shoe, PurchaseRequest } from '@/types';
import Image from 'next/image';
import { StatusButton } from './StatusButton';
import { DeleteListingButton } from './DeleteListingButton';
import { CompleteSaleButtons } from './CompleteSaleButtons';
import { FeatureToggleButton } from './FeatureToggleButton';
import { BuyButton } from '@/components/purchases/BuyButton';
import { DonateRequestButton } from '@/components/purchases/DonateRequestButton';
import { ContactSellerButtons } from '@/components/listings/ContactSellerButtons';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';

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
  const description = `${CONDITIONS[shoe.condition]} ${listingName} in ${shoe.color}, size ${formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}${shoe.mileage_km != null ? `, ${shoe.mileage_km}km` : ''}. Listed on Next Pair PH.`;

  return {
    title,
    description,
    alternates: { canonical: `/listings/${shoe.id}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/listings/${shoe.id}`,
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
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles(*), shoe_images(*)')
    .eq('id', id)
    .single();
  return data as Shoe | null;
}

async function getCurrentProfile(): Promise<{ id: string; isAdmin: boolean } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single();
  if (!data) return null;
  return { id: data.id, isAdmin: !!data.is_admin };
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

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const [shoe, currentProfile] = await Promise.all([
    getShoe(params.id),
    getCurrentProfile(),
  ]);

  const offerCount = await getOfferCount(params.id);

  if (!shoe) notFound();

  const currentProfileId = currentProfile?.id ?? null;
  const isAdmin = currentProfile?.isAdmin ?? false;
  const isOwner = currentProfileId === shoe.seller_id;
  const seller = shoe.profiles;
  const purchaseContext = await getPurchaseContext(shoe.id, currentProfileId, isOwner, shoe.status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 transition-colors">
        ← Back to Browse
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="min-w-0">
          <PhotoGallery images={shoe.shoe_images ?? []} />
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ListingTypeBadge type={shoe.listing_type} />
            <Badge className={cn(CONDITION_COLORS[shoe.condition])}>
              {CONDITIONS[shoe.condition]}
            </Badge>
            {shoe.status !== 'active' && (
              <Badge className="bg-gray-800 text-gray-400 border border-gray-700 capitalize">{shoe.status}</Badge>
            )}
            {shoe.is_featured && (
              <Badge className="bg-teal-500/15 text-teal-300 border border-teal-500/40">
                ★ Featured
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-100">{formatListingName(shoe.brand, shoe.model)}</h1>
          <p className="text-gray-500 mt-1">{shoe.color}</p>

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

          {/* Specs */}
          <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
            {[
              { label: 'Size', value: formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm) },
              { label: 'Mileage', value: shoe.mileage_km != null ? `${shoe.mileage_km.toLocaleString()} km` : 'Not provided' },
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

          {/* Seller Card */}
          {seller && (
            <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-4">
                <Link href={`/profile/${seller.id}`} className="shrink-0">
                  {seller.avatar_url ? (
                    <Image src={seller.avatar_url} alt={seller.display_name} width={48} height={48} className="rounded-full border border-gray-700" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                      {seller.display_name[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
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
              {seller.fb_username && !isOwner && (
                <ContactSellerButtons fbUsername={seller.fb_username} listingId={shoe.id} />
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
            <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
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

          {/* Buy button — for_sale, active, non-owners only, no existing request */}
          {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && shoe.price_php && (
            <BuyButton
              listingId={shoe.id}
              listingName={formatListingName(shoe.brand, shoe.model)}
              buyerId={currentProfileId}
              priceFormatted={formatPrice(shoe.price_php)}
              pricePhp={shoe.price_php}
              isNegotiable={shoe.is_negotiable}
              seller={seller ?? undefined}
              offerCount={offerCount}
            />
          )}
          {shoe.listing_type === 'for_sale' && shoe.status === 'active' && !isOwner && !currentProfileId && (
            <p className="mt-4 text-sm text-gray-500">Sign in to buy this listing.</p>
          )}

          {shoe.listing_type === 'donate' && shoe.status === 'active' && !isOwner && currentProfileId && !purchaseContext && (
            <DonateRequestButton
              listingId={shoe.id}
              listingName={formatListingName(shoe.brand, shoe.model)}
              requesterId={currentProfileId}
            />
          )}
          {shoe.listing_type === 'donate' && shoe.status === 'active' && !isOwner && !currentProfileId && (
            <p className="mt-4 text-sm text-gray-500">Sign in to request this donation.</p>
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
              {/* StatusButton returns null for reserved (handled by CompleteSaleButtons above) */}
              <StatusButton shoeId={shoe.id} currentStatus={shoe.status} listingType={shoe.listing_type} />
              <DeleteListingButton shoeId={shoe.id} />
            </div>
          )}

          {/* Admin-only: feature toggle */}
          {isAdmin && (
            <div className="mt-6 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-teal-400 font-semibold mb-2">
                Admin controls
              </p>
              <FeatureToggleButton
                shoeId={shoe.id}
                isFeatured={!!shoe.is_featured}
                status={shoe.status}
              />
              <p className="mt-2 text-[11px] text-gray-500">
                Only one listing can be featured at a time. Featuring this one will replace the current pick.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
