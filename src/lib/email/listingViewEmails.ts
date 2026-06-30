import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';
import { escapeHtml, paragraph, renderButton, renderEmailShell } from '@/lib/email/template';

interface MilestoneEmailArgs {
  sellerName: string;
  brand: string;
  model: string;
  milestone: number;
  listingUrl: string;
}

interface AdminReportListing {
  listingUrl: string;
  listingName: string;
  sellerName: string;
  shopName: string | null;
  totalViews: number;
  dailyViews: Array<{ date: string; views: number }>;
}

interface AdminReportEmailArgs {
  windowStart: string;
  windowEnd: string;
  listings: AdminReportListing[];
  totalViews: number;
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

export function renderAdminListingViewsReportEmail({
  windowStart,
  windowEnd,
  listings,
  totalViews,
}: AdminReportEmailArgs): string {
  const rows = listings.length === 0
    ? '<tr><td colspan="4" style="padding:18px;border-top:1px solid rgba(148,163,184,.16);color:#94a3b8;">No listing views were recorded in this report window.</td></tr>'
    : listings.map(item => {
      const daily = item.dailyViews
        .map(day => `${escapeHtml(day.date)}: ${formatNumber(day.views)}`)
        .join('<br>');
      return `
        <tr>
          <td style="padding:14px;border-top:1px solid rgba(148,163,184,.16);vertical-align:top;"><a href="${escapeHtml(item.listingUrl)}" style="color:#2dd4bf;font-weight:800;text-decoration:none;">${escapeHtml(item.listingName)}</a></td>
          <td style="padding:14px;border-top:1px solid rgba(148,163,184,.16);vertical-align:top;color:#cbd5e1;">${escapeHtml(item.shopName ?? item.sellerName)}</td>
          <td style="padding:14px;border-top:1px solid rgba(148,163,184,.16);vertical-align:top;color:#f8fafc;font-weight:800;">${formatNumber(item.totalViews)}</td>
          <td style="padding:14px;border-top:1px solid rgba(148,163,184,.16);vertical-align:top;color:#cbd5e1;line-height:1.6;">${daily}</td>
        </tr>`;
    }).join('');

  return renderEmailShell({
    eyebrow: 'Go Pair PH admin report',
    title: 'Weekly listing views',
    preheader: `${formatNumber(totalViews)} total views from ${windowStart} to ${windowEnd}.`,
    width: 760,
    children: `
      <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">${escapeHtml(windowStart)} to ${escapeHtml(windowEnd)} · ${formatNumber(totalViews)} total views</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th align="left" style="padding:12px 14px;color:#94a3b8;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Listing</th>
            <th align="left" style="padding:12px 14px;color:#94a3b8;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Seller</th>
            <th align="left" style="padding:12px 14px;color:#94a3b8;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Views</th>
            <th align="left" style="padding:12px 14px;color:#94a3b8;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Daily breakdown</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `,
  });
}

export function getListingUrl(siteUrl: string, listing: { id: string; slug?: string | null }): string {
  return getAbsoluteListingUrl(siteUrl.replace(/\/$/, ''), listing);
}
