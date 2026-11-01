import { escapeHtml, renderButton, renderCallout, renderEmailShell, renderInfoRows } from '@/lib/email/template';
import { PRICE_FEEDBACK_REASONS, feedbackComment, type PriceFeedbackSnapshot, type PriceFeedbackReason } from '@/lib/feedback';
import { buildPriceFeedbackReview } from '@/lib/pricing/feedbackReview';

interface FeedbackEmailData {
  category: string;
  message: string;
  contactEmail: string | null;
  profileName: string | null;
  listingTitle: string | null;
  listingUrl: string | null;
  pagePath: string;
  adminUrl?: string;
  priceReason?: PriceFeedbackReason | null;
  suggestedPricePhp?: number | null;
  snapshot?: PriceFeedbackSnapshot | null;
}

function labelCategory(value: string): string {
  const labels: Record<string, string> = {
    confusing: 'Confusing',
    missing_feature: 'Missing feature',
    bug: 'Bug',
    suggestion: 'Suggestion',
    price_estimate: 'Price estimate',
  };
  return labels[value] ?? value;
}

export function renderFeedbackEmail(data: FeedbackEmailData): string {
  const listing = data.listingTitle ?? 'No listing attached';
  const message = escapeHtml(data.snapshot ? feedbackComment(data.message, data.priceReason) : data.message).replaceAll('\n', '<br />');
  const review = data.snapshot ? buildPriceFeedbackReview(data.snapshot, data.suggestedPricePhp ?? null) : null;
  const listingLink = data.listingUrl
    ? `<p style="margin:8px 0 0;"><a href="${escapeHtml(data.listingUrl)}" style="color:#2dd4bf;font-weight:700;text-decoration:none;">Open listing</a></p>`
    : '';

  return renderEmailShell({
    eyebrow: 'Go Pair PH feedback',
    title: 'New feedback',
    preheader: 'A user sent feedback from Go Pair PH.',
    children: `
      <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;">A user sent feedback after using Go Pair PH.</p>
      ${renderInfoRows([
        { label: 'Category', value: labelCategory(data.category) },
        { label: 'Profile', value: data.profileName ?? 'Unknown profile' },
        { label: 'Contact', value: data.contactEmail ?? 'Not provided' },
        { label: 'Listing', value: listing },
        { label: 'Page', value: data.pagePath },
      ])}
      ${listingLink}
      ${data.snapshot && review ? renderInfoRows([
        { label: 'Shoes', value: `${data.snapshot.input.brand} ${data.snapshot.input.model}` },
        { label: 'Reason', value: data.priceReason ? PRICE_FEEDBACK_REASONS[data.priceReason] : '' },
        ...review.metrics.map(metric => ({ label: metric.label, value: metric.value })),
        { label: 'Difference', value: review.differenceLabel },
        ...review.prices,
        ...review.details,
        { label: 'Engine', value: data.snapshot.engine_version },
        { label: 'Price evidence', value: 'Formula only; SRP supplied by user, not verified retail data' },
      ]) : ''}
      ${renderCallout(data.snapshot ? 'User comment' : 'Message', message)}
      ${data.adminUrl ? `<div style="margin-top:22px;">${renderButton(data.adminUrl, 'Review feedback in admin')}</div>` : ''}
    `,
  });
}
