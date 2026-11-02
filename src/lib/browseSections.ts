import type { PersonalizationBadges } from './personalization';

type BrowseListing = { id: string; running_relevance_flagged?: boolean };
type BrowseSection<T> = { kind: 'all' | 'recommended' | 'discover'; shoes: T[] };

export const RECOMMENDATION_BATCH_SIZE = 4;

export function getBrowseRecommendations<T extends BrowseListing>(shoes: T[], badges: Record<string, PersonalizationBadges>): T[] {
  return shoes.filter(shoe => !shoe.running_relevance_flagged && (badges[shoe.id]?.matchesSize || badges[shoe.id]?.nearYou));
}

/** Page each section without duplicating shoes or emptying discovery to expand recommendations. */
export function buildBrowseSections<T extends BrowseListing>(
  shoes: T[],
  recommendationsEnabled: boolean,
  badges: Record<string, PersonalizationBadges>,
  { recommendationLimit = RECOMMENDATION_BATCH_SIZE, visibleLimit = shoes.length }: { recommendationLimit?: number; visibleLimit?: number } = {},
): BrowseSection<T>[] {
  if (shoes.length === 0) return [];
  const recommended = recommendationsEnabled
    ? getBrowseRecommendations(shoes, badges).slice(0, recommendationLimit)
    : [];
  if (recommended.length === 0) return [{ kind: 'all', shoes: shoes.slice(0, visibleLimit) }];

  const recommendedIds = new Set(recommended.map(shoe => shoe.id));
  const discover = shoes.filter(shoe => !recommendedIds.has(shoe.id)).slice(0, Math.max(0, visibleLimit - recommended.length));
  const sections: BrowseSection<T>[] = [{ kind: 'recommended', shoes: recommended }];
  if (discover.length > 0) sections.push({ kind: 'discover', shoes: discover });
  return sections;
}
