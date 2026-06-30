import { formatPrice } from '@/lib/utils';
import { labelPaymentMethod } from '@/lib/featuredPromotions';
import type { FeaturedPaymentMethod } from '@/types';
import { escapeHtml, paragraph, renderButton, renderEmailShell, renderInfoRows } from '@/lib/email/template';

function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled yet';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function shell(title: string, eyebrow: string, body: string): string {
  return renderEmailShell({ title, eyebrow, children: body });
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
    ? `<p style="margin:12px 0 0;">${renderButton(args.proofUrl, 'Open payment proof', 'secondary')}</p>`
    : '';

  return shell('Featured proof submitted', 'Go Pair PH admin', `
    ${paragraph(`A seller submitted payment proof for <strong>${escapeHtml(args.listingName)}</strong>.`)}
    ${renderInfoRows([
      { label: 'Seller', value: args.sellerName },
      { label: 'Duration', value: `${args.durationDays} days` },
      { label: 'Featured price', value: formatPrice(args.pricePhp) },
      { label: 'GP Coins spent', value: `${(args.coinsUsed ?? 0).toLocaleString('en-PH')} GP` },
      { label: 'Coin discount', value: formatPrice(args.coinDiscountPhp ?? 0) },
      { label: 'Cash amount', value: formatPrice(args.cashAmountPhp ?? args.pricePhp) },
      { label: 'Payment mode', value: args.paymentMode ?? 'Cash only' },
      { label: 'Payment method', value: labelPaymentMethod(args.paymentMethod) },
      { label: 'Transaction reference', value: args.transactionReference ?? 'Not provided' },
      { label: 'Queue status', value: args.status },
      { label: 'Queue position', value: args.queuePosition ? `#${args.queuePosition}` : 'Active now / pending sync' },
      { label: 'Starts', value: formatDate(args.scheduledStartAt) },
      { label: 'Ends', value: formatDate(args.scheduledEndAt) },
    ])}
    <p style="margin:22px 0 0;">${renderButton(args.adminUrl, 'Review in admin')}</p>
    ${proofLink}
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">
      Listing: ${escapeHtml(args.listingUrl)}
    </p>
  `);
}

export function renderSellerFeaturedSubmittedEmail(args: FeaturedPromotionEmailBase): string {
  return shell('Your Featured request was received', 'Go Pair PH', `
    ${paragraph(`Your Featured request for <strong>${escapeHtml(args.listingName)}</strong> is in line. We will review your payment proof, but your position is already reserved.`)}
    ${renderInfoRows([
      { label: 'Duration', value: `${args.durationDays} days` },
      { label: 'Amount', value: formatPrice(args.pricePhp) },
      { label: 'Starts', value: formatDate(args.scheduledStartAt) },
      { label: 'Ends', value: formatDate(args.scheduledEndAt) },
    ])}
    <p style="margin:22px 0 0;">${renderButton(args.listingUrl, 'View listing')}</p>
    <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">If payment proof is invalid, the placement may be removed.</p>
  `);
}

export function renderSellerFeaturedReviewEmail(args: FeaturedPromotionEmailBase & { approved: boolean; notes: string | null }): string {
  return shell(args.approved ? 'Your Featured listing is approved' : 'Featured request needs review', 'Go Pair PH', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      ${args.approved
        ? `<strong>${escapeHtml(args.listingName)}</strong> is approved for Featured placement.`
        : `We reviewed the Featured request for <strong>${escapeHtml(args.listingName)}</strong> and it needs another look.`}
    </p>
    ${renderInfoRows([
      { label: 'Duration', value: `${args.durationDays} days` },
      { label: 'Starts', value: formatDate(args.scheduledStartAt) },
      { label: 'Ends', value: formatDate(args.scheduledEndAt) },
      { label: 'Admin note', value: args.notes },
    ])}
    <p style="margin:22px 0 0;">${renderButton(args.listingUrl, 'View listing')}</p>
  `);
}
