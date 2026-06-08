export const REACTIVATION_BLAST_ID = 'gopairph-reactivation-2026-06-09-v2';
export const REACTIVATION_BLAST_SUBJECT = 'Got a pair to find, or a pair to let go?';
export const REACTIVATION_BLAST_PREVIEW =
  'Go Pair PH keeps running shoe deals easier to find, list, and share.';
export const REACTIVATION_CORRECTION_BLAST_ID = 'gopairph-reactivation-corrected-link-2026-06-09';
export const REACTIVATION_CORRECTION_SUBJECT = 'Correct Go Pair PH link';
export const REACTIVATION_CORRECTION_PREVIEW =
  'Sorry, the first email had local test links. Here are the working Go Pair PH links.';

interface ReactivationBlastEmailArgs {
  recipientName?: string | null;
  siteUrl: string;
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function firstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'runner';
  return trimmed.split(/\s+/)[0] ?? 'runner';
}

export function renderReactivationBlastEmail({
  recipientName,
  siteUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);
  const homeUrl = `${baseUrl}/`;
  const listUrl = `${baseUrl}/listings/new`;
  const browseUrl = `${baseUrl}/browse`;
  const findUrl = `${baseUrl}/find-my-pair`;

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(REACTIVATION_BLAST_PREVIEW)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:30px 28px 10px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Go Pair PH</p>
                <h1 style="margin:0;color:#0f172a;font-size:28px;line-height:1.18;">Got a pair to find, or a pair to let go?</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 4px;">
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">Hi ${escape(name)},</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">Sometimes the running shoe problem is simple:</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">You need a pair in your size.<br>Or you already have a pair that is no longer in your rotation.</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">Maybe it was the wrong size. Maybe you upgraded. Maybe race day is done. Maybe you are just checking if there is a better deal nearby.</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">That is why Go Pair PH exists.</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">It gives runners one cleaner place to find, list, and share running shoes without digging through scattered Facebook posts, repeated comments, and missing details.</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">If you are selling, create one listing with the photos, size, condition, price, location, and seller info. Then share that same Go Pair PH link anywhere.</p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.75;">If you are buying, browse listings, save pairs, or post what you are looking for so the community can point you to a match.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 12px;">
                <a href="${escape(homeUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 18px;border-radius:12px;">Open Go Pair PH</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;"><a href="${escape(listUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">List a Pair</a></td>
                    <td style="padding:8px 0;font-size:14px;"><a href="${escape(browseUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">Browse Listings</a></td>
                    <td style="padding:8px 0;font-size:14px;"><a href="${escape(findUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">Find My Pair</a></td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;color:#0f172a;font-size:15px;line-height:1.7;font-weight:700;">List once. Search cleaner. Share anywhere.</p>
                <p style="margin:8px 0 0;color:#334155;font-size:14px;line-height:1.6;">Go Pair PH<br>Runners helping runners.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:18px 28px;color:#64748b;font-size:12px;line-height:1.6;">
                You are receiving this because you created a Go Pair PH account. If you do not want non-essential Go Pair PH updates, reply "unsubscribe" and we will remove you from future blasts.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderReactivationBlastText({ recipientName, siteUrl }: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);

  return `Hi ${name},

Sometimes the running shoe problem is simple:

You need a pair in your size.
Or you already have a pair that is no longer in your rotation.

Maybe it was the wrong size. Maybe you upgraded. Maybe race day is done. Maybe you are just checking if there is a better deal nearby.

That is why Go Pair PH exists.

It gives runners one cleaner place to find, list, and share running shoes without digging through scattered Facebook posts, repeated comments, and missing details.

If you are selling, create one listing with the photos, size, condition, price, location, and seller info. Then share that same Go Pair PH link anywhere.

If you are buying, browse listings, save pairs, or post what you are looking for so the community can point you to a match.

Open Go Pair PH: ${baseUrl}/
List a Pair: ${baseUrl}/listings/new
Browse Listings: ${baseUrl}/browse
Find My Pair: ${baseUrl}/find-my-pair

List once. Search cleaner. Share anywhere.

Go Pair PH
Runners helping runners.

You are receiving this because you created a Go Pair PH account. If you do not want non-essential Go Pair PH updates, reply "unsubscribe" and we will remove you from future blasts.`;
}

export function renderReactivationCorrectionEmail({
  recipientName,
  siteUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);
  const homeUrl = `${baseUrl}/`;
  const listUrl = `${baseUrl}/listings/new`;
  const browseUrl = `${baseUrl}/browse`;
  const findUrl = `${baseUrl}/find-my-pair`;

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(REACTIVATION_CORRECTION_PREVIEW)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Go Pair PH</p>
                <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.2;">Quick fix: here is the working link</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 6px;">
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">Hi ${escape(name)}, sorry about that. The previous Go Pair PH email accidentally used local test links.</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">Here is the correct public link:</p>
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.75;">Use Go Pair PH to find, list, and share running shoes in one cleaner place.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 18px;">
                <a href="${escape(homeUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 18px;border-radius:12px;">Open Go Pair PH</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0 0 10px;color:#334155;font-size:14px;line-height:1.7;">Useful links:</p>
                <p style="margin:0;color:#334155;font-size:14px;line-height:1.9;">
                  <a href="${escape(listUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">List a Pair</a><br>
                  <a href="${escape(browseUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">Browse Listings</a><br>
                  <a href="${escape(findUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">Find My Pair</a>
                </p>
                <p style="margin:18px 0 0;color:#334155;font-size:14px;line-height:1.6;">Thanks for your patience,<br>Go Pair PH</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:18px 28px;color:#64748b;font-size:12px;line-height:1.6;">
                You are receiving this because you created a Go Pair PH account. If you do not want non-essential Go Pair PH updates, reply "unsubscribe" and we will remove you from future blasts.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderReactivationCorrectionText({
  recipientName,
  siteUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);

  return `Hi ${name},

Sorry about that. The previous Go Pair PH email accidentally used local test links.

Here is the correct public link:
${baseUrl}/

Useful links:
List a Pair: ${baseUrl}/listings/new
Browse Listings: ${baseUrl}/browse
Find My Pair: ${baseUrl}/find-my-pair

Use Go Pair PH to find, list, and share running shoes in one cleaner place.

Thanks for your patience,
Go Pair PH

You are receiving this because you created a Go Pair PH account. If you do not want non-essential Go Pair PH updates, reply "unsubscribe" and we will remove you from future blasts.`;
}
