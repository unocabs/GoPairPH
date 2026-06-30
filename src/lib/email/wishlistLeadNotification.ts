import { formatPrice, formatSize } from '@/lib/utils';
import { escapeAttribute, escapeHtml, paragraph, renderButton, renderCallout, renderEmailShell, renderInfoRows } from '@/lib/email/template';

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

  return renderEmailShell({
    eyebrow: 'New Looking For lead',
    title: 'Someone found a possible match',
    preheader: `A runner added a lead for ${requestTitle}.`,
    footerReason: 'You are receiving this because someone added a lead to your Looking For post on Go Pair PH.',
    children: `
      ${paragraph('A runner added a lead to your Looking For post. Check the details and decide if it is worth following up.')}
      ${renderInfoRows([
        { label: 'Your request', value: requestTitle },
        { label: 'Size', value: sizeLabel || null },
        { label: 'Lead price', value: priceLabel },
        { label: 'Added by', value: offererName ?? null },
      ])}
      ${leadNote ? renderCallout('Lead note', escapeHtml(leadNote)) : ''}
      <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;word-break:break-all;">
        Lead link: <a href="${escapeAttribute(leadUrl)}" style="color:#2dd4bf;">${escapeHtml(leadUrl)}</a>
      </p>
      <p style="margin:22px 0 0;">${renderButton(requestUrl, 'View request')}</p>
    `,
  });
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
