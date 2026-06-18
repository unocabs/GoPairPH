'use client';

import { createClient } from '@/lib/supabase/client';

export type ListingShareMetric = 'caption_copy' | 'image_download';

export async function recordListingShareMetric(listingId: string, action: ListingShareMetric): Promise<void> {
  const { error } = await createClient().rpc('increment_listing_share_metric', {
    p_listing_id: listingId,
    p_action: action,
  });

  if (error && process.env.NODE_ENV === 'development') {
    console.warn('Could not record listing share metric', error.message);
  }
}
