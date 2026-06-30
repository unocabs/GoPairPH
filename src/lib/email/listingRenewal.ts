import { formatListingName } from '@/lib/utils';
import { escapeHtml, paragraph, renderButton, renderEmailShell } from '@/lib/email/template';

interface ListingRenewalEmailArgs {
  sellerName: string;
  brand: string;
  model: string;
  listingUrl: string;
  renewUrl: string;
  updateAndRenewUrl: string;
}

export function renderListingRenewalEmail({
  sellerName,
  brand,
  model,
  listingUrl,
  renewUrl,
  updateAndRenewUrl,
}: ListingRenewalEmailArgs): string {
  const listingName = formatListingName(brand, model);

  return renderEmailShell({
    title: 'Is this listing still available?',
    preheader: `Keep your ${listingName} listing useful for buyers.`,
    footerReason: 'You are receiving this because you have an active Go Pair PH listing that may need a quick check.',
    children: `
      ${paragraph(`Hi ${escapeHtml(sellerName)}, we care about keeping your <strong>${escapeHtml(listingName)}</strong> listing useful for buyers.`)}
      ${paragraph('If these running shoes are still available, renew the listing so runners know it is still being checked. If anything changed, update the price, condition, photos, or notes first.')}
      <p style="margin:22px 0 0;">
        ${renderButton(renewUrl, 'Renew listing')}
        <span style="display:inline-block;width:10px;"></span>
        ${renderButton(updateAndRenewUrl, 'Update listing', 'secondary')}
      </p>
      <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">Listing: ${escapeHtml(listingUrl)}</p>
    `,
  });
}
