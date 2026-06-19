'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { WishlistDeepLinkGrid } from '@/components/wishlist/WishlistDeepLinkGrid';
import { PurchaseRequestCard } from '@/components/purchases/PurchaseRequestCard';
import { PurchaseHistoryCard } from '@/components/purchases/PurchaseHistoryCard';
import { ManualSaleHistoryCard } from '@/components/purchases/ManualSaleHistoryCard';
import { SentOfferCard } from '@/components/purchases/SentOfferCard';
import { RequestVerificationButton } from '@/components/profile/RequestVerificationButton';
import { SavedSearchesPanel } from '@/components/profile/SavedSearchesPanel';
import { formatPrice, formatListingName, getListingPath, getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { buildMessengerUrl } from '@/lib/facebook';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest, SavedSearch } from '@/types';
import Link from 'next/link';

const SharePostModal = dynamic(
  () => import('@/components/listings/SharePostModal').then(mod => mod.SharePostModal),
  { ssr: false },
);

type ProfileTab = 'listings' | 'purchases' | 'offers' | 'wishlist' | 'saved' | 'searches' | 'sales';

interface OwnProfileProps {
  profile: Profile;
  shoes: Shoe[];
  wishlist: WishlistItem[];
  savedSearches: SavedSearch[];
  savedListings: Shoe[];
  purchaseRequests: PurchaseRequest[];
  sentOffers: PurchaseRequest[];
  purchaseHistory: PurchaseRequest[];
  manualSaleListings: Shoe[];
  latestVerification: VerificationRequest | null;
  viewCounts?: Record<string, { total: number; last7d: number }>;
  savedListingCounts?: Record<string, number>;
  shareMetrics?: { captionCopies: number; imageDownloads: number };
  completedSales?: number;
  initialTab?: ProfileTab;
}

export function OwnProfile({
  profile: initialProfile,
  shoes,
  wishlist: initialWishlist,
  savedSearches,
  savedListings: initialSavedListings,
  purchaseRequests: initialPurchaseRequests,
  sentOffers: initialSentOffers,
  purchaseHistory,
  manualSaleListings,
  latestVerification,
  viewCounts,
  savedListingCounts,
  shareMetrics,
  completedSales,
  initialTab,
}: OwnProfileProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [wishlist] = useState(initialWishlist);
  const [savedListings, setSavedListings] = useState(initialSavedListings);
  const [purchaseRequests, setPurchaseRequests] = useState(initialPurchaseRequests);
  const [sentOffers, setSentOffers] = useState(initialSentOffers);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'listings');
  const [sharePostShoe, setSharePostShoe] = useState<Shoe | null>(null);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [locationEditOpen, setLocationEditOpen] = useState(false);
  const [locationCity, setLocationCity] = useState(initialProfile.location_city ?? '');
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  function handlePurchaseRequestChanged(id: string) {
    setPurchaseRequests(prev => prev.filter(r => r.id !== id));
  }

  function handleSentOfferChanged(id: string) {
    setSentOffers(prev => prev.filter(r => r.id !== id));
  }

  function handleSavedListingChanged(id: string, saved: boolean) {
    if (!saved) setSavedListings(prev => prev.filter(shoe => shoe.id !== id));
  }

  function openTab(nextTab: ProfileTab, bringIntoView = false) {
    setTab(nextTab);
    if (bringIntoView) {
      window.requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function openLocationEditor() {
    setLocationCity(profile.location_city ?? '');
    setLocationError(null);
    setLocationEditOpen(true);
  }

  function closeLocationEditor() {
    if (locationSaving) return;
    setLocationEditOpen(false);
    setLocationError(null);
  }

  async function handleLocationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const city = locationCity.trim();
    if (!city) {
      setLocationError('Please enter your city.');
      return;
    }
    if (city.length > 80) {
      setLocationError('City must be 80 characters or fewer.');
      return;
    }

    setLocationSaving(true);
    setLocationError(null);
    const { data: updated, error } = await createClient()
      .from('profiles')
      .update({ location_city: city })
      .eq('id', profile.id)
      .select()
      .single();

    if (error || !updated) {
      setLocationError(error?.message ?? 'Could not save your location.');
      setLocationSaving(false);
      return;
    }

    setProfile(updated as Profile);
    setLocationSaving(false);
    setLocationEditOpen(false);
  }

  const activeSentOffersCount = sentOffers.filter(
    offer => offer.status === 'pending' || offer.status === 'accepted'
  ).length;

  const tabs: ReadonlyArray<{ key: ProfileTab; label: string; count: number; badgeTone?: 'default' | 'attention' }> = [
    { key: 'listings', label: 'My Listings', count: shoes.length },
    { key: 'purchases', label: 'Purchase Requests', count: purchaseRequests.length, badgeTone: 'attention' },
    { key: 'offers', label: 'Sent Offers', count: activeSentOffersCount, badgeTone: 'attention' },
    { key: 'saved', label: 'Saved Pairs', count: savedListings.length },
    { key: 'searches', label: 'Saved Searches', count: savedSearches.length },
    { key: 'wishlist', label: 'Looking For', count: wishlist.length },
    { key: 'sales', label: 'Purchase History', count: purchaseHistory.length + manualSaleListings.length },
  ];
  const listingViewSummaries = Object.values(viewCounts ?? {});
  const totalListingViews = listingViewSummaries.reduce((sum, item) => sum + item.total, 0);
  const activeShoes = shoes.filter((shoe) => shoe.status === 'active');
  const closedShoes = shoes.filter((shoe) => shoe.status !== 'active');
  const orderedShoes = [...activeShoes, ...closedShoes];
  const activeListings = activeShoes.length;
  const requestCountsByListing = purchaseRequests.reduce<Record<string, number>>((counts, request) => {
    counts[request.listing_id] = (counts[request.listing_id] ?? 0) + 1;
    return counts;
  }, {});
  const shareTarget = activeShoes.find((shoe) => (viewCounts?.[shoe.id]?.total ?? 0) > 0) ?? activeShoes[0];
  const hasValidMessengerContact = !!buildMessengerUrl(profile.fb_username);
  const totalListingSaves = activeShoes.reduce((sum, shoe) => sum + (savedListingCounts?.[shoe.id] ?? 0), 0);
  const strongestListing = [...activeShoes].sort((a, b) => {
    const viewDifference = (viewCounts?.[b.id]?.total ?? 0) - (viewCounts?.[a.id]?.total ?? 0);
    if (viewDifference !== 0) return viewDifference;
    const saveDifference = (savedListingCounts?.[b.id] ?? 0) - (savedListingCounts?.[a.id] ?? 0);
    if (saveDifference !== 0) return saveDifference;
    return (requestCountsByListing[b.id] ?? 0) - (requestCountsByListing[a.id] ?? 0);
  })[0];
  const strongestListingImage = strongestListing?.shoe_images?.find(image => image.view_type === 'top')
    ?? strongestListing?.shoe_images?.[0];
  const strongestListingImageUrl = strongestListingImage
    ? getPublicUrl(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        strongestListingImage.storage_path,
        'shoe-images',
        IMAGE_TRANSFORM_PRESETS.listingCard,
      )
    : null;
  const needsPhotoListing = activeShoes.find((shoe) => {
    const images = shoe.shoe_images ?? [];
    return !images.some(image => image.view_type === 'top') || !images.some(image => image.view_type === 'sole');
  });

  async function handleShareProfile() {
    const url = `${window.location.origin}/profile/${profile.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.display_name} on GoPairPH`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setProfileLinkCopied(true);
    window.setTimeout(() => setProfileLinkCopied(false), 2000);
  }

  return (
    <div>
      <SurfaceCard glow className="mb-4 overflow-hidden p-4 sm:mb-6 sm:p-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ProfileHeader
              profile={profile}
              listingCount={shoes.length}
              wishlistCount={wishlist.length}
              completedSales={completedSales}
              isOwnProfile
              onEditLocation={openLocationEditor}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 px-2.5" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        </div>

        {locationEditOpen && (
          <form onSubmit={handleLocationSubmit} className="mt-3 rounded-xl border border-teal-400/20 bg-teal-500/[0.06] p-3 sm:ml-[92px] sm:max-w-lg">
            <label htmlFor="inline-profile-city" className="text-xs font-semibold text-gray-200">Your city</label>
            <div className="mt-1.5 flex flex-col gap-2 min-[380px]:flex-row">
              <input
                id="inline-profile-city"
                value={locationCity}
                onChange={(event) => {
                  setLocationCity(event.target.value);
                  if (locationError) setLocationError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeLocationEditor();
                }}
                autoFocus
                maxLength={80}
                placeholder="e.g. Angeles City"
                disabled={locationSaving}
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
              />
              <div className="grid grid-cols-2 gap-2 min-[380px]:flex">
                <Button type="button" size="sm" variant="ghost" className="h-10" onClick={closeLocationEditor} disabled={locationSaving}>Cancel</Button>
                <Button type="submit" size="sm" className="h-10" loading={locationSaving}>Save</Button>
              </div>
            </div>
            {locationError && <p className="mt-1.5 text-xs text-red-300" role="alert">{locationError}</p>}
            <p className="mt-1.5 text-[11px] text-gray-500">Province and region can still be changed in Edit Profile.</p>
          </form>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 sm:ml-[92px]">
          {!profile.is_verified && (
            <RequestVerificationButton
              profileId={profile.id}
              isVerified={profile.is_verified}
              existingRequest={latestVerification}
              fbUsername={profile.fb_username}
            />
          )}
          {!hasValidMessengerContact && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-2.5 py-1 text-xs font-medium text-blue-200 hover:bg-blue-500/[0.14]"
            >
              Add Messenger contact
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:ml-[92px] sm:flex sm:max-w-lg">
          <Link href="/listings/new" className="min-w-0 sm:flex-1">
            <Button className="h-10 w-full px-3 text-sm">+ Add a pair</Button>
          </Link>
          <Button variant="outline" className="h-10 w-full px-3 text-sm sm:flex-1" onClick={handleShareProfile}>
            {profileLinkCopied ? 'Link copied' : 'Share profile'}
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="mb-4 overflow-hidden p-2 sm:mb-6 sm:p-3">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/[0.08] sm:grid-cols-6">
          {[
            {
              label: 'Active',
              value: activeListings,
              tone: 'text-teal-300',
              description: 'Your live pairs, ready for buyers to discover.',
            },
            {
              label: 'Views',
              value: totalListingViews,
              tone: 'text-sky-300',
              description: 'Total times your listings have been viewed.',
            },
            {
              label: 'Saves',
              value: totalListingSaves,
              tone: 'text-rose-300',
              description: 'Buyers saved your pairs—a great sign of interest.',
            },
            {
              label: 'Offers',
              value: purchaseRequests.length,
              tone: purchaseRequests.length > 0 ? 'text-amber-300' : 'text-violet-300',
              description: 'Pending and accepted buyer offers on your listings.',
            },
            {
              label: 'Caption copies',
              value: shareMetrics?.captionCopies ?? 0,
              tone: 'text-cyan-300',
              description: 'Captions you copied for Facebook. Sharing more often can help more buyers discover your listings. Keep it up!',
            },
            {
              label: 'Image downloads',
              value: shareMetrics?.imageDownloads ?? 0,
              tone: 'text-orange-300',
              description: "Share images you saved for Facebook. Posting them can help you reach more buyers and get more offers. Let's go!",
            },
          ].map((metric) => (
            <Tooltip key={metric.label} trigger="both" content={metric.description}>
              <button
                type="button"
                aria-label={`${metric.label}: ${metric.value.toLocaleString()}. ${metric.description}`}
                className="h-full w-full min-w-0 cursor-help bg-slate-900 px-1.5 py-2.5 text-center transition-colors hover:bg-slate-800 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
              >
                <span className={`block truncate text-xl font-bold leading-none tabular-nums sm:text-2xl ${metric.tone}`}>{metric.value.toLocaleString()}</span>
                <span className="mt-1.5 flex min-h-6 items-start justify-center gap-0.5 text-[9px] font-medium uppercase leading-3 tracking-wide text-gray-500 sm:min-h-0 sm:text-[10px]">
                  <span>{metric.label}</span>
                  <svg className="mt-px h-3 w-3 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    <path strokeLinecap="round" strokeWidth={2} d="M12 11v5" />
                    <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
              </button>
            </Tooltip>
          ))}
        </div>
        {purchaseRequests.length > 0 && (
          <button
            type="button"
            onClick={() => openTab('purchases', true)}
            className="mt-2 flex w-full items-center justify-between rounded-lg border border-amber-400/20 bg-amber-500/[0.08] px-3 py-2 text-left text-xs font-semibold text-amber-100 hover:bg-amber-500/[0.13] sm:text-sm"
          >
            <span>{purchaseRequests.length} buyer offer{purchaseRequests.length === 1 ? '' : 's'} waiting</span>
            <span>Review →</span>
          </button>
        )}
      </SurfaceCard>

      {strongestListing && (
        <SurfaceCard className="mb-4 overflow-hidden p-3 sm:mb-6 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Most active listing</p>
            <span className="text-[11px] text-gray-500">Based on your activity</span>
          </div>
          <div className="flex gap-3 sm:items-center">
            <Link href={getListingPath(strongestListing)} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-900 sm:h-24 sm:w-32">
              {strongestListingImageUrl ? (
                <Image src={strongestListingImageUrl} alt={formatListingName(strongestListing.brand, strongestListing.model)} fill sizes="(max-width: 640px) 96px, 128px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl text-gray-700">👟</span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={getListingPath(strongestListing)} className="block truncate font-semibold text-gray-100 hover:text-teal-300">
                {formatListingName(strongestListing.brand, strongestListing.model)}
              </Link>
              <p className="mt-1 text-sm font-bold text-teal-300">
                {strongestListing.price_php ? formatPrice(strongestListing.price_php) : 'For donation'}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                <span>{viewCounts?.[strongestListing.id]?.total ?? 0} views</span>
                <span>{savedListingCounts?.[strongestListing.id] ?? 0} saves</span>
                <span>{requestCountsByListing[strongestListing.id] ?? 0} offers</span>
              </div>
            </div>
            <button type="button" onClick={() => setSharePostShoe(strongestListing)} className="hidden shrink-0 rounded-lg border border-blue-400/45 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-500/20 sm:block">
              Share again
            </button>
          </div>
        </SurfaceCard>
      )}

      {(needsPhotoListing || !hasValidMessengerContact || shareTarget) && (
        <SurfaceCard className="mb-4 p-3 sm:mb-6 sm:p-4">
          <p className="mb-2 text-sm font-semibold text-gray-100">Quick ways to improve your shop</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {needsPhotoListing && (
              <Link href={`/listings/${needsPhotoListing.id}/edit#photos`} className="rounded-lg border border-teal-400/25 bg-teal-500/[0.08] px-3 py-2.5 text-xs text-teal-100 transition-colors hover:border-teal-300/40 hover:bg-teal-500/[0.14]">
                <strong className="block text-teal-50">Complete your photos</strong>
                <span className="mt-0.5 block text-teal-200/65">Add top and sole views →</span>
              </Link>
            )}
            {!hasValidMessengerContact && (
              <button type="button" onClick={() => setEditOpen(true)} className="rounded-lg border border-sky-400/25 bg-sky-500/[0.08] px-3 py-2.5 text-left text-xs text-sky-100 transition-colors hover:border-sky-300/40 hover:bg-sky-500/[0.14]">
                <strong className="block text-sky-50">Make contact easier</strong>
                <span className="mt-0.5 block text-sky-200/65">Add your Messenger username →</span>
              </button>
            )}
            {shareTarget && (
              <button type="button" onClick={() => setSharePostShoe(shareTarget)} className="rounded-lg border border-blue-400/25 bg-blue-500/[0.08] px-3 py-2.5 text-left text-xs text-blue-100 transition-colors hover:border-blue-300/40 hover:bg-blue-500/[0.14]">
                <strong className="block text-blue-50">Reach more buyers</strong>
                <span className="mt-0.5 block text-blue-200/65">Share a listing on Facebook →</span>
              </button>
            )}
          </div>
        </SurfaceCard>
      )}

      <div ref={tabsRef} className="scroll-mt-20">
        <SurfaceCard className="-mx-4 mb-4 overflow-x-auto rounded-none border-x-0 border-gray-800/80 bg-slate-950/40 px-0 py-0 sm:mx-0 sm:mb-6 sm:rounded-xl sm:border-x sm:px-2">
          <div className="flex min-w-max gap-1 px-4 sm:min-w-0 sm:px-0">
            {tabs.map(({ key, label, count, badgeTone }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => openTab(key)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                    active ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={[
                      'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none tabular-nums',
                      badgeTone === 'attention' && count > 0
                        ? 'bg-sky-500 text-white'
                        : active
                          ? 'bg-teal-500/15 text-teal-300'
                          : 'bg-gray-800 text-gray-400',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </SurfaceCard>
      </div>

      {tab === 'listings' && (
        <div>
          <ListingGrid
            shoes={orderedShoes}
            currentProfileId={profile.id}
            currentProfileIsAdmin={profile.is_admin}
            currentProfileFbUsername={profile.fb_username}
            offerCounts={requestCountsByListing}
            viewCounts={viewCounts}
            savedListingCounts={savedListingCounts}
            emptyMessage="You haven't listed any shoes yet."
          />
        </div>
      )}

      {tab === 'purchases' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Active offers on your for-sale listings</p>
          {purchaseRequests.length === 0 ? (
            <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
              <span className="text-4xl opacity-50">🛒</span>
              <p className="mt-3 text-gray-500">No pending offers.</p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {purchaseRequests.map(req => {
                const listing = shoes.find(s => s.id === req.listing_id) ?? (req.listing as Shoe | undefined);
                const listingName = listing ? formatListingName(listing.brand, listing.model) : 'Your listing';
                return (
                  <PurchaseRequestCard
                    key={req.id}
                    request={req}
                    listing={listing}
                    listingId={req.listing_id}
                    listingName={listingName}
                    listingPrice={listing?.price_php ? formatPrice(listing.price_php) : ''}
                    listingStatus={req.listing?.status}
                    onChanged={handlePurchaseRequestChanged}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Offers you&apos;ve sent and items reserved for you</p>
          {sentOffers.length === 0 ? (
            <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
              <span className="text-4xl opacity-50">📨</span>
              <p className="mt-3 text-gray-500">You haven&apos;t sent any offers yet.</p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sentOffers.map(req => (
                <SentOfferCard key={req.id} request={req} onChanged={handleSentOfferChanged} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'wishlist' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Pair requests you&apos;ve posted</p>
            <Link href="/looking-for/new">
              <Button size="sm">+ Looking For...</Button>
            </Link>
          </div>
          {wishlist.length === 0 ? (
            <SurfaceCard className="border-dashed p-8 text-center text-gray-500">
              You haven&apos;t posted anything you&apos;re looking for yet.
            </SurfaceCard>
          ) : (
            <WishlistDeepLinkGrid items={wishlist} />
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">Pairs you saved for later</p>
            <Link href="/browse">
              <Button size="sm" variant="outline" className="w-full sm:w-auto">Browse Pairs</Button>
            </Link>
          </div>
          {savedListings.length === 0 ? (
            <SurfaceCard className="border-dashed p-8 text-center text-gray-500">
              No saved pairs yet. Save pairs you like and come back before they sell.
            </SurfaceCard>
          ) : (
            <ListingGrid
              shoes={savedListings}
              currentProfileId={profile.id}
              currentProfileIsAdmin={profile.is_admin}
              currentProfileFbUsername={profile.fb_username}
              savedListingIds={new Set(savedListings.map(shoe => shoe.id))}
              savedListingCounts={savedListingCounts}
              onSavedChange={handleSavedListingChanged}
              emptyMessage="No saved pairs yet. Save pairs you like and come back before they sell."
            />
          )}
        </div>
      )}

      {tab === 'searches' && (
        <SavedSearchesPanel initialSearches={savedSearches} />
      )}

      {tab === 'sales' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Items you&apos;ve bought or sold</p>
          {purchaseHistory.length === 0 && manualSaleListings.length === 0 ? (
            <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
              <span className="text-4xl opacity-50">💰</span>
              <p className="mt-3 text-gray-500">No completed purchases yet.</p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {manualSaleListings.map(shoe => (
                <ManualSaleHistoryCard key={shoe.id} shoe={shoe} />
              ))}
              {purchaseHistory.map(req => (
                <PurchaseHistoryCard key={req.id} request={req} currentProfileId={profile.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {editOpen && (
        <EditProfileModal profile={profile} onClose={() => setEditOpen(false)} onUpdated={setProfile} />
      )}
      {sharePostShoe && typeof window !== 'undefined' && createPortal(
        <SharePostModal
          shoe={sharePostShoe}
          seller={profile}
          onClose={() => setSharePostShoe(null)}
          onDownloaded={() => setSharePostShoe(null)}
        />,
        document.body,
      )}
    </div>
  );
}
