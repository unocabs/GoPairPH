'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { trackMarketplaceAction } from '@/lib/analytics';

type HeroTrackedLinkProps = ComponentProps<typeof Link> & {
  action: string;
  listingId?: string;
};

export function HeroTrackedLink({ action, listingId, onClick, ...props }: HeroTrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackMarketplaceAction(action, {
          surface: 'homepage_hero',
          listing_id: listingId,
          destination: typeof props.href === 'string' ? props.href : undefined,
        });
        onClick?.(event);
      }}
    />
  );
}
