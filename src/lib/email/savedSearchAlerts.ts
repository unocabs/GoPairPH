import { CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize } from '@/lib/utils';
import { escapeHtml, renderButton, renderEmailShell } from '@/lib/email/template';

export interface SavedSearchAlertMatch {
  searchKeyword: string;
  listingName: string;
  listingUrl: string;
  pricePhp: number | null;
  size: string;
  condition: string | null;
  location?: string | null;
}

interface SavedSearchAlertEmailArgs {
  displayName: string;
  matches: SavedSearchAlertMatch[];
  browseUrl: string;
  manageUrl: string;
}

export function renderSavedSearchAlertEmail({
  displayName,
  matches,
  browseUrl,
  manageUrl,
}: SavedSearchAlertEmailArgs): string {
  const rows = matches.map(match => {
    const details = [
      match.pricePhp != null ? formatPrice(match.pricePhp) : 'Free',
      match.size || null,
      match.condition ? CONDITIONS[match.condition] ?? match.condition : null,
      match.location || null,
    ].filter(Boolean).join(' · ');

    return `
      <tr>
        <td style="padding:16px 0;border-top:1px solid rgba(148,163,184,.16);">
          <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">Matched: ${escapeHtml(match.searchKeyword)}</p>
          <a href="${escapeHtml(match.listingUrl)}" style="display:block;color:#f8fafc;font-size:16px;font-weight:800;text-decoration:none;line-height:1.35;">${escapeHtml(match.listingName)}</a>
          <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;line-height:1.5;">${escapeHtml(details)}</p>
        </td>
      </tr>`;
  }).join('');

  return renderEmailShell({
    eyebrow: 'Go Pair PH matches',
    title: 'New running shoes matched your search',
    preheader: 'A few new running shoes matched your saved searches or profile size.',
    footerReason: 'You are receiving this because matched-listing emails are enabled in your Go Pair PH profile. We send at most one digest per day.',
    children: `
      <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;">Hi ${escapeHtml(displayName || 'runner')}, a few new running shoes matched your saved searches or profile size. Check them when you have time.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;">
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:22px 0 0;">
        ${renderButton(browseUrl, 'Browse running shoes')}
        <span style="display:inline-block;width:10px;"></span>
        ${renderButton(manageUrl, 'Manage searches', 'secondary')}
      </p>
    `,
  });
}

export function makeSavedSearchEmailMatch(args: {
  searchKeyword: string;
  brand: string;
  model: string;
  listingUrl: string;
  pricePhp: number | null;
  sizeEu: number | null;
  sizeUs: number | null;
  sizeCm: number | null;
  usSizeType?: string | null;
  condition: string | null;
  location?: string | null;
}): SavedSearchAlertMatch {
  return {
    searchKeyword: args.searchKeyword,
    listingName: formatListingName(args.brand, args.model),
    listingUrl: args.listingUrl,
    pricePhp: args.pricePhp,
    size: formatSize(args.sizeEu, args.sizeUs, args.sizeCm, args.usSizeType),
    condition: args.condition,
    location: args.location ?? null,
  };
}
