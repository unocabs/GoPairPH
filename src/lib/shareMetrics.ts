'use client';

import { createClient } from '@/lib/supabase/client';

export type ListingShareMetric = 'caption_copy' | 'image_download';
export type ListingShareReward = { message: string; awarded: boolean } | null;

function rewardFromRpcRow(reward: unknown): ListingShareReward {
  const row = reward as { amount_coins?: number; created_at?: string } | null;
  const amount = Number(row?.amount_coins ?? 0);
  const createdAt = row?.created_at ? new Date(row.created_at).getTime() : 0;
  const createdJustNow = createdAt > 0 && Date.now() - createdAt < 15_000;
  return amount > 0 && createdJustNow
    ? { message: `+${amount} GP ${amount === 1 ? 'Coin' : 'Coins'}`, awarded: true }
    : null;
}

export async function recordListingShareMetric(listingId: string, action: ListingShareMetric): Promise<ListingShareReward> {
  const supabase = createClient();
  const { error } = await supabase.rpc('increment_listing_share_metric', {
    p_listing_id: listingId,
    p_action: action,
  });

  if (error && process.env.NODE_ENV === 'development') {
    console.warn('Could not record listing share metric', error.message);
  }

  const { data: reward, error: rewardError } = await supabase.rpc('gp_coin_award_share_action', {
    p_listing_id: listingId,
    p_action: action,
  });

  if (rewardError) {
    if (/daily/i.test(rewardError.message) || /limit/i.test(rewardError.message)) {
      return { message: 'Daily coin limit reached', awarded: false };
    }
    return null;
  }

  return rewardFromRpcRow(reward);
}

export async function recordListingShareReward(listingId: string, action: 'fb_group_open'): Promise<ListingShareReward> {
  const { data: reward, error } = await createClient().rpc('gp_coin_award_share_action', {
    p_listing_id: listingId,
    p_action: action,
  });

  if (error) {
    if (/daily/i.test(error.message) || /limit/i.test(error.message)) {
      return { message: 'Daily coin limit reached', awarded: false };
    }
    return null;
  }

  return rewardFromRpcRow(reward);
}
