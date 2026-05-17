import { type Shoe } from '@/types';
import { type ShopTheme } from '@/lib/shopTheme';
import { ListingCard } from './ListingCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

interface ListingGridProps {
  shoes: Shoe[];
  emptyMessage?: string;
  currentProfileId?: string;
  myRequestListingIds?: Set<string>;
  offerCounts?: Record<string, number>;
  viewCounts?: Record<string, { total: number; last7d: number }>;
  theme?: ShopTheme;
}

export function ListingGrid({ shoes, emptyMessage = 'No listings found.', currentProfileId, myRequestListingIds, offerCounts, viewCounts, theme }: ListingGridProps) {
  if (shoes.length === 0) {
    return (
      <SurfaceCard className="flex flex-col items-center justify-center border-dashed py-16 text-center">
        <span className="text-4xl opacity-50">👟</span>
        <p className="mt-3 text-gray-500">{emptyMessage}</p>
      </SurfaceCard>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {shoes.map(shoe => (
        <ListingCard
          key={shoe.id}
          shoe={shoe}
          currentProfileId={currentProfileId}
          hasExistingRequest={myRequestListingIds?.has(shoe.id) ?? false}
          offerCount={offerCounts?.[shoe.id] ?? 0}
          viewSummary={viewCounts?.[shoe.id]}
          theme={theme}
        />
      ))}
    </div>
  );
}
