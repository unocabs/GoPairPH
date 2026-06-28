export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OwnProfile } from './OwnProfile';
import { PageShell } from '@/components/layout/PageShell';
import { getViewSummariesForListings } from '@/lib/listingViews';
import { getCompletedSalesCount } from '@/lib/sales';
import { getSavedListingCounts, getSavedListings } from '@/lib/savedListings';
import type { GpCoinTransaction, GpCoinWallet, Profile, Shoe, WishlistItem, PurchaseRequest, VerificationRequest, SavedSearch } from '@/types';

async function getOwnProfileData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if (!profile) return null;

  await supabase.rpc('gp_coin_expire_available', { p_profile_id: profile.id });

  const [shoesRes, wishlistRes, savedSearchesRes, savedListings, coinWalletRes, coinTransactionsRes, expiringCoinBucketsRes] = await Promise.all([
    supabase.from('shoes').select('*, shoe_images(*), shops(*), shoe_variants(*)').eq('seller_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('wishlist_items').select('*, wishlist_images(*), wishlist_offers(count)').eq('user_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('saved_searches').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
    getSavedListings(profile.id),
    supabase.from('gp_coin_wallets').select('*').eq('profile_id', profile.id).maybeSingle(),
    supabase.from('gp_coin_transactions').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(20),
    supabase
      .from('gp_coin_award_buckets')
      .select('remaining_amount, expires_at')
      .eq('profile_id', profile.id)
      .gt('remaining_amount', 0)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(1),
  ]);

  const allShoes = (shoesRes.data as Shoe[]) ?? [];
  const shoeIds = allShoes.map(s => s.id);
  // Exclude completed items from My Listings — they live in Purchase History
  const shoes = allShoes.filter(s => s.status !== 'sold' && s.status !== 'donated');

  // Owner-only view counts. Plain object so it serializes cleanly into the
  // client OwnProfile component.
  const viewMap = await getViewSummariesForListings(shoes.map(s => s.id));
  const viewCounts: Record<string, { total: number; last7d: number }> = {};
  viewMap.forEach((value, key) => { viewCounts[key] = value; });

  // Buyer-facing trust signal on the seller's own profile header.
  const completedSales = await getCompletedSalesCount(profile.id);

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
  const purchaseSelect = '*, profiles(*), shoe_variants(*), listing:shoes!listing_id(*, shoe_images(*), profiles!shoes_seller_id_fkey(*))';
  const [boughtRes, soldRes, sentOffersRes] = await Promise.all([
    supabase.from('purchase_requests').select(purchaseSelect).eq('buyer_id', profile.id).eq('status', 'completed'),
    shoeIds.length > 0
      ? supabase.from('purchase_requests').select(purchaseSelect).in('listing_id', shoeIds).eq('status', 'completed')
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from('purchase_requests')
      .select(purchaseSelect)
      .eq('buyer_id', profile.id)
      .in('status', ['pending', 'accepted', 'declined'])
      .order('created_at', { ascending: false }),
  ]);
  const purchaseHistory = [
    ...((boughtRes.data as PurchaseRequest[]) ?? []),
    ...((soldRes.data as PurchaseRequest[]) ?? []),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const completedOwnListingIds = new Set(
    ((soldRes.data as PurchaseRequest[]) ?? []).map(request => request.listing_id)
  );
  const manualSaleListings = allShoes
    .filter(shoe => (shoe.status === 'sold' || shoe.status === 'donated') && !completedOwnListingIds.has(shoe.id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const sentOffers = (sentOffersRes.data as PurchaseRequest[]) ?? [];
  const savedListingCounts = await getSavedListingCounts(
    Array.from(new Set([...shoes, ...savedListings].map(shoe => shoe.id)))
  );

  const { data: shareMetricRows } = shoeIds.length > 0
    ? await supabase
        .from('listing_share_metrics')
        .select('caption_copy_count, image_download_count')
        .in('listing_id', shoeIds)
    : { data: [] };
  const shareMetrics = (shareMetricRows ?? []).reduce(
    (totals, row) => ({
      captionCopies: totals.captionCopies + Number(row.caption_copy_count ?? 0),
      imageDownloads: totals.imageDownloads + Number(row.image_download_count ?? 0),
    }),
    { captionCopies: 0, imageDownloads: 0 },
  );

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
    savedSearches: (savedSearchesRes.data as SavedSearch[]) ?? [],
    savedListings,
    purchaseRequests,
    sentOffers,
    purchaseHistory,
    manualSaleListings,
    latestVerification,
    viewCounts,
    savedListingCounts,
    shareMetrics,
    completedSales,
    gpCoinWallet: (coinWalletRes.data as GpCoinWallet | null) ?? null,
    gpCoinTransactions: (coinTransactionsRes.data as GpCoinTransaction[]) ?? [],
    nextGpCoinsExpiring: ((expiringCoinBucketsRes.data?.[0] as { remaining_amount: number; expires_at: string } | undefined) ?? null),
  };
}

type ProfileTab = 'listings' | 'purchases' | 'offers' | 'sales' | 'wishlist' | 'saved' | 'searches';
const VALID_TABS: ProfileTab[] = ['listings', 'purchases', 'offers', 'sales', 'wishlist', 'saved', 'searches'];

export default async function ProfilePage({ searchParams }: { searchParams: { tab?: string; from?: string; listing?: string } }) {
  const data = await getOwnProfileData();
  if (!data) redirect('/');

  const initialTab: ProfileTab = VALID_TABS.includes(searchParams.tab as ProfileTab)
    ? (searchParams.tab as ProfileTab)
    : 'listings';
  const postListingId = searchParams.from === 'listing'
    && searchParams.listing
    && data.shoes.some(shoe => shoe.id === searchParams.listing)
    ? searchParams.listing
    : undefined;

  return (
    <PageShell>
      <OwnProfile {...data} initialTab={initialTab} postListingId={postListingId} />
    </PageShell>
  );
}
