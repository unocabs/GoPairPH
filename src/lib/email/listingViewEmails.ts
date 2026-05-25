import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';

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

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Go Pair PH</p>
                <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.2;">Your pair is gaining views. Keep going!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 4px;">
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Hi ${escape(sellerName)}, good news. Your <strong>${escape(listingName)}</strong> listing is being seen by runners on Go Pair PH.</p>
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">It just hit <strong>${formatNumber(milestone)} views today</strong>. That means your pair is in front of people who are actively looking right now.</p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">To keep the momentum going, share your Go Pair PH listing link again in Facebook groups, Marketplace, Messenger, or Reddit.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <a href="${escape(listingUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px;">View your listing</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Go Pair PH keeps your shoe details, photos, and offers organized in one shareable page.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Go Pair PH</p>
                <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.2;">${formatNumber(milestone)} runners checked out your pair 🎯</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 4px;">
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Hi ${escape(sellerName)}, milestone unlocked. Your <strong>${escape(listingName)}</strong> listing has now been viewed by <strong>${formatNumber(milestone)} unique runners</strong> on Go Pair PH since you posted it.</p>
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">That's real interest — this kind of traction usually means the listing is well-priced and well-described. Keep an eye out for incoming offers.</p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">Want to push it further? Reshare the link in running groups and on Marketplace. The more eyes, the faster it sells.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background:#0d9488;">
                      <a href="${escape(listingUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:700;text-decoration:none;font-size:14px;">View your listing</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb;padding:20px 28px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:12px;">
                You're getting this once per listing when it crosses ${formatNumber(milestone)} lifetime views.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderAdminListingViewsReportEmail({
  windowStart,
  windowEnd,
  listings,
  totalViews,
}: AdminReportEmailArgs): string {
  const rows = listings.length === 0
    ? '<tr><td colspan="5" style="padding:18px;border-top:1px solid #e2e8f0;color:#64748b;">No listing views were recorded in this report window.</td></tr>'
    : listings.map(item => {
      const daily = item.dailyViews
        .map(day => `${escape(day.date)}: ${formatNumber(day.views)}`)
        .join('<br>');
      return `
        <tr>
          <td style="padding:14px;border-top:1px solid #e2e8f0;vertical-align:top;"><a href="${escape(item.listingUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">${escape(item.listingName)}</a></td>
          <td style="padding:14px;border-top:1px solid #e2e8f0;vertical-align:top;color:#334155;">${escape(item.shopName ?? item.sellerName)}</td>
          <td style="padding:14px;border-top:1px solid #e2e8f0;vertical-align:top;color:#0f172a;font-weight:700;">${formatNumber(item.totalViews)}</td>
          <td style="padding:14px;border-top:1px solid #e2e8f0;vertical-align:top;color:#334155;line-height:1.6;">${daily}</td>
        </tr>`;
    }).join('');

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Go Pair PH admin report</p>
                <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.2;">Weekly listing views</h1>
                <p style="margin:10px 0 0;color:#64748b;font-size:14px;">${escape(windowStart)} to ${escape(windowEnd)} · ${formatNumber(totalViews)} total views</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:12px 14px;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Listing</th>
                      <th align="left" style="padding:12px 14px;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Seller</th>
                      <th align="left" style="padding:12px 14px;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Views</th>
                      <th align="left" style="padding:12px 14px;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Daily breakdown</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getListingUrl(siteUrl: string, listing: { id: string; slug?: string | null }): string {
  return getAbsoluteListingUrl(siteUrl.replace(/\/$/, ''), listing);
}
