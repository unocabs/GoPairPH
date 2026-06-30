import { labelSponsoredPaymentMethod } from '@/lib/sponsoredPromotions';
import { formatPrice } from '@/lib/utils';
import type { SponsoredPaymentMethod } from '@/types';

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
    ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(args.proofUrl)}" style="display:inline-block;border-radius:10px;background:#334155;padding:12px 16px;color:#f8fafc;font-size:14px;font-weight:700;text-decoration:none;">Open payment proof</a></p>`
    : '';

  return shell('Top Pick proof submitted', 'Go Pair PH admin', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      A seller submitted payment proof for Top Pick placement on <strong>${escapeHtml(args.listingName)}</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-collapse:collapse;">
      ${row('Seller', args.sellerName)}
      ${row('Duration', `${args.durationDays} days`)}
      ${row('Top Pick price', formatPrice(args.pricePhp))}
      ${row('Payment method', labelSponsoredPaymentMethod(args.paymentMethod))}
      ${row('Transaction reference', args.transactionReference ?? 'Not provided')}
      ${row('Status', args.status)}
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

export function renderSellerSponsoredSubmittedEmail(args: SponsoredPromotionEmailBase): string {
  return shell('Your Top Pick request was received', 'Go Pair PH', `
    <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Your Top Pick request for <strong>${escapeHtml(args.listingName)}</strong> is active now while we review your payment proof.
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
