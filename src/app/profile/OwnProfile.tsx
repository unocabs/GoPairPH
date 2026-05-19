'use client';

import { useState } from 'react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { WishlistDeepLinkGrid } from '@/components/wishlist/WishlistDeepLinkGrid';
import { PurchaseRequestCard } from '@/components/purchases/PurchaseRequestCard';
import { PurchaseHistoryCard } from '@/components/purchases/PurchaseHistoryCard';
import { SentOfferCard } from '@/components/purchases/SentOfferCard';
import { RequestVerificationButton } from '@/components/profile/RequestVerificationButton';
import { formatPrice, formatListingName } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest } from '@/types';
import Link from 'next/link';

type ProfileTab = 'listings' | 'purchases' | 'offers' | 'wishlist' | 'saved' | 'sales';

interface OwnProfileProps {
  profile: Profile;
  shoes: Shoe[];
  wishlist: WishlistItem[];
  savedListings: Shoe[];
  purchaseRequests: PurchaseRequest[];
  sentOffers: PurchaseRequest[];
  purchaseHistory: PurchaseRequest[];
  latestVerification: VerificationRequest | null;
  viewCounts?: Record<string, { total: number; last7d: number }>;
  completedSales?: number;
  initialTab?: ProfileTab;
}

export function OwnProfile({
  profile: initialProfile,
  shoes,
  wishlist: initialWishlist,
  savedListings: initialSavedListings,
  purchaseRequests: initialPurchaseRequests,
  sentOffers: initialSentOffers,
  purchaseHistory,
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
    { key: 'wishlist', label: 'Find My Pair', count: wishlist.length },
    { key: 'sales', label: 'Purchase History', count: purchaseHistory.length },
  ];
  const listingViewSummaries = Object.values(viewCounts ?? {});
  const totalListingViews = listingViewSummaries.reduce((sum, item) => sum + item.total, 0);
  const viewsThisWeek = listingViewSummaries.reduce((sum, item) => sum + item.last7d, 0);
  const activeListings = shoes.filter((shoe) => shoe.status === 'active').length;

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
                <span className="text-xl leading-none mt-0.5" aria-hidden>👟</span>
                <div>
                  <p className="text-sm font-semibold text-gray-100">Your pair is being seen.</p>
                  <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                    Keep one clean listing link for each pair, then share it on Facebook Marketplace,
                    groups, Messenger, or anywhere else while managing everything here.
                  </p>
                </div>
              </div>
              <Link href="/listings/new" className="lg:shrink-0">
                <Button size="sm" className="w-full lg:w-auto">+ List a Shoe</Button>
              </Link>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Active listings', value: activeListings.toLocaleString() },
                { label: 'Total listing views', value: totalListingViews.toLocaleString() },
                { label: 'Views this week', value: viewsThisWeek.toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-slate-950/55 px-4 py-3">
                  <p className="text-lg font-bold text-gray-100">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
            {purchaseRequests.length > 0 && (
              <p className="mt-3 text-xs font-medium text-sky-300">
                {purchaseRequests.length} active buyer request{purchaseRequests.length !== 1 ? 's' : ''} waiting for your response.
              </p>
            )}
          </SurfaceCard>
          <ListingGrid
            shoes={shoes}
            currentProfileId={profile.id}
            currentProfileIsAdmin={profile.is_admin}
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
            <Link href="/find-my-pair/new">
              <Button size="sm">+ Post Pair Request</Button>
            </Link>
          </div>
          {wishlist.length === 0 ? (
            <SurfaceCard className="border-dashed p-8 text-center text-gray-500">
              You haven&apos;t posted any pair requests yet.
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
              savedListingIds={new Set(savedListings.map(shoe => shoe.id))}
              onSavedChange={handleSavedListingChanged}
              emptyMessage="No saved pairs yet. Save pairs you like and come back before they sell."
            />
          )}
        </div>
      )}

      {tab === 'sales' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Items you&apos;ve bought or sold</p>
          {purchaseHistory.length === 0 ? (
            <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
              <span className="text-4xl opacity-50">💰</span>
              <p className="mt-3 text-gray-500">No completed purchases yet.</p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
