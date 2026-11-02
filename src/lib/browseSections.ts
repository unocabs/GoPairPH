import type { PersonalizationBadges } from './personalization';

type BrowseListing = { id: string; running_relevance_flagged?: boolean };
type BrowseSection<T> = { kind: 'all' | 'recommended' | 'discover'; shoes: T[] };

/** Keep recommendations to one desktop row; all remaining shoes go in discovery. */
export function buildBrowseSections<T extends BrowseListing>(
  visibleShoes: T[],
  recommendationsEnabled: boolean,
  badges: Record<string, PersonalizationBadges>,
): BrowseSection<T>[] {
  if (visibleShoes.length === 0) return [];
  const recommended = recommendationsEnabled
    ? visibleShoes.filter(shoe => !shoe.running_relevance_flagged && (badges[shoe.id]?.matchesSize || badges[shoe.id]?.nearYou)).slice(0, 4)
    : [];
  if (recommended.length === 0) return [{ kind: 'all', shoes: visibleShoes }];

  const recommendedIds = new Set(recommended.map(shoe => shoe.id));
  const discover = visibleShoes.filter(shoe => !recommendedIds.has(shoe.id));
  const sections: BrowseSection<T>[] = [{ kind: 'recommended', shoes: recommended }];
  if (discover.length > 0) sections.push({ kind: 'discover', shoes: discover });
  return sections;
}
