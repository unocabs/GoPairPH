import { Badge } from '@/components/ui/Badge';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ListingType } from '@/types';

export function ListingTypeBadge({ type }: { type: ListingType }) {
  return (
    <Badge className={cn('font-semibold', LISTING_TYPE_COLORS[type])}>
      {LISTING_TYPE_LABELS[type]}
    </Badge>
  );
}
