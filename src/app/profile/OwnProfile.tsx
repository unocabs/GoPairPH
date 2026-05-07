'use client';

import { useState } from 'react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { PurchaseRequestCard } from '@/components/purchases/PurchaseRequestCard';
import { PurchaseHistoryCard } from '@/components/purchases/PurchaseHistoryCard';
import { SentOfferCard } from '@/components/purchases/SentOfferCard';
import { RequestVerificationButton } from '@/components/profile/RequestVerificationButton';
import { formatPrice, formatListingName } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest } from '@/types';
import Link from 'next/link';

type ProfileTab = 'listings' | 'purchases' | 'offers' | 'wishlist' | 'sales';

interface OwnProfileProps {
  profile: Profile;
  shoes: Shoe[];
  wishlist: WishlistItem[];
  purchaseRequests: PurchaseRequest[];
  sentOffers: PurchaseRequest[];
  purchaseHistory: PurchaseRequest[];
  latestVerification: VerificationRequest | null;
  initialTab?: ProfileTab;
}

export function OwnProfile({
  profile: initialProfile,
  shoes,
  wishlist: initialWishlist,
  purchaseRequests: initialPurchaseRequests,
  sentOffers: initialSentOffers,
  purchaseHistory,
  latestVerification,
  initialTab,
}: OwnProfileProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [purchaseRequests, setPurchaseRequests] = useState(initialPurchaseRequests);
  const [sentOffers, setSentOffers] = useState(initialSentOffers);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'listings');

  function handleWishlistDeleted(id: string) {
    setWishlist(prev => prev.filter(w => w.id !== id));
  }

  function handlePurchaseRequestChanged(id: string) {
    setPurchaseRequests(prev => prev.filter(r => r.id !== id));
  }

  function handleSentOfferChanged(id: string) {
    setSentOffers(prev => prev.filter(r => r.id !== id));
  }

  const tabs: ReadonlyArray<{ key: ProfileTab; label: string; count: number; badgeTone?: 'default' | 'attention' }> = [
    { key: 'listings', label: 'My Listings', count: shoes.length },
    { key: 'purchases', label: 'Purchase Requests', count: purchaseRequests.length, badgeTone: 'attention' },
    { key: 'offers', label: 'Sent Offers', count: sentOffers.length, badgeTone: 'attention' },
    { key: 'wishlist', label: 'Wishlist', count: wishlist.length },
    { key: 'sales', label: 'Purchase History', count: purchaseHistory.length },
  ];

  return (
    <div>
      {/* Profile header — stacks centered on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8">
        <div className="flex-1 w-full">
          <ProfileHeader profile={profile} listingCount={shoes.length} wishlistCount={wishlist.length} isOwnProfile />
          <div className="mt-3 flex justify-center sm:justify-start">
            <RequestVerificationButton
              profileId={profile.id}
              isVerified={profile.is_verified}
              existingRequest={latestVerification}
              hasFbUsername={!!profile.fb_username}
            />
          </div>
        </div>
        {/* Edit Profile sits below the centered block on mobile, to the right on sm+ */}
        <div className="w-full sm:w-auto flex justify-center sm:block">
          <Button variant="outline" onClick={() => setEditOpen(true)}>Edit Profile</Button>
        </div>
      </div>

      {/* Tabs — horizontal scroll on mobile so 4 fit comfortably */}
      <div className="-mx-4 sm:mx-0 overflow-x-auto border-b border-gray-800 mb-6">
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
      </div>

      {tab === 'listings' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">All your listings including sold and donated ones</p>
            <Link href="/listings/new">
              <Button size="sm">+ List a Shoe</Button>
            </Link>
          </div>
          <ListingGrid shoes={shoes} currentProfileId={profile.id} emptyMessage="You haven't listed any shoes yet." />
        </div>
      )}

      {tab === 'purchases' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Active purchase requests on your for-sale listings</p>
          {purchaseRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
              <span className="text-4xl opacity-50">🛒</span>
              <p className="mt-3 text-gray-500">No pending purchase requests.</p>
            </div>
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
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
              <span className="text-4xl opacity-50">📨</span>
              <p className="mt-3 text-gray-500">You haven&apos;t sent any offers yet.</p>
            </div>
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
            <p className="text-sm text-gray-500">Shoes you&apos;re looking for</p>
            <Link href="/wishlist/new">
              <Button size="sm">+ Add to Wishlist</Button>
            </Link>
          </div>
          {wishlist.length === 0 ? (
            <p className="text-gray-500">Your wishlist is empty.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.map(item => (
                <WishlistCard key={item.id} item={item} isOwner currentProfileId={profile.id} onDeleted={handleWishlistDeleted} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sales' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Items you&apos;ve bought or sold</p>
          {purchaseHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
              <span className="text-4xl opacity-50">💰</span>
              <p className="mt-3 text-gray-500">No completed purchases yet.</p>
            </div>
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
