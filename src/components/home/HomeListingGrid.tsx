import type { Shoe } from '@/types';
import type { PersonalizationBadges } from '@/lib/personalization';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { HomeListingCard } from './HomeListingCard';

interface HomeListingGridProps {
  shoes: Shoe[];
  emptyMessage: string;
  currentProfileId?: string;
  savedListingIds?: Set<string>;
  savedListingCounts?: Record<string, number>;
  personalizationBadges?: Record<string, PersonalizationBadges>;
  showSaveActions?: boolean;
  showFreshnessDates?: boolean;
}

export function HomeListingGrid({
  shoes,
  emptyMessage,
  currentProfileId,
  savedListingIds,
  savedListingCounts,
  personalizationBadges,
  showSaveActions = true,
  showFreshnessDates = true,
}: HomeListingGridProps) {
  if (shoes.length === 0) {
    return (
      <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300/80">No pairs yet</p>
        <p className="mt-3 text-gray-500">{emptyMessage}</p>
      </SurfaceCard>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {shoes.map(shoe => (
        <HomeListingCard
          key={shoe.id}
          shoe={shoe}
          currentProfileId={currentProfileId}
          isSaved={savedListingIds?.has(shoe.id) ?? false}
          saveCount={savedListingCounts?.[shoe.id] ?? 0}
          personalizationBadges={personalizationBadges?.[shoe.id]}
          showSaveAction={showSaveActions}
          showFreshnessDate={showFreshnessDates}
        />
      ))}
    </div>
  );
}
