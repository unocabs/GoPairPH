export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OwnProfile } from './OwnProfile';
import type { Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest } from '@/types';

async function getOwnProfileData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if (!profile) return null;

  const [shoesRes, wishlistRes] = await Promise.all([
    supabase.from('shoes').select('*, shoe_images(*), shops(*), shoe_variants(*)').eq('seller_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('wishlist_items').select('*, wishlist_images(*), wishlist_offers(count)').eq('user_id', profile.id).order('created_at', { ascending: false }),
  ]);

  const allShoes = (shoesRes.data as Shoe[]) ?? [];
  const shoeIds = allShoes.map(s => s.id);
  // Exclude completed items from My Listings — they live in Purchase History
  const shoes = allShoes.filter(s => s.status !== 'sold' && s.status !== 'donated');

  // Incoming purchase requests on my listings (pending + accepted)
  let purchaseRequests: PurchaseRequest[] = [];
  if (shoeIds.length > 0) {
    const { data: prData } = await supabase
      .from('purchase_requests')
      .select('*, profiles(*), shoe_variants(*), listing:shoes!listing_id(id, slug, status, brand, model, price_php, listing_type)')
      .in('listing_id', shoeIds)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });
    purchaseRequests = (prData as PurchaseRequest[]) ?? [];
  }

  // Purchase history: only completed transactions (reserved/accepted live in the Sent Offers tab)
  const purchaseSelect = '*, profiles(*), shoe_variants(*), listing:shoes!listing_id(*, shoe_images(*), profiles(*))';
  const [boughtRes, soldRes, sentOffersRes] = await Promise.all([
    supabase.from('purchase_requests').select(purchaseSelect).eq('buyer_id', profile.id).eq('status', 'completed'),
    shoeIds.length > 0
      ? supabase.from('purchase_requests').select(purchaseSelect).in('listing_id', shoeIds).eq('status', 'completed')
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from('purchase_requests')
      .select(purchaseSelect)
      .eq('buyer_id', profile.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false }),
  ]);
  const purchaseHistory = [
    ...((boughtRes.data as PurchaseRequest[]) ?? []),
    ...((soldRes.data as PurchaseRequest[]) ?? []),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const sentOffers = (sentOffersRes.data as PurchaseRequest[]) ?? [];

  // Most recent verification request (if any)
  const { data: verificationData } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestVerification = verificationData as VerificationRequest | null;

  return {
    profile: profile as Profile,
    shoes,
    wishlist: (wishlistRes.data as WishlistItem[]) ?? [],
    purchaseRequests,
    sentOffers,
    purchaseHistory,
    latestVerification,
  };
}

type ProfileTab = 'listings' | 'purchases' | 'offers' | 'sales' | 'wishlist';
const VALID_TABS: ProfileTab[] = ['listings', 'purchases', 'offers', 'sales', 'wishlist'];

export default async function ProfilePage({ searchParams }: { searchParams: { tab?: string } }) {
  const data = await getOwnProfileData();
  if (!data) redirect('/');

  const initialTab: ProfileTab = VALID_TABS.includes(searchParams.tab as ProfileTab)
    ? (searchParams.tab as ProfileTab)
    : 'listings';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <OwnProfile {...data} initialTab={initialTab} />
    </div>
  );
}
