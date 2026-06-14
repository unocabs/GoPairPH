export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AdminDashboard } from './AdminDashboard';
import { getDashboardViewWindow, getListingViewSummaries } from '@/lib/listingViews';
import type { VerificationRequest, Profile, Shoe, Shop, WishlistItem, WishlistOffer, WishlistOfferReport } from '@/types';

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
  const [pendingRes, recentRes, verifiedRes, shopsRes, profilesRes, soldListingsRes, listingViews, leadReports, siteSettingsRes] = await Promise.all([
    supabase
      .from('verification_requests')
      .select('*, profiles:profiles!user_id(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('verification_requests')
      .select('*, profiles:profiles!user_id(*)')
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('*')
      .eq('is_verified', true)
      .order('display_name'),
    supabase
      .from('shops')
      .select('*, owner:profiles!shops_owner_profile_id_fkey(id, display_name, location_city, location_province, location_region)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, user_id, display_name, location_city, location_province, location_region, avatar_url, fb_username, is_verified, is_admin, created_at, updated_at')
      .order('display_name'),
    service
      .from('shoes')
      .select('id, slug, seller_id, brand, model, size_eu, size_us, size_cm, us_size_type, color, condition, mileage_km, listing_type, price_php, is_negotiable, description, status, created_at, updated_at, profiles!shoes_seller_id_fkey(id, display_name, location_city, location_province, location_region, avatar_url, fb_username, is_verified)')
      .in('status', ['sold', 'reserved', 'donated'])
      .order('updated_at', { ascending: false })
      .limit(10),
    getListingViewSummaries({ ...viewWindow, limit: 100 }),
    loadOpenLeadReports(),
    service
      .from('site_settings')
      .select('show_active_visitors_publicly, show_homepage_activity_publicly')
      .eq('id', true)
      .maybeSingle(),
  ]);

  return {
    pending: (pendingRes.data as VerificationRequest[]) ?? [],
    recent: (recentRes.data as VerificationRequest[]) ?? [],
    verified: (verifiedRes.data as Profile[]) ?? [],
    shops: (shopsRes.data as (Shop & { owner?: Pick<Profile, 'id' | 'display_name' | 'location_city' | 'location_province' | 'location_region'> | null })[]) ?? [],
    profiles: (profilesRes.data as Profile[]) ?? [],
    soldListings: ((soldListingsRes.data ?? []) as unknown as Shoe[]),
    listingViews,
    leadReports,
    siteSettings: {
      showActiveVisitorsPublicly: Boolean(siteSettingsRes.data?.show_active_visitors_publicly),
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
