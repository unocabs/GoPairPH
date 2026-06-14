import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { makeSavedSearchEmailMatch, renderSavedSearchAlertEmail } from '@/lib/email/savedSearchAlerts';
import { formatProfileLocation, formatSize, getAbsoluteListingUrl } from '@/lib/utils';
import { hasPreferredSize, profileSizeMatchesRow, type PersonalizationProfile } from '@/lib/personalization';
import type { Condition, Profile, UsSizeType } from '@/types';

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
  profiles?: { display_name: string | null; location_city?: string | null; location_province?: string | null; location_region?: string | null } | null;
  shops?: { name: string | null; location: string | null } | null;
  shoe_images?: Array<{ id: string }>;
  shoe_variants?: Array<{ size_eu: number | null; size_us: number | null; size_cm: number | null; us_size_type: UsSizeType }>;
};

type DigestMatch =
  | { source: 'saved_search'; search: SavedSearchRow; listing: ListingRow }
  | { source: 'profile_match'; profile: Profile; listing: ListingRow };

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
    listing.profiles?.location_city,
    listing.profiles?.location_province,
    listing.profiles?.location_region,
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

function profileMatchEnabled(profile: Profile): boolean {
  return profile.profile_match_email_enabled !== false && hasPreferredSize(profile);
}

function profileMatchesListing(profile: Profile, listing: ListingRow): boolean {
  if (listing.seller_id === profile.id) return false;
  if (!listing.shoe_images || listing.shoe_images.length === 0) return false;
  if (profileSizeMatchesRow(profile, listing)) return true;
  return (listing.shoe_variants ?? []).some(variant => profileSizeMatchesRow(profile, variant));
}

function normalizeLocationScore(profile: PersonalizationProfile, listing: ListingRow): number {
  const haystack = normalize([
    listing.profiles?.location_city,
    listing.profiles?.location_province,
    listing.profiles?.location_region,
    listing.shops?.location,
  ].filter(Boolean).join(' '));
  if (!haystack) return 0;
  if (profile.location_city && haystack.includes(normalize(profile.location_city))) return 3;
  if (profile.location_province && haystack.includes(normalize(profile.location_province))) return 2;
  if (profile.location_region && haystack.includes(normalize(profile.location_region))) return 1;
  return 0;
}

function getListingLocation(listing: ListingRow): string | null {
  return listing.shops?.location ?? (formatProfileLocation(listing.profiles) || null);
}

function getProfileBrowseUrl(siteUrl: string, profile: Profile | null | undefined): string {
  if (!profile || !hasPreferredSize(profile)) return `${siteUrl}/browse`;
  if (profile.preferred_size_eu != null) return `${siteUrl}/browse?size=${encodeURIComponent(String(profile.preferred_size_eu))}&size_unit=eu`;
  if (profile.preferred_size_us != null) {
    const params = new URLSearchParams({
      size: String(profile.preferred_size_us),
      size_unit: 'us',
      us_size_type: profile.preferred_us_size_type ?? 'mens',
    });
    return `${siteUrl}/browse?${params.toString()}`;
  }
  if (profile.preferred_size_cm != null) return `${siteUrl}/browse?size=${encodeURIComponent(String(profile.preferred_size_cm))}&size_unit=cm`;
  return `${siteUrl}/browse`;
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

  const [
    { data: searchesData, error: searchesError },
    { data: listingsData, error: listingsError },
    { data: profilesData, error: profilesError },
  ] = await Promise.all([
    service
      .from('saved_searches')
      .select('*, profiles(user_id, display_name)')
      .eq('email_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1000),
    service
      .from('shoes')
      .select('id, slug, seller_id, brand, model, color, condition, listing_type, price_php, description, size_eu, size_us, size_cm, us_size_type, created_at, profiles!shoes_seller_id_fkey(display_name, location_city, location_province, location_region), shops(name, location), shoe_images!inner(id), shoe_variants(size_eu, size_us, size_cm, us_size_type)')
      .eq('status', 'active')
      .is('quality_flagged_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
    service
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1500),
  ]);

  if (searchesError || listingsError || profilesError) {
    console.error('[saved-search-alerts] query failed', searchesError ?? listingsError ?? profilesError);
    return NextResponse.json({ error: 'Could not load saved searches or listings' }, { status: 500 });
  }

  const searches = (searchesData as SavedSearchRow[] | null) ?? [];
  const listings = (listingsData as unknown as ListingRow[] | null) ?? [];
  const profiles = ((profilesData as Profile[] | null) ?? []).filter(profileMatchEnabled);
  if (listings.length === 0 || (searches.length === 0 && profiles.length === 0)) {
    return NextResponse.json({ sent: 0, matched: 0, skipped: true });
  }

  const searchIds = searches.map(search => search.id);
  const [{ data: existingData }, { data: profileExistingData }, { data: savedTodayData }, { data: profileTodayData }] = await Promise.all([
    searchIds.length > 0
      ? service
        .from('saved_search_notifications')
        .select('saved_search_id, listing_id')
        .in('saved_search_id', searchIds)
      : Promise.resolve({ data: [] as Array<{ saved_search_id: string; listing_id: string }> }),
    service
      .from('profile_match_notifications')
      .select('user_id, listing_id'),
    service
      .from('saved_search_notifications')
      .select('user_id')
      .eq('sent_date', today),
    service
      .from('profile_match_notifications')
      .select('user_id')
      .eq('sent_date', today),
  ]);

  const existingPairs = new Set(
    ((existingData as Array<{ saved_search_id: string; listing_id: string }> | null) ?? [])
      .map(row => `${row.saved_search_id}:${row.listing_id}`)
  );
  const usersAlreadySentToday = new Set(
    [
      ...(((savedTodayData as Array<{ user_id: string }> | null) ?? []).map(row => row.user_id)),
      ...(((profileTodayData as Array<{ user_id: string }> | null) ?? []).map(row => row.user_id)),
    ]
  );
  const existingProfileMatches = new Set(
    ((profileExistingData as Array<{ user_id: string; listing_id: string }> | null) ?? [])
      .map(row => `${row.user_id}:${row.listing_id}`)
  );

  const searchesByUser = new Map<string, SavedSearchRow[]>();
  for (const search of searches) {
    if (usersAlreadySentToday.has(search.user_id)) continue;
    const current = searchesByUser.get(search.user_id) ?? [];
    current.push(search);
    searchesByUser.set(search.user_id, current);
  }

  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const candidateUserIds = new Set<string>([
    ...Array.from(searchesByUser.keys()),
    ...profiles.filter(profile => !usersAlreadySentToday.has(profile.id)).map(profile => profile.id),
  ]);

  let sent = 0;
  let matched = 0;

  for (const profileId of Array.from(candidateUserIds)) {
    const userSearches = searchesByUser.get(profileId) ?? [];
    const profileMatchProfile = profilesById.get(profileId) ?? null;
    const matches: DigestMatch[] = [];

    for (const search of userSearches) {
      for (const listing of listings) {
        const key = `${search.id}:${listing.id}`;
        if (existingPairs.has(key)) continue;
        if (matchesSearch(search, listing)) {
          matches.push({ source: 'saved_search', search, listing });
        }
      }
    }

    if (profileMatchProfile) {
      const profileMatches = listings
        .filter(listing => !existingProfileMatches.has(`${profileMatchProfile.id}:${listing.id}`))
        .filter(listing => profileMatchesListing(profileMatchProfile, listing))
        .sort((a, b) => {
          const locationDiff = normalizeLocationScore(profileMatchProfile, b) - normalizeLocationScore(profileMatchProfile, a);
          if (locationDiff !== 0) return locationDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 8);

      for (const listing of profileMatches) {
        matches.push({ source: 'profile_match', profile: profileMatchProfile, listing });
      }
    }

    const uniqueByListing = new Map<string, DigestMatch>();
    for (const match of matches) {
      if (!uniqueByListing.has(match.listing.id)) uniqueByListing.set(match.listing.id, match);
    }
    const digestMatches = Array.from(uniqueByListing.values()).slice(0, 6);
    if (digestMatches.length === 0) continue;

    const emailProfile = profileMatchProfile;
    const savedSearchProfile = userSearches[0]?.profiles;
    const authUserId = emailProfile?.user_id ?? savedSearchProfile?.user_id;
    if (!authUserId) continue;
    const { data: authData } = await service.auth.admin.getUserById(authUserId);
    const email = authData.user?.email;
    if (!email) continue;

    const html = renderSavedSearchAlertEmail({
      displayName: emailProfile?.display_name ?? savedSearchProfile?.display_name ?? 'runner',
      browseUrl: getProfileBrowseUrl(siteUrl, emailProfile),
      manageUrl: `${siteUrl}/profile?tab=searches`,
      matches: digestMatches.map((match) => makeSavedSearchEmailMatch({
        searchKeyword: match.source === 'saved_search'
          ? match.search.keyword
          : `Your size${formatSize(match.profile.preferred_size_eu, match.profile.preferred_size_us, match.profile.preferred_size_cm, match.profile.preferred_us_size_type) ? `: ${formatSize(match.profile.preferred_size_eu, match.profile.preferred_size_us, match.profile.preferred_size_cm, match.profile.preferred_us_size_type)}` : ''}`,
        brand: match.listing.brand,
        model: match.listing.model,
        listingUrl: getAbsoluteListingUrl(siteUrl, match.listing),
        pricePhp: match.listing.price_php,
        sizeEu: match.listing.size_eu,
        sizeUs: match.listing.size_us,
        sizeCm: match.listing.size_cm,
        usSizeType: match.listing.us_size_type,
        condition: match.listing.condition,
        location: getListingLocation(match.listing),
      })),
    });

    const hasOnlyProfileMatches = digestMatches.every(match => match.source === 'profile_match');

    await sendEmail({
      to: email,
      subject: hasOnlyProfileMatches
        ? 'New running shoes in your size - Go Pair PH'
        : "Fresh pairs matched what you're looking for - Go Pair PH",
      html,
    });

    const notificationRows = digestMatches
      .filter((match): match is Extract<DigestMatch, { source: 'saved_search' }> => match.source === 'saved_search')
      .map(({ search, listing }) => ({
        saved_search_id: search.id,
        user_id: profileId,
        listing_id: listing.id,
        sent_date: today,
      }));
    if (notificationRows.length > 0) {
      const { error: notifyError } = await service
        .from('saved_search_notifications')
        .upsert(notificationRows, {
          onConflict: 'saved_search_id,listing_id',
          ignoreDuplicates: true,
        });
      if (notifyError) {
        console.error('[saved-search-alerts] notification insert failed', notifyError);
      }
    }

    const profileNotificationRows = digestMatches
      .filter((match): match is Extract<DigestMatch, { source: 'profile_match' }> => match.source === 'profile_match')
      .map(({ profile, listing }) => ({
        user_id: profile.id,
        listing_id: listing.id,
        sent_date: today,
      }));
    if (profileNotificationRows.length > 0) {
      const { error: profileNotifyError } = await service
        .from('profile_match_notifications')
        .upsert(profileNotificationRows, {
          onConflict: 'user_id,listing_id',
          ignoreDuplicates: true,
        });
      if (profileNotifyError) {
        console.error('[saved-search-alerts] profile notification insert failed', profileNotifyError);
      }
    }

    sent += 1;
    matched += digestMatches.length;
  }

  return NextResponse.json({ sent, matched, date: today });
}
