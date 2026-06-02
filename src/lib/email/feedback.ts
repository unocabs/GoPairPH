interface FeedbackEmailData {
  category: string;
  message: string;
  contactEmail: string | null;
  profileName: string | null;
  listingTitle: string | null;
  listingUrl: string | null;
  pagePath: string;
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function labelCategory(value: string): string {
  const labels: Record<string, string> = {
    confusing: 'Confusing',
    missing_feature: 'Missing feature',
    bug: 'Bug',
    suggestion: 'Suggestion',
  };
  return labels[value] ?? value;
}

export function renderFeedbackEmail(data: FeedbackEmailData): string {
  const category = escape(labelCategory(data.category));
  const profile = escape(data.profileName ?? 'Unknown profile');
  const contact = data.contactEmail ? escape(data.contactEmail) : 'Not provided';
  const listing = data.listingTitle ? escape(data.listingTitle) : 'No listing attached';
  const pagePath = escape(data.pagePath);
  const message = escape(data.message).replaceAll('\n', '<br />');
  const listingLink = data.listingUrl
    ? `<p style="margin:8px 0 0;"><a href="${escape(data.listingUrl)}" style="color:#0f766e;font-weight:700;text-decoration:none;">Open listing</a></p>`
    : '';

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Go Pair PH feedback</p>
                <h1 style="margin:0;color:#0f172a;font-size:24px;line-height:1.25;">New post-listing feedback</h1>
                <p style="margin:14px 0 0;color:#475569;font-size:14px;line-height:1.6;">A seller sent feedback after listing a pair.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">Category</td><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;">${category}</td></tr>
                  <tr><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">Profile</td><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;">${profile}</td></tr>
                  <tr><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">Contact</td><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#0f172a;font-size:13px;">${contact}</td></tr>
                  <tr><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">Listing</td><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#0f172a;font-size:13px;">${listing}${listingLink}</td></tr>
                  <tr><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">Page</td><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#0f172a;font-size:13px;">${pagePath}</td></tr>
                </table>
                <div style="margin-top:18px;border-left:4px solid #14b8a6;background:#f0fdfa;border-radius:8px;padding:16px;color:#134e4a;font-size:15px;line-height:1.65;">
                  ${message}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
