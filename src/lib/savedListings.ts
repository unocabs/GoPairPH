import { createClient, createPublicClient, createServiceClient } from '@/lib/supabase/server';
import type { Shoe } from '@/types';

export async function getSavedListingIds(profileId: string | null | undefined, listingIds: string[]): Promise<Set<string>> {
  if (!profileId || listingIds.length === 0) return new Set();

  const supabase = createClient();
  const { data } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', profileId)
    .in('listing_id', listingIds);

  return new Set((data ?? []).map((row: { listing_id: string }) => row.listing_id));
}

export async function isListingSaved(profileId: string | null | undefined, listingId: string): Promise<boolean> {
  if (!profileId) return false;

  const supabase = createClient();
  const { data } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', profileId)
    .eq('listing_id', listingId)
    .maybeSingle();

  return !!data;
}

function getSavedCountClient() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceClient()
    : createPublicClient();
}

export async function getSavedListingCounts(listingIds: string[]): Promise<Record<string, number>> {
  const ids = Array.from(new Set(listingIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const supabase = getSavedCountClient();
  const { data, error } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .in('listing_id', ids);

  if (error) return {};

  return (data ?? []).reduce<Record<string, number>>((counts, row: { listing_id: string }) => {
    counts[row.listing_id] = (counts[row.listing_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getSavedListingCount(listingId: string): Promise<number> {
  const counts = await getSavedListingCounts([listingId]);
  return counts[listingId] ?? 0;
}

export async function getSavedListings(profileId: string): Promise<Shoe[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('saved_listings')
    .select('listing:shoes!saved_listings_listing_id_fkey(*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*))')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  return (data ?? [])
    .map((row) => row.listing as unknown as Shoe | null)
    .filter((listing): listing is Shoe => !!listing);
}
