import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { makeSavedSearchEmailMatch, renderSavedSearchAlertEmail } from '@/lib/email/savedSearchAlerts';
import { getAbsoluteListingUrl } from '@/lib/utils';
import type { Condition, UsSizeType } from '@/types';

export const runtime = 'nodejs';

type SavedSearchRow = {
  id: string;
  user_id: string;
  keyword: string;
  brand: string | null;
  size_eu: number | null;
  size_us: number | null;
  size_cm: number | null;
  us_size_type: UsSizeType;
  condition: Condition | null;
  max_price_php: number | null;
  email_enabled: boolean;
  created_at: string;
  profiles?: { user_id: string; display_name: string | null } | null;
};

type ListingRow = {
  id: string;
  slug: string | null;
  seller_id: string;
  brand: string;
  model: string;
  color: string | null;
  condition: Condition;
  listing_type: 'for_sale' | 'donate';
  price_php: number | null;
  description: string | null;
  size_eu: number | null;
  size_us: number | null;
  size_cm: number | null;
  us_size_type: UsSizeType;
  created_at: string;
  profiles?: { display_name: string | null; location: string | null } | null;
  shops?: { name: string | null; location: string | null } | null;
  shoe_images?: Array<{ id: string }>;
  shoe_variants?: Array<{ size_eu: number | null; size_us: number | null; size_cm: number | null; us_size_type: UsSizeType }>;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function getManilaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasKeywordMatch(search: SavedSearchRow, listing: ListingRow): boolean {
  const tokens = normalize(search.keyword).split(' ').filter(Boolean);
  if (tokens.length === 0) return false;
  const haystack = normalize([
    listing.brand,
    listing.model,
    listing.color,
    listing.description,
    listing.profiles?.display_name,
    listing.profiles?.location,
    listing.shops?.name,
    listing.shops?.location,
  ].filter(Boolean).join(' '));
  return tokens.every(token => haystack.includes(token));
}

function sizeMatches(search: SavedSearchRow, listing: ListingRow): boolean {
  const wantsSize = search.size_eu != null || search.size_us != null || search.size_cm != null;
  if (!wantsSize) return true;

  const same = (a: number | null, b: number | null) => a == null || b == null ? false : Math.abs(Number(a) - Number(b)) < 0.01;
  const rowMatches = (row: { size_eu: number | null; size_us: number | null; size_cm: number | null; us_size_type?: UsSizeType | null }) => {
    const usTypeMatches =
      search.size_us == null ||
      row.us_size_type === search.us_size_type;

    return usTypeMatches &&
      (search.size_eu == null || same(search.size_eu, row.size_eu)) &&
      (search.size_us == null || same(search.size_us, row.size_us)) &&
      (search.size_cm == null || same(search.size_cm, row.size_cm));
  };

  if (rowMatches(listing)) return true;
  return (listing.shoe_variants ?? []).some(rowMatches);
}

function matchesSearch(search: SavedSearchRow, listing: ListingRow): boolean {
  if (listing.seller_id === search.user_id) return false;
  if (new Date(listing.created_at).getTime() < new Date(search.created_at).getTime()) return false;
  if (!listing.shoe_images || listing.shoe_images.length === 0) return false;
  if (search.brand && normalize(search.brand) !== normalize(listing.brand)) return false;
  if (search.condition && search.condition !== listing.condition) return false;
  if (search.max_price_php != null && listing.price_php != null && Number(listing.price_php) > Number(search.max_price_php)) return false;
  if (!sizeMatches(search, listing)) return false;
  return hasKeywordMatch(search, listing);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const today = getManilaDateString();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const [{ data: searchesData, error: searchesError }, { data: listingsData, error: listingsError }] = await Promise.all([
    service
      .from('saved_searches')
      .select('*, profiles(user_id, display_name)')
      .eq('email_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1000),
    service
      .from('shoes')
      .select('id, slug, seller_id, brand, model, color, condition, listing_type, price_php, description, size_eu, size_us, size_cm, us_size_type, created_at, profiles!shoes_seller_id_fkey(display_name, location), shops(name, location), shoe_images!inner(id), shoe_variants(size_eu, size_us, size_cm, us_size_type)')
      .eq('status', 'active')
      .is('quality_flagged_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (searchesError || listingsError) {
    console.error('[saved-search-alerts] query failed', searchesError ?? listingsError);
    return NextResponse.json({ error: 'Could not load saved searches or listings' }, { status: 500 });
  }

  const searches = (searchesData as SavedSearchRow[] | null) ?? [];
  const listings = (listingsData as unknown as ListingRow[] | null) ?? [];
  if (searches.length === 0 || listings.length === 0) {
    return NextResponse.json({ sent: 0, matched: 0, skipped: true });
  }

  const searchIds = searches.map(search => search.id);
  const [{ data: existingData }, { data: todayData }] = await Promise.all([
    service
      .from('saved_search_notifications')
      .select('saved_search_id, listing_id')
      .in('saved_search_id', searchIds),
    service
      .from('saved_search_notifications')
      .select('user_id')
      .eq('sent_date', today),
  ]);

  const existingPairs = new Set(
    ((existingData as Array<{ saved_search_id: string; listing_id: string }> | null) ?? [])
      .map(row => `${row.saved_search_id}:${row.listing_id}`)
  );
  const usersAlreadySentToday = new Set(
    ((todayData as Array<{ user_id: string }> | null) ?? []).map(row => row.user_id)
  );

  const searchesByUser = new Map<string, SavedSearchRow[]>();
  for (const search of searches) {
    if (usersAlreadySentToday.has(search.user_id)) continue;
    const current = searchesByUser.get(search.user_id) ?? [];
    current.push(search);
    searchesByUser.set(search.user_id, current);
  }

  let sent = 0;
  let matched = 0;

  for (const [profileId, userSearches] of Array.from(searchesByUser.entries())) {
    const matches: Array<{ search: SavedSearchRow; listing: ListingRow }> = [];

    for (const search of userSearches) {
      for (const listing of listings) {
        const key = `${search.id}:${listing.id}`;
        if (existingPairs.has(key)) continue;
        if (matchesSearch(search, listing)) {
          matches.push({ search, listing });
        }
      }
    }

    const uniqueByListing = new Map<string, { search: SavedSearchRow; listing: ListingRow }>();
    for (const match of matches) {
      if (!uniqueByListing.has(match.listing.id)) uniqueByListing.set(match.listing.id, match);
    }
    const digestMatches = Array.from(uniqueByListing.values()).slice(0, 6);
    if (digestMatches.length === 0) continue;

    const profile = userSearches[0]?.profiles;
    if (!profile?.user_id) continue;
    const { data: authData } = await service.auth.admin.getUserById(profile.user_id);
    const email = authData.user?.email;
    if (!email) continue;

    const html = renderSavedSearchAlertEmail({
      displayName: profile.display_name ?? 'runner',
      browseUrl: `${siteUrl}/browse`,
      manageUrl: `${siteUrl}/profile?tab=searches`,
      matches: digestMatches.map(({ search, listing }) => makeSavedSearchEmailMatch({
        searchKeyword: search.keyword,
        brand: listing.brand,
        model: listing.model,
        listingUrl: getAbsoluteListingUrl(siteUrl, listing),
        pricePhp: listing.price_php,
        sizeEu: listing.size_eu,
        sizeUs: listing.size_us,
        sizeCm: listing.size_cm,
        usSizeType: listing.us_size_type,
        condition: listing.condition,
      })),
    });

    await sendEmail({
      to: email,
      subject: "Fresh pairs matched what you're looking for - Go Pair PH",
      html,
    });

    const notificationRows = digestMatches.map(({ search, listing }) => ({
      saved_search_id: search.id,
      user_id: profileId,
      listing_id: listing.id,
      sent_date: today,
    }));
    const { error: notifyError } = await service
      .from('saved_search_notifications')
      .upsert(notificationRows, {
        onConflict: 'saved_search_id,listing_id',
        ignoreDuplicates: true,
      });
    if (notifyError) {
      console.error('[saved-search-alerts] notification insert failed', notifyError);
    }

    sent += 1;
    matched += digestMatches.length;
  }

  return NextResponse.json({ sent, matched, date: today });
}
