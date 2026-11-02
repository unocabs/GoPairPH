export interface RunningShoeReview {
  listing_id: string;
  status: 'flagged' | 'appealed' | 'approved';
  reason: string;
  appeal_note: string | null;
  appealed_at: string | null;
  review_note: string | null;
  reviewed_at: string | null;
}

/** Stable partition: all existing ordering is preserved within each group. */
export function runningShoesFirst<T extends { running_relevance_flagged?: boolean }>(shoes: T[]): T[] {
  return [...shoes.filter(shoe => !shoe.running_relevance_flagged), ...shoes.filter(shoe => shoe.running_relevance_flagged)];
}
