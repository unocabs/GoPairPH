import { createServiceClient } from '@/lib/supabase/server';

// Counts pending purchase_requests per listing. Uses the service role client so
// the count is visible to all viewers regardless of RLS (count is non-sensitive).
export async function getOfferCounts(shoeIds: string[]): Promise<Record<string, number>> {
  if (shoeIds.length === 0) return {};
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('purchase_requests')
    .select('listing_id')
    .in('listing_id', shoeIds)
    .eq('status', 'pending');
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { listing_id: string }[]) {
    counts[row.listing_id] = (counts[row.listing_id] ?? 0) + 1;
  }
  return counts;
}

export async function getOfferCount(shoeId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from('purchase_requests')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', shoeId)
    .eq('status', 'pending');
  return count ?? 0;
}
