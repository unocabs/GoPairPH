import type { RunningShoePriceGuideEstimate } from './pricing/runningShoePriceGuide';
import type { EstimatorInput, EstimatorResult } from './pricing/estimator';

export const FEEDBACK_CATEGORY_LABELS = {
  suggestion: 'Suggestion',
  confusing: 'Confusing',
  missing_feature: 'Missing feature',
  bug: 'Bug',
  price_estimate: 'Price estimate',
} as const;
export const PRICE_FEEDBACK_REASONS = {
  too_low: 'Too low',
  too_high: 'Too high',
} as const;
export type PriceFeedbackReason = keyof typeof PRICE_FEEDBACK_REASONS;
export type FeedbackStatus = 'new' | 'reviewed' | 'closed';
export function feedbackComment(
  message: string,
  reason?: PriceFeedbackReason | null,
): string {
  const comment = message.trim();
  return !comment || (reason && comment === PRICE_FEEDBACK_REASONS[reason])
    ? 'No additional comment provided.'
    : comment;
}
export interface PriceFeedbackSnapshot {
  engine_version: string;
  input: EstimatorInput;
  estimate: RunningShoePriceGuideEstimate | EstimatorResult;
  reference_price_php: number;
  price_choice: 'suggested_range' | 'fast_sale';
  evidence_type: 'formula' | EstimatorResult['evidenceType'];
  estimate_id?: string;
}
export interface ProductFeedback {
  id: string;
  category: keyof typeof FEEDBACK_CATEGORY_LABELS;
  message: string;
  contact_email: string | null;
  listing_id: string | null;
  page_path: string;
  status: FeedbackStatus;
  created_at: string;
  price_reason: PriceFeedbackReason | null;
  suggested_price_php: number | null;
  estimator_snapshot: PriceFeedbackSnapshot | null;
  email_status: 'pending' | 'sent' | 'suppressed' | 'legacy';
}
export interface FeedbackOverview {
  total: number;
  new: number;
  too_low: number;
  too_high: number;
  models: Array<{
    brand: string;
    model: string;
    condition: string;
    total: number;
    too_low: number;
    too_high: number;
  }>;
}
