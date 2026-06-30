import { escapeHtml, paragraph, renderButton, renderEmailShell } from '@/lib/email/template';

export function renderListingPublishedEmail({ listingName, listingUrl }: { listingName: string; listingUrl: string }): string {
  return renderEmailShell({
    title: 'Your listing is live',
    preheader: `${listingName} is now listed on Go Pair PH.`,
    footerReason: 'You are receiving this because you published a running shoe listing on Go Pair PH.',
    children: `
      ${paragraph(`<strong>${escapeHtml(listingName)}</strong> is now live. You can share the same Go Pair PH link to Facebook groups, Marketplace, Messenger, or buyers who ask for details.`)}
      ${paragraph('Keep the details clear and current so runners can check size, condition, price, and location before messaging.')}
      <p style="margin:22px 0 0;">${renderButton(listingUrl, 'View listing')}</p>
      <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">${escapeHtml(listingUrl)}</p>
    `,
  });
}
