export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AdminDashboard } from './AdminDashboard';
import { getDashboardViewWindow, getListingViewSummaries } from '@/lib/listingViews';
import { FEATURED_PAYMENT_PROOF_BUCKET } from '@/lib/featuredPromotions';
import { SPONSORED_PAYMENT_PROOF_BUCKET } from '@/lib/sponsoredPromotions';
import { buildBuybackRelistDescription } from '@/lib/buybackInventory';
import type { BuybackInventoryItem, BuybackOffer, FeaturedPromotionOrder, ListingReport, VerificationRequest, Profile, Shoe, Shop, SponsoredPromotionOrder, WishlistItem, WishlistOffer, WishlistOfferReport } from '@/types';

type PairRequestSummary = Pick<WishlistItem, 'id' | 'brand' | 'model'>;

async function loadOpenLeadReports(): Promise<WishlistOfferReport[]> {
  const service = createServiceClient();
  const { data: reports, error } = await service
    .from('wishlist_offer_reports')
    .select('id, offer_id, wishlist_id, reason, note, reporter_id, status, reviewed_by, reviewed_at, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('[admin] could not load Looking For lead reports:', error.message);
    return [];
  }

  const rows = (reports as WishlistOfferReport[]) ?? [];
  if (rows.length === 0) return [];

  const offerIds = Array.from(new Set(rows.map(report => report.offer_id)));
  const reporterIds = Array.from(new Set(rows.map(report => report.reporter_id).filter(Boolean) as string[]));

  const [{ data: offers }, { data: reporters }] = await Promise.all([
    service
      .from('wishlist_offers')
      .select('id, wishlist_id, url, price_php, note, offerer_id, shoe_id, created_at')
      .in('id', offerIds),
    reporterIds.length > 0
      ? service.from('profiles').select('id, display_name').in('id', reporterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const offerRows = (offers as WishlistOffer[]) ?? [];
  const wishlistIds = Array.from(new Set(offerRows.map(offer => offer.wishlist_id)));
  const { data: items } = wishlistIds.length > 0
    ? await service.from('wishlist_items').select('id, brand, model').in('id', wishlistIds)
    : { data: [] };

  const offerById = new Map(offerRows.map(offer => [offer.id, offer]));
  const itemById = new Map(((items as PairRequestSummary[]) ?? []).map(item => [item.id, item]));
  const reporterById = new Map(((reporters as Pick<Profile, 'id' | 'display_name'>[]) ?? []).map(reporter => [reporter.id, reporter]));

  return rows.map(report => {
    const offer = offerById.get(report.offer_id) ?? null;
    return {
      ...report,
      offer,
      item: offer ? itemById.get(offer.wishlist_id) ?? null : null,
      reporter: report.reporter_id ? reporterById.get(report.reporter_id) ?? null : null,
    };
  });
}

async function loadOpenListingReports(): Promise<ListingReport[]> {
  const service = createServiceClient();
  const { data: reports, error } = await service
    .from('listing_reports')
    .select('id, listing_id, reason, note, reporter_id, status, reviewed_by, reviewed_at, created_at, listing:shoes!listing_reports_listing_id_fkey(id, slug, brand, model, status, price_php, seller_id)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('[admin] could not load listing reports:', error.message);
    return [];
  }

  const rows = ((reports as unknown as ListingReport[]) ?? []);
  const reporterIds = Array.from(new Set(rows.map(report => report.reporter_id).filter(Boolean) as string[]));
  if (reporterIds.length === 0) return rows;

  const { data: reporters } = await service
    .from('profiles')
    .select('id, display_name')
    .in('id', reporterIds);

  const reporterById = new Map(((reporters as Pick<Profile, 'id' | 'display_name'>[]) ?? []).map(reporter => [reporter.id, reporter]));
  return rows.map(report => ({
    ...report,
    reporter: report.reporter_id ? reporterById.get(report.reporter_id) ?? null : null,
  }));
}

async function loadBuybackOffers(): Promise<BuybackOffer[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('buyback_offers')
    .select('*, listing:shoes!buyback_offers_listing_id_fkey(*, shoe_images(*)), seller:profiles!buyback_offers_seller_id_fkey(*), proofs:buyback_offer_proofs(*), events:buyback_offer_events(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.warn('[admin] could not load buyback offers:', error.message);
    return [];
  }
  const offers = (data ?? []) as unknown as BuybackOffer[];
  const listingIds = Array.from(new Set(offers.map(offer => offer.listing_id)));
  const pendingCounts = new Map<string, number>();
  if (listingIds.length > 0) {
    const { data: requests } = await service.from('purchase_requests').select('listing_id').in('listing_id', listingIds).eq('status', 'pending');
    for (const request of requests ?? []) pendingCounts.set(request.listing_id, (pendingCounts.get(request.listing_id) ?? 0) + 1);
  }
  return Promise.all(offers.map(async offer => ({
    ...offer,
    pending_buyer_offer_count: pendingCounts.get(offer.listing_id) ?? 0,
    proofs: await Promise.all((offer.proofs ?? []).map(async proof => {
      const { data: signed } = await service.storage.from('buyback-proofs').createSignedUrl(proof.storage_path, 60 * 60);
      return { ...proof, signed_url: signed?.signedUrl ?? null };
    })),
    events: [...(offer.events ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  })));
}

async function loadBuybackInventory(): Promise<BuybackInventoryItem[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('buyback_inventory_items')
    .select('*, source_listing:shoes!buyback_inventory_items_source_listing_id_fkey(*, shoe_images(*)), resale_listing:shoes!buyback_inventory_items_resale_listing_id_fkey(*, shoe_images(*)), assigned_shop:shops!buyback_inventory_items_assigned_shop_id_fkey(*), offer:buyback_offers!buyback_inventory_items_offer_id_fkey(*), photos:buyback_inventory_photos(*), events:buyback_inventory_events(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.warn('[admin] could not load buyback inventory:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as BuybackInventoryItem[]).map(item => ({
    ...item,
    relist_snapshot: {
      ...item.relist_snapshot,
      description: typeof item.relist_snapshot.description === 'string' && item.relist_snapshot.description.trim()
        ? item.relist_snapshot.description
        : buildBuybackRelistDescription(item.relist_snapshot),
    },
  }));
}

async function loadAdminData() {
  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) return null;

  const viewWindow = getDashboardViewWindow();
  await service.rpc('reconcile_featured_promotions');
  await service.rpc('reconcile_sponsored_promotions');

  const [pendingRes, verifiedRes, approvedVerificationRes, shopsRes, receivingShopsRes, profilesRes, soldListingsRes, promotionsRes, sponsoredPromotionsRes, listingViews, leadReports, listingReports, buybackOffers, buybackInventory, siteSettingsRes] = await Promise.all([
    supabase
      .from('verification_requests')
      .select('*, profiles:profiles!user_id(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .eq('is_verified', true)
      .order('display_name'),
    supabase
      .from('verification_requests')
      .select('id, user_id, proof, status, admin_notes, reviewed_by, reviewed_at, created_at')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(500),
    supabase
      .from('shops')
      .select('*, owner:profiles!shops_owner_profile_id_fkey(id, display_name, location_city, location_province, location_region)')
      .order('created_at', { ascending: false }),
    service.from('buyback_receiving_shops').select('shop_id, enabled'),
    supabase
      .from('profiles')
      .select('id, user_id, display_name, location_city, location_province, location_region, avatar_url, fb_username, is_verified, is_admin, created_at, updated_at')
      .order('display_name'),
    service
      .from('shoes')
      .select('id, slug, seller_id, brand, model, size_eu, size_us, size_cm, us_size_type, color, condition, mileage_km, listing_type, price_php, is_negotiable, description, status, closed_sale_channel, created_at, updated_at, profiles!shoes_seller_id_fkey(id, display_name, location_city, location_province, location_region, avatar_url, fb_username, is_verified)')
      .in('status', ['sold', 'reserved', 'donated'])
      .order('updated_at', { ascending: false })
      .limit(10),
    service
      .from('featured_promotion_orders')
      .select('*, listing:shoes!featured_promotion_orders_listing_id_fkey(id, slug, brand, model, status, price_php, featured_until), seller:profiles!featured_promotion_orders_seller_id_fkey(id, display_name, user_id, is_verified)')
      .order('created_at', { ascending: false })
      .limit(100),
    service
      .from('sponsored_promotion_orders')
      .select('*, listing:shoes!sponsored_promotion_orders_listing_id_fkey(id, slug, brand, model, status, price_php, sponsored_until), seller:profiles!sponsored_promotion_orders_seller_id_fkey(id, display_name, user_id, is_verified)')
      .order('created_at', { ascending: false })
      .limit(100),
    getListingViewSummaries({ ...viewWindow, limit: 100 }),
    loadOpenLeadReports(),
    loadOpenListingReports(),
    loadBuybackOffers(),
    loadBuybackInventory(),
    service
      .from('site_settings')
      .select('show_homepage_activity_publicly')
      .eq('id', true)
      .maybeSingle(),
  ]);

  const promotions = ((promotionsRes.data ?? []) as unknown as FeaturedPromotionOrder[]);
  const promotionsWithProofs = await Promise.all(promotions.map(async order => {
    if (!order.proof_storage_path) return order;
    const { data } = await service.storage
      .from(FEATURED_PAYMENT_PROOF_BUCKET)
      .createSignedUrl(order.proof_storage_path, 60 * 60);
    return { ...order, proof_signed_url: data?.signedUrl ?? null };
  }));
  const sponsoredPromotions = ((sponsoredPromotionsRes.data ?? []) as unknown as SponsoredPromotionOrder[]);
  const sponsoredPromotionsWithProofs = await Promise.all(sponsoredPromotions.map(async order => {
    if (!order.proof_storage_path) return order;
    const { data } = await service.storage
      .from(SPONSORED_PAYMENT_PROOF_BUCKET)
      .createSignedUrl(order.proof_storage_path, 60 * 60);
    return { ...order, proof_signed_url: data?.signedUrl ?? null };
  }));

  const enabledReceivingShopIds = new Set((receivingShopsRes.data ?? []).filter(row => row.enabled).map(row => row.shop_id));

  return {
    pending: (pendingRes.data as VerificationRequest[]) ?? [],
    verified: (verifiedRes.data as Profile[]) ?? [],
    verifiedProofs: (approvedVerificationRes.data as VerificationRequest[]) ?? [],
    shops: (((shopsRes.data as (Shop & { owner?: Pick<Profile, 'id' | 'display_name' | 'location_city' | 'location_province' | 'location_region'> | null })[]) ?? []).map(shop => ({
      ...shop,
      buyback_receiving_enabled: enabledReceivingShopIds.has(shop.id),
    }))),
    profiles: (profilesRes.data as Profile[]) ?? [],
    soldListings: ((soldListingsRes.data ?? []) as unknown as Shoe[]),
    promotions: promotionsWithProofs,
    sponsoredPromotions: sponsoredPromotionsWithProofs,
    listingViews,
    leadReports,
    listingReports,
    buybackOffers,
    buybackInventory,
    siteSettings: {
      showHomepageActivityPublicly: Boolean(siteSettingsRes.data?.show_homepage_activity_publicly),
    },
    viewWindow,
  };
}

export default async function AdminPage() {
  const data = await loadAdminData();
  if (!data) redirect('/');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Review verification requests, manage verified users, and maintain shops.</p>
      </header>
      <AdminDashboard {...data} />
    </div>
  );
}
