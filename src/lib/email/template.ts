export const EMAIL_COLORS = {
  page: '#020617',
  card: '#061826',
  cardSoft: '#0f172a',
  border: '#1e293b',
  borderSoft: 'rgba(148,163,184,.16)',
  teal: '#0d9488',
  tealBright: '#2dd4bf',
  text: '#f8fafc',
  muted: '#cbd5e1',
  subtle: '#94a3b8',
  dim: '#64748b',
  white: '#ffffff',
};

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttribute(value: string | number | null | undefined): string {
  return escapeHtml(value);
}

export function renderButton(href: string, label: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const isPrimary = variant === 'primary';
  const background = isPrimary ? EMAIL_COLORS.teal : EMAIL_COLORS.cardSoft;
  const color = isPrimary ? EMAIL_COLORS.white : EMAIL_COLORS.text;
  const border = isPrimary ? EMAIL_COLORS.teal : EMAIL_COLORS.border;

  return `<a href="${escapeAttribute(href)}" style="box-sizing:border-box;display:inline-block;border:1px solid ${border};border-radius:12px;background:${background};padding:13px 18px;color:${color};font-size:14px;font-weight:800;line-height:18px;text-decoration:none;">${escapeHtml(label)}</a>`;
}

export function renderTextLink(href: string, label: string): string {
  return `<a href="${escapeAttribute(href)}" style="color:${EMAIL_COLORS.tealBright};font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`;
}

export function renderInfoRows(rows: Array<{ label: string; value: string | number | null | undefined }>): string {
  const filtered = rows.filter(row => row.value !== null && row.value !== undefined && String(row.value).trim() !== '');
  if (filtered.length === 0) return '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-collapse:collapse;">
      ${filtered.map(row => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid ${EMAIL_COLORS.borderSoft};color:${EMAIL_COLORS.subtle};font-size:13px;line-height:18px;">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:10px 0;border-top:1px solid ${EMAIL_COLORS.borderSoft};color:${EMAIL_COLORS.text};font-size:13px;font-weight:800;line-height:18px;">${escapeHtml(row.value)}</td>
        </tr>
      `).join('')}
    </table>`;
}

export function renderCallout(title: string, body: string): string {
  return `
    <div style="margin-top:18px;border:1px solid rgba(45,212,191,.18);border-left:4px solid ${EMAIL_COLORS.teal};border-radius:12px;background:rgba(20,184,166,.08);padding:15px 16px;">
      <p style="margin:0 0 6px;color:${EMAIL_COLORS.tealBright};font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(title)}</p>
      <p style="margin:0;color:${EMAIL_COLORS.muted};font-size:14px;line-height:1.65;">${body}</p>
    </div>`;
}

export function paragraph(body: string): string {
  return `<p style="margin:14px 0 0;color:${EMAIL_COLORS.muted};font-size:15px;line-height:1.7;">${body}</p>`;
}

export function renderFooterNote(reason: string): string {
  return `
    <p style="margin:0 0 12px;color:${EMAIL_COLORS.subtle};font-size:12px;line-height:1.6;">${escapeHtml(reason)}</p>
    <p style="margin:0;color:${EMAIL_COLORS.dim};font-size:12px;line-height:1.6;">
      Go Pair PH is built for runners, local sellers, and selected shops across Central Luzon and NCR.
      <br />
      <a href="https://gopairph.com/safety" style="color:${EMAIL_COLORS.subtle};text-decoration:underline;">Safety Guide</a>
      &nbsp;·&nbsp;
      <a href="https://gopairph.com/contact" style="color:${EMAIL_COLORS.subtle};text-decoration:underline;">Contact</a>
      &nbsp;·&nbsp;
      <a href="https://gopairph.com/privacy" style="color:${EMAIL_COLORS.subtle};text-decoration:underline;">Privacy</a>
    </p>`;
}

export function renderEmailShell({
  eyebrow = 'Go Pair PH',
  title,
  preheader,
  children,
  footerReason,
  width = 600,
}: {
  eyebrow?: string;
  title: string;
  preheader?: string;
  children: string;
  footerReason?: string;
  width?: number;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>${escapeHtml(title)} - Go Pair PH</title>
  </head>
  <body style="margin:0;background:${EMAIL_COLORS.page};font-family:Arial,'Helvetica Neue',sans-serif;color:${EMAIL_COLORS.text};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_COLORS.page};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${width}px;border:1px solid ${EMAIL_COLORS.border};border-radius:18px;background:${EMAIL_COLORS.card};overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 20px;border-bottom:1px solid ${EMAIL_COLORS.borderSoft};">
                <p style="margin:0 0 10px;color:${EMAIL_COLORS.tealBright};font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0;color:${EMAIL_COLORS.text};font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
                <p style="margin:12px 0 0;color:${EMAIL_COLORS.subtle};font-size:13px;line-height:1.6;">Running shoes across Central Luzon and NCR.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px 24px;">
                ${children}
              </td>
            </tr>
            ${footerReason ? `
              <tr>
                <td style="background:${EMAIL_COLORS.cardSoft};border-top:1px solid ${EMAIL_COLORS.borderSoft};padding:18px 24px;text-align:left;">
                  ${renderFooterNote(footerReason)}
                </td>
              </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
