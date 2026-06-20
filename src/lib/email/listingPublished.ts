function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] ?? character));
}

export function renderListingPublishedEmail({ listingName, listingUrl }: { listingName: string; listingUrl: string }): string {
  const safeName = escapeHtml(listingName);
  const safeUrl = escapeHtml(listingUrl);
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#020617;font-family:Arial,sans-serif;color:#e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:28px 12px;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #1f2937;border-radius:18px;background:#0f172a;overflow:hidden;">
              <tr><td style="padding:28px;">
                <p style="margin:0;color:#5eead4;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Go Pair PH</p>
                <h1 style="margin:12px 0 0;color:#f8fafc;font-size:26px;line-height:1.25;">Your listing is live</h1>
                <p style="margin:14px 0 0;color:#cbd5e1;font-size:16px;line-height:1.65;"><strong>${safeName}</strong> is now listed on Go Pair PH.</p>
                <p style="margin:10px 0 0;color:#94a3b8;font-size:14px;line-height:1.65;">Keep this email so you can return to your listing anytime.</p>
                <p style="margin:24px 0 0;">
                  <a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#14b8a6;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">View your listing</a>
                </p>
                <p style="margin:22px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">${safeUrl}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
}
