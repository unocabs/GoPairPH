import { CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize } from '@/lib/utils';
import { escapeHtml, paragraph, renderButton, renderEmailShell, renderInfoRows } from '@/lib/email/template';

interface AdminNewListingEmailArgs {
  listingName: string;
  listingUrl: string;
  sellerName: string;
  shopName?: string | null;
  pricePhp?: number | null;
  srpPhp?: number | null;
  listingType: string;
  condition: string;
  sizeLabel?: string;
  photoCount: number;
  createdAt: string;
}

export function renderAdminNewListingEmail({
  listingName,
  listingUrl,
  sellerName,
  shopName,
  pricePhp,
  srpPhp,
  listingType,
  condition,
  sizeLabel,
  photoCount,
  createdAt,
}: AdminNewListingEmailArgs): string {
  const priceLabel = listingType === 'donate' ? 'Free Shoes' : formatPrice(pricePhp ?? null);
  const srpLabel = listingType === 'for_sale' && srpPhp != null && pricePhp != null && srpPhp >= pricePhp
    ? formatPrice(srpPhp)
    : null;
  const conditionLabel = CONDITIONS[condition] ?? condition;
  const postedAt = new Date(createdAt).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  });

  return renderEmailShell({
    eyebrow: 'Go Pair PH admin',
    title: 'New listing posted',
    preheader: `${listingName} was posted on Go Pair PH.`,
    children: `
      ${paragraph(`A seller posted <strong>${escapeHtml(listingName)}</strong>. Open it to review details, flag if needed, or generate a Facebook post image.`)}
      ${renderInfoRows([
        { label: 'Seller', value: sellerName },
        { label: 'Shop', value: shopName ?? null },
        { label: 'Price', value: priceLabel || 'Not provided' },
        { label: 'SRP', value: srpLabel },
        { label: 'Condition', value: conditionLabel },
        { label: 'Size', value: sizeLabel || null },
        { label: 'Photos', value: photoCount },
        { label: 'Posted', value: postedAt },
      ])}
      <p style="margin:22px 0 0;">${renderButton(listingUrl, 'Review in admin')}</p>
      <p style="margin:14px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;word-break:break-all;">${escapeHtml(listingUrl)}</p>
    `,
  });
}

export function makeAdminNewListingEmailInput(args: {
  brand: string;
  model: string;
  listingUrl: string;
  sellerName: string;
  shopName?: string | null;
  pricePhp?: number | null;
  srpPhp?: number | null;
  listingType: string;
  condition: string;
  sizeEu?: number | null;
  sizeUs?: number | null;
  sizeCm?: number | null;
  usSizeType?: string | null;
  photoCount: number;
  createdAt: string;
}) {
  const sizeLabel = formatSize(args.sizeEu ?? null, args.sizeUs ?? null, args.sizeCm ?? null, args.usSizeType ?? null);

  return {
    listingName: formatListingName(args.brand, args.model),
    listingUrl: args.listingUrl,
    sellerName: args.sellerName,
    shopName: args.shopName,
    pricePhp: args.pricePhp,
    srpPhp: args.srpPhp,
    listingType: args.listingType,
    condition: args.condition,
    sizeLabel,
    photoCount: args.photoCount,
    createdAt: args.createdAt,
  };
}
