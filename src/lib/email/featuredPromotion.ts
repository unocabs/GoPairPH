import { formatPrice } from '@/lib/utils';
import { labelPaymentMethod } from '@/lib/featuredPromotions';
import type { FeaturedPaymentMethod } from '@/types';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] ?? character));
}

function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled yet';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function shell(title: string, eyebrow: string, body: string): string {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#020617;font-family:Arial,sans-serif;color:#e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:28px 12px;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #1f2937;border-radius:18px;background:#0f172a;overflow:hidden;">
              <tr><td style="padding:28px;">
                <p style="margin:0;color:#5eead4;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:12px 0 0;color:#f8fafc;font-size:25px;line-height:1.25;">${escapeHtml(title)}</h1>
                ${body}
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:9px 0;border-top:1px solid #1f2937;color:#94a3b8;font-size:13px;">${escapeHtml(label)}</td><td style="padding:9px 0;border-top:1px solid #1f2937;color:#e5e7eb;font-size:13px;font-weight:700;">${escapeHtml(value)}</td></tr>`;
}

interface FeaturedPromotionEmailBase {
  listingName: string;
  listingUrl: string;
  sellerName: string;
  durationDays: number;
  pricePhp: number;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
}

interface AdminProofEmailArgs extends FeaturedPromotionEmailBase {
  adminUrl: string;
  paymentMethod: FeaturedPaymentMethod | null;
  transactionReference: string | null;
  proofUrl: string | null;
  queuePosition: number | null;
  status: string;
  coinsUsed?: number;
  coinDiscountPhp?: number;
  cashAmountPhp?: number;
  paymentMode?: string;
}

export function renderAdminFeaturedProofEmail(args: AdminProofEmailArgs): string {
  const proofLink = args.proofUrl
    ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(args.proofUrl)}" style="display:inline-block;border-radius:10px;background:#334155;padding:12px 16px;color:#f8fafc;font-size:14px;font-weight:700;text-decoration:none;">Open payment proof</a></p>`
    : '';

  return shell('Featured proof submitted', 'Go Pair PH admin', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      A seller submitted payment proof for <strong>${escapeHtml(args.listingName)}</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-collapse:collapse;">
      ${row('Seller', args.sellerName)}
      ${row('Duration', `${args.durationDays} days`)}
      ${row('Featured price', formatPrice(args.pricePhp))}
      ${row('GP Coins spent', `${(args.coinsUsed ?? 0).toLocaleString('en-PH')} GP`)}
      ${row('Coin discount', formatPrice(args.coinDiscountPhp ?? 0))}
      ${row('Cash amount', formatPrice(args.cashAmountPhp ?? args.pricePhp))}
      ${row('Payment mode', args.paymentMode ?? 'Cash only')}
      ${row('Payment method', labelPaymentMethod(args.paymentMethod))}
      ${row('Transaction reference', args.transactionReference ?? 'Not provided')}
      ${row('Queue status', args.status)}
      ${row('Queue position', args.queuePosition ? `#${args.queuePosition}` : 'Active now / pending sync')}
      ${row('Starts', formatDate(args.scheduledStartAt))}
      ${row('Ends', formatDate(args.scheduledEndAt))}
    </table>
    <p style="margin:22px 0 0;">
      <a href="${escapeHtml(args.adminUrl)}" style="display:inline-block;border-radius:10px;background:#14b8a6;padding:13px 18px;color:#052e2b;font-size:15px;font-weight:800;text-decoration:none;">Review promotion</a>
    </p>
    ${proofLink}
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">
      Listing: ${escapeHtml(args.listingUrl)}
    </p>
  `);
}

export function renderSellerFeaturedSubmittedEmail(args: FeaturedPromotionEmailBase): string {
  return shell('Your Featured request was received', 'Go Pair PH', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Your Featured request for <strong>${escapeHtml(args.listingName)}</strong> is now in line. We’ll review your payment proof, but your position is already reserved.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-collapse:collapse;">
      ${row('Duration', `${args.durationDays} days`)}
      ${row('Amount', formatPrice(args.pricePhp))}
      ${row('Starts', formatDate(args.scheduledStartAt))}
      ${row('Ends', formatDate(args.scheduledEndAt))}
    </table>
    <p style="margin:22px 0 0;">
      <a href="${escapeHtml(args.listingUrl)}" style="display:inline-block;border-radius:10px;background:#14b8a6;padding:13px 18px;color:#052e2b;font-size:15px;font-weight:800;text-decoration:none;">View your listing</a>
    </p>
    <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
      If payment proof is invalid, the placement may be removed.
    </p>
  `);
}

export function renderSellerFeaturedReviewEmail(args: FeaturedPromotionEmailBase & { approved: boolean; notes: string | null }): string {
  return shell(args.approved ? 'Your Featured listing is approved' : 'Featured request needs review', 'Go Pair PH', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      ${args.approved
        ? `<strong>${escapeHtml(args.listingName)}</strong> is approved for Featured placement.`
        : `We reviewed the Featured request for <strong>${escapeHtml(args.listingName)}</strong> and it needs another look.`}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-collapse:collapse;">
      ${row('Duration', `${args.durationDays} days`)}
      ${row('Starts', formatDate(args.scheduledStartAt))}
      ${row('Ends', formatDate(args.scheduledEndAt))}
      ${args.notes ? row('Admin note', args.notes) : ''}
    </table>
    <p style="margin:22px 0 0;">
      <a href="${escapeHtml(args.listingUrl)}" style="display:inline-block;border-radius:10px;background:#14b8a6;padding:13px 18px;color:#052e2b;font-size:15px;font-weight:800;text-decoration:none;">View your listing</a>
    </p>
  `);
}
