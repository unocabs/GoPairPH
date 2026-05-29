'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
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
import { formatPrice, formatListingName } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
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

  function handlePurchaseRequestChanged(id: string) {
    setPurchaseRequests(prev => prev.filter(r => r.id !== id));
  }

  function handleSentOfferChanged(id: string) {
    setSentOffers(prev => prev.filter(r => r.id !== id));
  }

  function handleSavedListingChanged(id: string, saved: boolean) {
    if (!saved) setSavedListings(prev => prev.filter(shoe => shoe.id !== id));
  }

  const tabs: ReadonlyArray<{ key: ProfileTab; label: string; count: number; badgeTone?: 'default' | 'attention' }> = [
    { key: 'listings', label: 'My Listings', count: shoes.length },
    { key: 'purchases', label: 'Purchase Requests', count: purchaseRequests.length, badgeTone: 'attention' },
    { key: 'offers', label: 'Sent Offers', count: sentOffers.length, badgeTone: 'attention' },
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
  const photoReadyCount = activeShoes.filter((shoe) => {
    const images = shoe.shoe_images ?? [];
    return images.some(image => image.view_type === 'top') && images.some(image => image.view_type === 'sole');
  }).length;
  const shareReadyCount = activeShoes.filter((shoe) => {
    const images = shoe.shoe_images ?? [];
    return images.some(image => image.view_type === 'top') && images.some(image => image.view_type === 'sole');
  }).length;
  const shareTarget = activeShoes.find((shoe) => (viewCounts?.[shoe.id]?.total ?? 0) > 0) ?? activeShoes[0];

  return (
    <div>
      {/* Profile header — stacks centered on mobile, row on sm+ */}
      <SurfaceCard glow className="mb-8 flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
        <div className="flex-1 w-full">
          <ProfileHeader profile={profile} listingCount={shoes.length} wishlistCount={wishlist.length} completedSales={completedSales} isOwnProfile />
          <div className="mt-3 flex justify-center sm:justify-start">
            <RequestVerificationButton
              profileId={profile.id}
              isVerified={profile.is_verified}
              existingRequest={latestVerification}
              fbUsername={profile.fb_username}
            />
          </div>
        </div>
        {/* Edit Profile sits below the centered block on mobile, to the right on sm+ */}
        <div className="w-full sm:w-auto flex justify-center sm:block">
          <Button variant="outline" onClick={() => setEditOpen(true)}>Edit Profile</Button>
        </div>
      </SurfaceCard>

      {/* Tabs — horizontal scroll on mobile so 4 fit comfortably */}
      <SurfaceCard className="-mx-4 mb-6 overflow-x-auto rounded-none border-x-0 border-gray-800/80 bg-slate-950/40 px-0 py-0 sm:mx-0 sm:rounded-xl sm:border-x sm:px-2">
        <div className="flex gap-1 px-4 sm:px-0 min-w-max sm:min-w-0">
          {tabs.map(({ key, label, count, badgeTone }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <span>{label}</span>
                <span
                  className={[
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums',
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

      {tab === 'listings' && (
        <div>
          <SurfaceCard className="mb-4 border-teal-500/20 bg-teal-500/[0.04] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-100">
                    {activeListings > 0 ? 'Your active listings are ready to share.' : 'Your closed listings are saved here.'}
                  </p>
                  <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                    Active pairs stay first. Closed pairs are kept lower so your next sale stays easy to manage.
                  </p>
                </div>
              </div>
              <Link href="/listings/new" className="lg:shrink-0">
                <Button size="sm" className="w-full lg:w-auto">+ List a Shoe</Button>
              </Link>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {[
                { label: 'Active', value: activeListings.toLocaleString() },
                { label: 'Photo-ready', value: photoReadyCount.toLocaleString() },
                { label: 'Buyer requests', value: purchaseRequests.length.toLocaleString() },
                { label: 'Closed', value: closedShoes.length.toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-slate-950/55 px-4 py-3">
                  <p className="text-lg font-bold text-gray-100">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
              {[
                { label: 'Active listing live', done: activeListings > 0 },
                { label: 'Top + sole photos', done: activeListings === 0 || photoReadyCount === activeListings },
                { label: 'Contact ready', done: !!profile.fb_username },
                { label: 'Ready to share', done: activeListings > 0 && shareReadyCount > 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2',
                    item.done
                      ? 'border-teal-400/20 bg-teal-400/[0.06] text-teal-100'
                      : 'border-white/[0.08] bg-slate-950/45 text-gray-400',
                  ].join(' ')}
                >
                  <span className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    item.done ? 'bg-teal-400/15 text-teal-200' : 'bg-gray-800 text-gray-500',
                  ].join(' ')}>
                    {item.done ? '✓' : '•'}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {purchaseRequests.length > 0 && (
              <p className="mt-3 text-xs font-medium text-sky-300">
                {purchaseRequests.length} active buyer request{purchaseRequests.length !== 1 ? 's' : ''} waiting for your response.
              </p>
            )}
            {totalListingViews > 0 && shareTarget && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-slate-950/55 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-400">
                  People are checking your pairs. Share again while there&apos;s momentum.
                </p>
                <div className="sm:shrink-0">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setSharePostShoe(shareTarget)}>
                    Share again
                  </Button>
                </div>
              </div>
            )}
          </SurfaceCard>
          <ListingGrid
            shoes={orderedShoes}
            currentProfileId={profile.id}
            currentProfileIsAdmin={profile.is_admin}
            currentProfileFbUsername={profile.fb_username}
            offerCounts={requestCountsByListing}
            viewCounts={viewCounts}
            emptyMessage="You haven't listed any shoes yet."
          />
        </div>
      )}

      {tab === 'purchases' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Active purchase requests on your for-sale listings</p>
          {purchaseRequests.length === 0 ? (
            <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
              <span className="text-4xl opacity-50">🛒</span>
              <p className="mt-3 text-gray-500">No pending purchase requests.</p>
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
