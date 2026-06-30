import { labelSponsoredPaymentMethod } from '@/lib/sponsoredPromotions';
import { formatPrice } from '@/lib/utils';
import type { SponsoredPaymentMethod } from '@/types';
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

interface SponsoredPromotionEmailBase {
  listingName: string;
  listingUrl: string;
  sellerName: string;
  durationDays: number;
  pricePhp: number;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
}

interface AdminProofEmailArgs extends SponsoredPromotionEmailBase {
  adminUrl: string;
  paymentMethod: SponsoredPaymentMethod | null;
  transactionReference: string | null;
  proofUrl: string | null;
  status: string;
}

export function renderAdminSponsoredProofEmail(args: AdminProofEmailArgs): string {
  const proofLink = args.proofUrl
    ? `<p style="margin:12px 0 0;">${renderButton(args.proofUrl, 'Open payment proof', 'secondary')}</p>`
    : '';

  return shell('Top Pick proof submitted', 'Go Pair PH admin', `
    ${paragraph(`A seller submitted payment proof for Top Pick placement on <strong>${escapeHtml(args.listingName)}</strong>.`)}
    ${renderInfoRows([
      { label: 'Seller', value: args.sellerName },
      { label: 'Duration', value: `${args.durationDays} days` },
      { label: 'Top Pick price', value: formatPrice(args.pricePhp) },
      { label: 'Payment method', value: labelSponsoredPaymentMethod(args.paymentMethod) },
      { label: 'Transaction reference', value: args.transactionReference ?? 'Not provided' },
      { label: 'Status', value: args.status },
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

export function renderSellerSponsoredSubmittedEmail(args: SponsoredPromotionEmailBase): string {
  return shell('Your Top Pick request was received', 'Go Pair PH', `
    ${paragraph(`Your Top Pick request for <strong>${escapeHtml(args.listingName)}</strong> is active now while we review your payment proof.`)}
    ${renderInfoRows([
      { label: 'Duration', value: `${args.durationDays} days` },
      { label: 'Amount', value: formatPrice(args.pricePhp) },
      { label: 'Starts', value: formatDate(args.scheduledStartAt) },
      { label: 'Ends', value: formatDate(args.scheduledEndAt) },
    ])}
    <p style="margin:22px 0 0;">${renderButton(args.listingUrl, 'View listing')}</p>
    <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
      If payment proof is invalid, the Top Pick placement may be removed.
    </p>
  `);
}

export function renderSellerSponsoredReviewEmail(args: SponsoredPromotionEmailBase & { approved: boolean; notes: string | null }): string {
  return shell(args.approved ? 'Your Top Pick is approved' : 'Top Pick request needs review', 'Go Pair PH', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      ${args.approved
        ? `<strong>${escapeHtml(args.listingName)}</strong> is approved for Top Pick placement.`
        : `We reviewed the Top Pick request for <strong>${escapeHtml(args.listingName)}</strong> and it needs another look.`}
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
