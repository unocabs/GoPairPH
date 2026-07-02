import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Count of completed marketplace sales and completed Go Pair PH buybacks.
 * Used as a buyer-facing trust signal ("N successful deals") on profile pages.
 *
 * Note: a single listing can in theory have multiple "completed" requests over
 * its lifetime (e.g. a re-listed pair). We count each completed transaction.
 */
export async function getCompletedSalesCount(profileId: string): Promise<number> {
  const supabase = createClient();

  const { data: shoes } = await supabase
    .from('shoes')
    .select('id')
    .eq('seller_id', profileId);

  const ids = (shoes ?? []).map((s: { id: string }) => s.id);
  if (ids.length === 0) return 0;

  const { count } = await supabase
    .from('purchase_requests')
    .select('id', { count: 'exact', head: true })
    .in('listing_id', ids)
    .eq('status', 'completed');

  const { count: completedBuybacks } = await createServiceClient()
    .from('buyback_offers')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', profileId)
    .eq('status', 'completed');

  return (count ?? 0) + (completedBuybacks ?? 0);
}
