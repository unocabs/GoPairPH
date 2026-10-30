import { createClient } from '@/lib/supabase/server';

export interface SponsoredSlotInfo {
  /** Hard cap on simultaneously-sponsored listings (15% of active, min 1). */
  cap: number;
  /** Currently active sponsored count. */
  activeCount: number;
  /** True if a new sponsored slot can be sold right now. */
  slotsAvailable: boolean;
  /**
   * If full, the timestamp when the *earliest* current sponsorship expires —
   * i.e. the next time a slot becomes available.
   */
  nextSlotOpensAt: string | null;
}

/**
 * Computes sponsored-slot availability across the marketplace.
 *
 * Cap rule: max(1, floor(active_listings * 0.15)).
 * - 1–13 active listings → 1 slot
 * - 14–20 → 2 slots
 * - 21–26 → 3 slots
 * - …and so on.
 */
export async function getSponsoredSlotInfo(): Promise<SponsoredSlotInfo> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_sponsored_payment_slot_info');
  if (error || !data) {
    // Fail closed if payment capacity cannot be checked.
    return { cap: 0, activeCount: 0, slotsAvailable: false, nextSlotOpensAt: null };
  }
  return data as SponsoredSlotInfo;
}
