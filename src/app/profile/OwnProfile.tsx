'use client';

import { useEffect, useRef, useState } from 'react';
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
import { formatGpCoins, getGpCoinTransactionLabel } from '@/lib/gpCoins';
import { buildMessengerUrl } from '@/lib/facebook';
import { trackMarketplaceAction } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Tooltip } from '@/components/ui/Tooltip';
import type { GpCoinTransaction, GpCoinWallet, Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest, SavedSearch } from '@/types';
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
  gpCoinWallet?: GpCoinWallet | null;
  gpCoinTransactions?: GpCoinTransaction[];
  nextGpCoinsExpiring?: { remaining_amount: number; expires_at: string } | null;
  initialTab?: ProfileTab;
  postListingId?: string;
}

function GpCoinsPanel({
  wallet,
  transactions,
  nextExpiring,
}: {
  wallet?: GpCoinWallet | null;
  transactions: GpCoinTransaction[];
  nextExpiring: { remaining_amount: number; expires_at: string } | null;
}) {
  const available = Number(wallet?.available_balance ?? 0);
  const reserved = Number(wallet?.reserved_balance ?? 0);
  const isNegative = available < 0;
  const expiringLabel = nextExpiring
    ? `${formatGpCoins(Number(nextExpiring.remaining_amount))} on ${new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    }).format(new Date(nextExpiring.expires_at))}`
    : 'None in the next bucket';

  return (
    <SurfaceCard className="mb-4 overflow-hidden p-4 sm:mb-6">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">GoPair Coins</p>
        <p className={`mt-2 text-3xl font-black tabular-nums ${isNegative ? 'text-red-300' : 'text-amber-100'}`}>
          {formatGpCoins(available)}
        </p>
      </div>

      {isNegative && (
        <div className="mt-3 rounded-lg border border-red-400/25 bg-red-500/[0.08] px-3 py-2 text-xs leading-5 text-red-100">
          Your coin balance is negative because a previous reward was reversed. Future earnings will bring it back up before coins can be redeemed.
        </div>
      )}

      <details className="mt-4 rounded-lg border border-white/[0.08] bg-slate-950/35">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-gray-200">How to use and earn GP Coins</summary>
        <div className="border-t border-white/[0.06] p-3">
          <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3">
            <p className="text-sm font-semibold text-amber-100">Use GP Coins to promote your running shoes on the homepage.</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/75">
              Open your active listings, choose the pair you want to boost, tap Promote Listing, then choose Featured on Home and apply your GP Coins at checkout.
            </p>
            <Link href="/profile#active-listings" className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300/30 bg-slate-950/45 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-300/10">
              Choose an active pair
            </Link>
          </div>

          <div className="mt-3 grid gap-2 text-xs leading-5 text-gray-400 sm:grid-cols-2">
            <p>Publish a valid listing: 10 GP after 1 hour, max once per Manila day.</p>
            <p>Renew a listing: 6 GP per eligible renewal.</p>
            <p>Share Post Kit: copy/download/open FB group rewards, capped at 5 GP daily.</p>
            <p>Coins expire after 6 months and are only usable inside Go Pair PH promotions.</p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.08] bg-slate-950/45 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Reserved</p>
              <p className="mt-1 text-lg font-bold text-gray-100">{formatGpCoins(reserved)}</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-slate-950/45 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Next expiry</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-gray-100">{expiringLabel}</p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-white/[0.06]">
            {transactions.length === 0 ? (
              <p className="py-3 text-sm text-gray-500">No GP Coin activity yet.</p>
            ) : transactions.slice(0, 8).map(transaction => {
              const delta = transaction.available_delta + transaction.reserved_delta;
              const sign = delta > 0 ? '+' : '';
              return (
                <div key={transaction.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-200">{getGpCoinTransactionLabel(transaction)}</p>
                    <p className="text-xs text-gray-500">
                      {new Intl.DateTimeFormat('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'Asia/Manila',
                      }).format(new Date(transaction.created_at))}
                    </p>
                  </div>
                  <p className={`shrink-0 font-bold tabular-nums ${delta >= 0 ? 'text-amber-200' : 'text-gray-400'}`}>
                    {sign}{delta} GP
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </SurfaceCard>
  );
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
  gpCoinWallet,
  gpCoinTransactions = [],
  nextGpCoinsExpiring = null,
  initialTab,
  postListingId,
}: OwnProfileProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [wishlist] = useState(initialWishlist);
  const [savedListings, setSavedListings] = useState(initialSavedListings);
  const [purchaseRequests, setPurchaseRequests] = useState(initialPurchaseRequests);
  const [sentOffers, setSentOffers] = useState(initialSentOffers);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialFocus, setEditInitialFocus] = useState<'facebook' | undefined>();
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'listings');
  const [sharePostShoe, setSharePostShoe] = useState<Shoe | null>(null);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [locationEditOpen, setLocationEditOpen] = useState(false);
  const [locationCity, setLocationCity] = useState(initialProfile.location_city ?? '');
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const messengerPromptTrackedRef = useRef(false);

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
  const showPostListingMessengerPrompt = !!postListingId && !hasValidMessengerContact;
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

  useEffect(() => {
    if (!showPostListingMessengerPrompt || messengerPromptTrackedRef.current) return;
    messengerPromptTrackedRef.current = true;
    trackMarketplaceAction('post_listing_messenger_prompt_view', {
      listing_id: postListingId,
      surface: 'profile_post_listing',
    });
  }, [postListingId, showPostListingMessengerPrompt]);

  function openPostListingMessengerEditor() {
    trackMarketplaceAction('post_listing_messenger_prompt_click', {
      listing_id: postListingId,
      surface: 'profile_post_listing',
    });
    setEditInitialFocus('facebook');
    setEditOpen(true);
  }

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
              onEditFacebook={() => { setEditInitialFocus('facebook'); setEditOpen(true); }}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 px-2.5" onClick={() => { setEditInitialFocus(undefined); setEditOpen(true); }}>
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

        <div id="verification" tabIndex={-1} className="mt-3 flex scroll-mt-24 flex-wrap items-center gap-2 focus:outline-none sm:ml-[92px]">
          {!profile.is_verified && (
            <RequestVerificationButton
              profileId={profile.id}
              isVerified={profile.is_verified}
              existingRequest={latestVerification}
              fbUsername={profile.fb_username}
            />
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

      {showPostListingMessengerPrompt && (
        <SurfaceCard glow className="mb-4 border-sky-400/25 bg-sky-500/[0.06] p-4 sm:mb-6 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/25" aria-hidden="true">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">One last seller setup</p>
                <h2 className="mt-1.5 text-lg font-bold leading-6 text-gray-100">Your listing is live—make it easy for buyers to reach you.</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-400">
                  Buyers are more likely to ask about a pair and send an offer when the seller is easy to contact. Add Messenger so interested runners can reach you quickly.
                </p>
              </div>
            </div>
            <div className="shrink-0 sm:w-44">
              <Button type="button" onClick={openPostListingMessengerEditor} className="w-full">
                Add Messenger
              </Button>
              <p className="mt-1.5 text-center text-[11px] text-gray-500">Takes about a minute</p>
            </div>
          </div>
        </SurfaceCard>
      )}

      <GpCoinsPanel
        wallet={gpCoinWallet}
        transactions={gpCoinTransactions}
        nextExpiring={nextGpCoinsExpiring}
      />

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

      {(needsPhotoListing || (!hasValidMessengerContact && !showPostListingMessengerPrompt) || shareTarget) && (
        <SurfaceCard className="mb-4 p-3 sm:mb-6 sm:p-4">
          <p className="mb-2 text-sm font-semibold text-gray-100">Quick ways to improve your shop</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {needsPhotoListing && (
              <Link href={`/listings/${needsPhotoListing.id}/edit#photos`} className="rounded-lg border border-teal-400/25 bg-teal-500/[0.08] px-3 py-2.5 text-xs text-teal-100 transition-colors hover:border-teal-300/40 hover:bg-teal-500/[0.14]">
                <strong className="block text-teal-50">Complete your photos</strong>
                <span className="mt-0.5 block text-teal-200/65">Add top and sole views →</span>
              </Link>
            )}
            {!hasValidMessengerContact && !showPostListingMessengerPrompt && (
              <button type="button" onClick={() => { setEditInitialFocus('facebook'); setEditOpen(true); }} className="rounded-lg border border-sky-400/25 bg-sky-500/[0.08] px-3 py-2.5 text-left text-xs text-sky-100 transition-colors hover:border-sky-300/40 hover:bg-sky-500/[0.14]">
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
        <div id="active-listings" tabIndex={-1} className="scroll-mt-24 focus:outline-none">
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
        <EditProfileModal profile={profile} initialFocus={editInitialFocus} onClose={() => setEditOpen(false)} onUpdated={setProfile} />
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
