import { CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize } from '@/lib/utils';

interface AdminNewListingEmailArgs {
  listingName: string;
  listingUrl: string;
  sellerName: string;
  shopName?: string | null;
  pricePhp?: number | null;
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
  listingType,
  condition,
  sizeLabel,
  photoCount,
  createdAt,
}: AdminNewListingEmailArgs): string {
  const priceLabel = listingType === 'donate' ? 'Free Shoes' : formatPrice(pricePhp ?? null);
  const conditionLabel = CONDITIONS[condition] ?? condition;
  const postedAt = new Date(createdAt).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  });

  return `
    <div style="margin:0;padding:0;background:#020617;font-family:Inter,Arial,sans-serif;color:#e5e7eb;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="border:1px solid rgba(45,212,191,.22);border-radius:18px;background:linear-gradient(145deg,rgba(15,23,42,.96),rgba(2,6,23,.98));overflow:hidden;">
          <div style="padding:24px 24px 18px;border-bottom:1px solid rgba(148,163,184,.14);">
            <p style="margin:0 0 10px;color:#2dd4bf;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">New Go Pair PH listing</p>
            <h1 style="margin:0;color:#f8fafc;font-size:28px;line-height:1.1;">${escapeHtml(listingName)}</h1>
            <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.6;">
              A seller posted a new pair. Open it to review, flag if needed, or generate a Share Post Kit asset.
            </p>
          </div>

          <div style="padding:22px 24px;">
            <div style="display:grid;gap:10px;">
              ${detailRow('Seller', escapeHtml(sellerName))}
              ${shopName ? detailRow('Shop', escapeHtml(shopName)) : ''}
              ${detailRow('Price', escapeHtml(priceLabel || 'Not provided'))}
              ${detailRow('Condition', escapeHtml(conditionLabel))}
              ${sizeLabel ? detailRow('Size', escapeHtml(sizeLabel)) : ''}
              ${detailRow('Photos', `${photoCount}`)}
              ${detailRow('Posted', escapeHtml(postedAt))}
            </div>

            <div style="margin-top:24px;">
              <a href="${listingUrl}" style="display:inline-block;border-radius:12px;background:#14b8a6;color:#042f2e;text-decoration:none;font-weight:800;padding:13px 18px;">
                Open Listing
              </a>
              <p style="margin:14px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                Direct link:<br>
                <a href="${listingUrl}" style="color:#5eead4;word-break:break-all;">${listingUrl}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function makeAdminNewListingEmailInput(args: {
  brand: string;
  model: string;
  listingUrl: string;
  sellerName: string;
  shopName?: string | null;
  pricePhp?: number | null;
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
    listingType: args.listingType,
    condition: args.condition,
    sizeLabel,
    photoCount: args.photoCount,
    createdAt: args.createdAt,
  };
}

function detailRow(label: string, value: string): string {
  return `
    <div style="border:1px solid rgba(148,163,184,.12);border-radius:12px;background:rgba(15,23,42,.72);padding:12px 14px;">
      <div style="color:#64748b;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">${label}</div>
      <div style="margin-top:4px;color:#e5e7eb;font-size:15px;font-weight:700;">${value}</div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
