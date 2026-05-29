import { CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize } from '@/lib/utils';

export interface SavedSearchAlertMatch {
  searchKeyword: string;
  listingName: string;
  listingUrl: string;
  pricePhp: number | null;
  size: string;
  condition: string | null;
}

interface SavedSearchAlertEmailArgs {
  displayName: string;
  matches: SavedSearchAlertMatch[];
  browseUrl: string;
  manageUrl: string;
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderSavedSearchAlertEmail({
  displayName,
  matches,
  browseUrl,
  manageUrl,
}: SavedSearchAlertEmailArgs): string {
  const rows = matches.map(match => {
    const details = [
      match.pricePhp != null ? formatPrice(match.pricePhp) : 'Donation',
      match.size || null,
      match.condition ? CONDITIONS[match.condition] ?? match.condition : null,
    ].filter(Boolean).join(' · ');

    return `
      <tr>
        <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Matched: ${escape(match.searchKeyword)}</p>
          <a href="${escape(match.listingUrl)}" style="display:block;color:#0f172a;font-size:16px;font-weight:700;text-decoration:none;line-height:1.35;">${escape(match.listingName)}</a>
          <p style="margin:6px 0 0;color:#475569;font-size:13px;line-height:1.5;">${escape(details)}</p>
        </td>
      </tr>`;
  }).join('');

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 10px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Go Pair PH saved searches</p>
                <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.2;">Fresh pairs matched what you're looking for</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 0;">
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">Hi ${escape(displayName || 'runner')}, a few new pairs matched your saved searches. Check them when you have time.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tbody>${rows}</tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background:#0d9488;">
                      <a href="${escape(browseUrl)}" style="display:inline-block;padding:12px 20px;color:#ffffff;font-weight:700;text-decoration:none;font-size:14px;">View matching pairs</a>
                    </td>
                    <td style="width:12px;"></td>
                    <td>
                      <a href="${escape(manageUrl)}" style="display:inline-block;padding:12px 0;color:#0f766e;font-weight:700;text-decoration:none;font-size:14px;">Manage saved searches</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb;padding:18px 28px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.6;">
                You're receiving this because saved-search emails are enabled in your Go Pair PH profile. We send at most one saved-search digest per day.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function makeSavedSearchEmailMatch(args: {
  searchKeyword: string;
  brand: string;
  model: string;
  listingUrl: string;
  pricePhp: number | null;
  sizeEu: number | null;
  sizeUs: number | null;
  sizeCm: number | null;
  condition: string | null;
}): SavedSearchAlertMatch {
  return {
    searchKeyword: args.searchKeyword,
    listingName: formatListingName(args.brand, args.model),
    listingUrl: args.listingUrl,
    pricePhp: args.pricePhp,
    size: formatSize(args.sizeEu, args.sizeUs, args.sizeCm),
    condition: args.condition,
  };
}
