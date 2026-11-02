import type { Shoe } from '../types';

export const HOMEPAGE_TOP_PICK_LIMIT = 4;
const ROTATION_INTERVAL_MS = 60 * 60 * 1000;

export type HomepageTopPickCandidate = Pick<Shoe,
  'id' | 'status' | 'has_stock' | 'listed_in_main_feed' | 'quality_flagged_at' | 'sponsored_until'
> & { shoe_images?: Array<{ id: string }>; running_relevance_flagged?: boolean };

export function isHomepageTopPick(shoe: HomepageTopPickCandidate, now = Date.now()): boolean {
  return shoe.status === 'active'
    && shoe.has_stock
    && shoe.listed_in_main_feed
    && !shoe.quality_flagged_at
    && !shoe.running_relevance_flagged
    && (shoe.shoe_images?.length ?? 0) > 0
    && shoe.sponsored_until != null
    && Date.parse(shoe.sponsored_until) > now;
}

export function selectHomepageTopPicks<T extends HomepageTopPickCandidate>(
  shoes: T[],
  featuredId: string | null,
  now = Date.now(),
): T[] {
  const seen = new Set<string>();
  const eligible = shoes.filter(shoe => {
    if (shoe.id === featuredId || seen.has(shoe.id) || !isHomepageTopPick(shoe, now)) return false;
    seen.add(shoe.id);
    return true;
  }).sort((a, b) => a.id.localeCompare(b.id));

  if (eligible.length <= HOMEPAGE_TOP_PICK_LIMIT) return eligible;

  // Advance a full row each hour. Stable IDs keep rotation independent of query
  // order, and every eligible listing receives a turn without client-side JS.
  const offset = (Math.floor(now / ROTATION_INTERVAL_MS) * HOMEPAGE_TOP_PICK_LIMIT) % eligible.length;
  return Array.from({ length: HOMEPAGE_TOP_PICK_LIMIT }, (_, index) => eligible[(offset + index) % eligible.length]);
}
