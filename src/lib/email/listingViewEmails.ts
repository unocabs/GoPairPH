import { formatListingName } from '@/lib/utils';
import { escapeHtml, paragraph, renderButton, renderEmailShell } from '@/lib/email/template';

interface MilestoneEmailArgs {
  sellerName: string;
  brand: string;
  model: string;
  milestone: number;
  listingUrl: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-PH').format(value);
}

export function renderListingViewMilestoneEmail({
  sellerName,
  brand,
  model,
  milestone,
  listingUrl,
}: MilestoneEmailArgs): string {
  const listingName = formatListingName(brand, model);
  return renderEmailShell({
    title: 'Your listing is getting views',
    preheader: `${listingName} reached ${formatNumber(milestone)} views today.`,
    footerReason: 'You are receiving this because your active listing reached a view milestone.',
    children: `
      ${paragraph(`Hi ${escapeHtml(sellerName)}, your <strong>${escapeHtml(listingName)}</strong> listing is being seen by runners on Go Pair PH.`)}
      ${paragraph(`It reached <strong>${formatNumber(milestone)} views today</strong>. Open the listing to make sure the photos, size, condition, price, and location are still clear.`)}
      <p style="margin:22px 0 0;">${renderButton(listingUrl, 'View listing')}</p>
    `,
  });
}

interface LifetimeMilestoneEmailArgs {
  sellerName: string;
  brand: string;
  model: string;
  milestone: number;
  listingUrl: string;
}

// One-time celebration email when a listing crosses a lifetime view threshold.
// Distinct from the daily milestone — different copy emphasizes the cumulative
// achievement, not today's activity.
export function renderListingViewLifetimeMilestoneEmail({
  sellerName,
  brand,
  model,
  milestone,
  listingUrl,
}: LifetimeMilestoneEmailArgs): string {
  const listingName = formatListingName(brand, model);
  return renderEmailShell({
    title: `${formatNumber(milestone)} runners viewed your listing`,
    preheader: `${listingName} crossed ${formatNumber(milestone)} lifetime views on Go Pair PH.`,
    footerReason: `You are receiving this once per listing when it crosses ${formatNumber(milestone)} lifetime views.`,
    children: `
      ${paragraph(`Hi ${escapeHtml(sellerName)}, your <strong>${escapeHtml(listingName)}</strong> listing has now been viewed by <strong>${formatNumber(milestone)} unique runners</strong> since you posted it.`)}
      ${paragraph('Open the listing to review the current details and make sure buyers have everything they need to decide faster.')}
      <p style="margin:22px 0 0;">${renderButton(listingUrl, 'View listing')}</p>
    `,
  });
}
