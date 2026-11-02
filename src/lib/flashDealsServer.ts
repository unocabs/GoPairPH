import 'server-only';
import { createPublicClient } from '@/lib/supabase/server';
import { isFlashDealLive } from '@/lib/flashDeals';
import type { Shoe } from '@/types';

async function getPool(): Promise<Shoe[]> {
  const { data, error } = await createPublicClient().from('shoes')
    .select('*,profiles!shoes_seller_id_fkey(id,display_name,is_verified,location_city,location_province,location_region),shoe_images(*),shops(id,slug,status,location),shoe_variants(*)')
    .eq('status', 'active').eq('has_stock', true).eq('listed_in_main_feed', true)
    .is('quality_flagged_at', null).eq('running_relevance_flagged', false)
    .gt('flash_deal_ends_at', new Date().toISOString()).order('id').limit(12);
  // During rollout an unapplied migration must not break the existing homepage.
  if (error) { console.error('[flash-deals] unavailable', error.code); return []; }
  return (data ?? []) as unknown as Shoe[];
}

export async function getFlashDeals(): Promise<Shoe[]> {
  const now = Date.now();
  const shoes = (await getPool()).filter(shoe => isFlashDealLive(shoe, now)
    && (shoe.shoe_images?.length ?? 0) > 0 && (!shoe.shop_id || shoe.shops?.status === 'active'));
  if (!shoes.length) return [];
  // A stable hourly rotation, with all live deals available on View all.
  const offset = Math.floor(now / 3_600_000) % shoes.length;
  return [...shoes.slice(offset), ...shoes.slice(0, offset)];
}
