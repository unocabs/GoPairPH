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

  const [{ count: activeCount }, { data: sponsored }] = await Promise.all([
    supabase
      .from('shoes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('shoes')
      .select('sponsored_until')
      .eq('status', 'active')
      .gt('sponsored_until', new Date().toISOString())
      .order('sponsored_until', { ascending: true }),
  ]);

  const total = activeCount ?? 0;
  const cap = Math.max(1, Math.floor(total * 0.15));
  const sponsoredRows = sponsored ?? [];
  const used = sponsoredRows.length;
  const slotsAvailable = used < cap;
  const nextSlotOpensAt = slotsAvailable ? null : sponsoredRows[0]?.sponsored_until ?? null;

  return { cap, activeCount: used, slotsAvailable, nextSlotOpensAt };
}
