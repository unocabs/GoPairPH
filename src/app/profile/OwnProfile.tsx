'use client';

import { useState } from 'react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { PurchaseRequestCard } from '@/components/purchases/PurchaseRequestCard';
import { PurchaseHistoryCard } from '@/components/purchases/PurchaseHistoryCard';
import { RequestVerificationButton } from '@/components/profile/RequestVerificationButton';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest } from '@/types';
import Link from 'next/link';

type ProfileTab = 'listings' | 'purchases' | 'sales' | 'wishlist';

interface OwnProfileProps {
  profile: Profile;
  shoes: Shoe[];
  wishlist: WishlistItem[];
  purchaseRequests: PurchaseRequest[];
  purchaseHistory: PurchaseRequest[];
  latestVerification: VerificationRequest | null;
  initialTab?: ProfileTab;
}

export function OwnProfile({
  profile: initialProfile,
  shoes,
  wishlist: initialWishlist,
  purchaseRequests: initialPurchaseRequests,
  purchaseHistory,
  latestVerification,
  initialTab,
}: OwnProfileProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [purchaseRequests, setPurchaseRequests] = useState(initialPurchaseRequests);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'listings');

  function handleWishlistDeleted(id: string) {
    setWishlist(prev => prev.filter(w => w.id !== id));
  }

  function handlePurchaseRequestChanged(id: string) {
    setPurchaseRequests(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
        <div className="flex-1">
          <ProfileHeader profile={profile} listingCount={shoes.length} wishlistCount={wishlist.length} />
          <div className="mt-3">
            <RequestVerificationButton
              profileId={profile.id}
              isVerified={profile.is_verified}
              existingRequest={latestVerification}
            />
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>Edit Profile</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {(
          [
            { key: 'listings', label: `My Listings (${shoes.length})`, count: undefined as number | undefined },
            { key: 'purchases', label: `Purchase Requests`, count: purchaseRequests.length as number | undefined },
            { key: 'sales', label: `Purchase History (${purchaseHistory.length})`, count: undefined as number | undefined },
            { key: 'wishlist', label: `Wishlist (${wishlist.length})`, count: undefined as number | undefined },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {count}
              </span>
            )}
          </button>
        ))}
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
                const listing = shoes.find(s => s.id === req.listing_id);
                return (
                  <PurchaseRequestCard
                    key={req.id}
                    request={req}
                    listingId={req.listing_id}
                    listingName={listing ? `${listing.brand} ${listing.model}` : req.listing ? `${(req.listing as { brand: string; model: string }).brand} ${(req.listing as { brand: string; model: string }).model}` : 'Your listing'}
                    listingPrice={listing?.price_php ? formatPrice(listing.price_php) : req.listing?.price_php ? formatPrice(req.listing.price_php) : ''}
                    listingStatus={req.listing?.status}
                    onChanged={handlePurchaseRequestChanged}
                  />
                );
              })}
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

      {editOpen && (
        <EditProfileModal profile={profile} onClose={() => setEditOpen(false)} onUpdated={setProfile} />
      )}
    </div>
  );
}
