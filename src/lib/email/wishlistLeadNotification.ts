import { formatPrice, formatSize } from '@/lib/utils';

interface WishlistLeadEmailArgs {
  requestTitle: string;
  requestUrl: string;
  leadUrl: string;
  leadPricePhp: number | null;
  leadNote: string | null;
  offererName: string | null;
  sizeLabel: string;
}

export function renderWishlistLeadNotificationEmail({
  requestTitle,
  requestUrl,
  leadUrl,
  leadPricePhp,
  leadNote,
  offererName,
  sizeLabel,
}: WishlistLeadEmailArgs): string {
  const priceLabel = leadPricePhp != null ? formatPrice(leadPricePhp) : 'Price not provided';

  return `
    <div style="margin:0;padding:0;background:#020617;font-family:Inter,Arial,sans-serif;color:#e5e7eb;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="border:1px solid rgba(45,212,191,.22);border-radius:18px;background:linear-gradient(145deg,rgba(15,23,42,.96),rgba(2,6,23,.98));overflow:hidden;">
          <div style="padding:24px 24px 18px;border-bottom:1px solid rgba(148,163,184,.14);">
            <p style="margin:0 0 10px;color:#2dd4bf;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">New Looking For lead</p>
            <h1 style="margin:0;color:#f8fafc;font-size:28px;line-height:1.15;">Someone found a possible match</h1>
            <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.6;">
              A runner added a lead to your Looking For post on Go Pair PH. Check it when you have time.
            </p>
          </div>

          <div style="padding:22px 24px;">
            <div style="border:1px solid rgba(148,163,184,.12);border-radius:14px;background:rgba(15,23,42,.72);padding:16px;">
              <p style="margin:0;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">Your request</p>
              <p style="margin:5px 0 0;color:#f8fafc;font-size:18px;font-weight:800;">${escapeHtml(requestTitle)}</p>
              ${sizeLabel ? `<p style="margin:5px 0 0;color:#94a3b8;font-size:14px;">${escapeHtml(sizeLabel)}</p>` : ''}
            </div>

            <div style="margin-top:14px;border:1px solid rgba(45,212,191,.16);border-radius:14px;background:rgba(20,184,166,.08);padding:16px;">
              <p style="margin:0;color:#5eead4;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">Lead details</p>
              <p style="margin:6px 0 0;color:#f8fafc;font-size:18px;font-weight:800;">${escapeHtml(priceLabel)}</p>
              ${offererName ? `<p style="margin:5px 0 0;color:#94a3b8;font-size:14px;">Added by ${escapeHtml(offererName)}</p>` : ''}
              ${leadNote ? `<p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;">${escapeHtml(leadNote)}</p>` : ''}
              <p style="margin:10px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;word-break:break-all;">
                Lead link: <a href="${escapeAttribute(leadUrl)}" style="color:#5eead4;">${escapeHtml(leadUrl)}</a>
              </p>
            </div>

            <div style="margin-top:24px;">
              <a href="${escapeAttribute(requestUrl)}" style="display:inline-block;border-radius:12px;background:#14b8a6;color:#042f2e;text-decoration:none;font-weight:800;padding:13px 18px;">
                View Lead on Go Pair PH
              </a>
              <p style="margin:14px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                Manage your Looking For post:<br>
                <a href="${escapeAttribute(requestUrl)}" style="color:#5eead4;word-break:break-all;">${escapeHtml(requestUrl)}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function makeWishlistLeadRequestTitle(args: {
  brand: string;
  model: string;
  color: string | null;
}): string {
  const name = args.brand === 'Other' ? args.model : `${args.brand} ${args.model}`;
  return args.color ? `${name} (${args.color})` : name;
}

export function makeWishlistLeadSizeLabel(args: {
  sizeEu: number | null;
  sizeUs: number | null;
  sizeCm: number | null;
  usSizeType?: string | null;
}): string {
  return formatSize(args.sizeEu, args.sizeUs, args.sizeCm, args.usSizeType);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
