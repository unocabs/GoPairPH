import { type Shoe } from '@/types';
import { ListingCard } from './ListingCard';

interface ListingGridProps {
  shoes: Shoe[];
  emptyMessage?: string;
  currentProfileId?: string;
  myRequestListingIds?: Set<string>;
}

export function ListingGrid({ shoes, emptyMessage = 'No listings found.', currentProfileId, myRequestListingIds }: ListingGridProps) {
  if (shoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <span className="text-4xl opacity-50">👟</span>
        <p className="mt-3 text-gray-500">{emptyMessage}</p>
      </div>
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
        />
      ))}
    </div>
  );
}
