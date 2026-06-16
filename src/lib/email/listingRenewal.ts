import { formatListingName } from '@/lib/utils';

interface ListingRenewalEmailArgs {
  sellerName: string;
  brand: string;
  model: string;
  listingUrl: string;
  renewUrl: string;
  updateAndRenewUrl: string;
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderListingRenewalEmail({
  sellerName,
  brand,
  model,
  listingUrl,
  renewUrl,
  updateAndRenewUrl,
}: ListingRenewalEmailArgs): string {
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
                <h1 style="margin:0;color:#0f172a;font-size:25px;line-height:1.25;">Is this pair still available?</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 4px;">
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Hi ${escape(sellerName)}, your <strong>${escape(listingName)}</strong> listing has been active for a while and has not been updated recently.</p>
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Renewing tells buyers the shoes are still being checked by the owner. It will show as checked recently, but it will not mark the listing as just posted.</p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">If anything changed, update the price, condition, photos, or notes first.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background:#0d9488;">
                      <a href="${escape(renewUrl)}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-weight:700;text-decoration:none;font-size:14px;">Renew listing</a>
                    </td>
                    <td style="width:10px;"></td>
                    <td style="border-radius:10px;border:1px solid #cbd5e1;background:#ffffff;">
                      <a href="${escape(updateAndRenewUrl)}" style="display:inline-block;padding:11px 17px;color:#0f172a;font-weight:700;text-decoration:none;font-size:14px;">Update and Renew</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0 0 10px;color:#64748b;font-size:12px;line-height:1.6;">You can also review the listing here: <a href="${escape(listingUrl)}" style="color:#0f766e;text-decoration:none;">${escape(listingUrl)}</a></p>
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Go Pair PH sends this reminder only when a listing is old enough and has not been updated recently.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
