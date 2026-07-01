export const REACTIVATION_BLAST_ID = 'gopairph-reactivation-2026-06-09-v2';
import { escapeAttribute, escapeHtml, paragraph, renderButton, renderEmailShell, renderTextLink } from '@/lib/email/template';

export const REACTIVATION_BLAST_SUBJECT = 'Got running shoes to find or sell?';
export const REACTIVATION_BLAST_PREVIEW =
  'Go Pair PH keeps running shoe deals easier to find, list, and share.';
export const REACTIVATION_CORRECTION_BLAST_ID = 'gopairph-reactivation-corrected-link-2026-06-09';
export const REACTIVATION_CORRECTION_SUBJECT = 'Correct Go Pair PH link';
export const REACTIVATION_CORRECTION_PREVIEW =
  'Sorry, the first email had local test links. Here are the working Go Pair PH links.';
export const PRICE_ESTIMATOR_BLAST_ID = 'gopairph-price-estimator-2026-07-01';
export const PRICE_ESTIMATOR_BLAST_SUBJECT = 'Price your running shoes before you list';
export const PRICE_ESTIMATOR_BLAST_PREVIEW =
  'Use the Go Pair PH price estimator to get a practical resale range before posting your shoes.';

interface ReactivationBlastEmailArgs {
  recipientName?: string | null;
  siteUrl: string;
  unsubscribeUrl?: string;
}

function firstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'runner';
  return trimmed.split(/\s+/)[0] ?? 'runner';
}

export function renderReactivationBlastEmail({
  recipientName,
  siteUrl,
  unsubscribeUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);
  const homeUrl = `${baseUrl}/`;
  const listUrl = `${baseUrl}/listings/new`;
  const browseUrl = `${baseUrl}/browse`;
  const findUrl = `${baseUrl}/looking-for`;
  const optOutUrl = unsubscribeUrl ?? `${baseUrl}/profile`;

  return renderEmailShell({
    title: 'Got running shoes to find or sell?',
    preheader: REACTIVATION_BLAST_PREVIEW,
    footerReason: 'You are receiving this because you opted in to Go Pair PH news and community updates.',
    children: `
      ${paragraph(`Hi ${escapeHtml(name)},`)}
      ${paragraph('Go Pair PH gives runners one cleaner place to find, list, and share running shoes without digging through scattered Facebook posts, repeated comments, and missing details.')}
      ${paragraph('If you are selling, create one clean listing with photos, size, condition, price, location, and seller info. Then share the same Go Pair PH link anywhere.')}
      ${paragraph('If you are buying, browse running shoes, save listings, or post what you are looking for so the community can point you to a match.')}
      <p style="margin:22px 0 0;">${renderButton(homeUrl, 'Open Go Pair PH')}</p>
      <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.9;">
        ${renderTextLink(listUrl, 'List running shoes')}<br>
        ${renderTextLink(browseUrl, 'Browse running shoes')}<br>
        ${renderTextLink(findUrl, 'Post what you are looking for')}
      </p>
      <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
        <a href="${escapeHtml(optOutUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from promotional emails</a>
      </p>
    `,
  });
}

export function renderReactivationBlastText({ recipientName, siteUrl, unsubscribeUrl }: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);

  return `Hi ${name},

Sometimes the running shoe problem is simple:

You need running shoes in your size.
Or you have running shoes that are no longer in your rotation.

Maybe it was the wrong size. Maybe you upgraded. Maybe race day is done. Maybe you are just checking if there is a better deal nearby.

That is why Go Pair PH exists.

It gives runners one cleaner place to find, list, and share running shoes without digging through scattered Facebook posts, repeated comments, and missing details.

If you are selling, create one listing with the photos, size, condition, price, location, and seller info. Then share that same Go Pair PH link anywhere.

If you are buying, browse running shoes, save listings, or post what you are looking for so the community can point you to a match.

Open Go Pair PH: ${baseUrl}/
List running shoes: ${baseUrl}/listings/new
Browse Listings: ${baseUrl}/browse
Looking For: ${baseUrl}/looking-for

List once. Search cleaner. Share anywhere.

Go Pair PH
Runners helping runners.

You are receiving this because you opted in to Go Pair PH news and community updates.
Unsubscribe: ${unsubscribeUrl ?? `${baseUrl}/profile`}`;
}

export function renderReactivationCorrectionEmail({
  recipientName,
  siteUrl,
  unsubscribeUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);
  const homeUrl = `${baseUrl}/`;
  const listUrl = `${baseUrl}/listings/new`;
  const browseUrl = `${baseUrl}/browse`;
  const findUrl = `${baseUrl}/looking-for`;
  const optOutUrl = unsubscribeUrl ?? `${baseUrl}/profile`;

  return renderEmailShell({
    title: 'Quick fix: here is the working link',
    preheader: REACTIVATION_CORRECTION_PREVIEW,
    footerReason: 'You are receiving this because you opted in to Go Pair PH news and community updates.',
    children: `
      ${paragraph(`Hi ${escapeHtml(name)}, sorry about that. The previous Go Pair PH email accidentally used local test links.`)}
      ${paragraph('Here is the correct public link. Use Go Pair PH to find, list, and share running shoes in one cleaner place.')}
      <p style="margin:22px 0 0;">${renderButton(homeUrl, 'Open Go Pair PH')}</p>
      <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.9;">
        ${renderTextLink(listUrl, 'List running shoes')}<br>
        ${renderTextLink(browseUrl, 'Browse running shoes')}<br>
        ${renderTextLink(findUrl, 'Post what you are looking for')}
      </p>
      <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
        <a href="${escapeHtml(optOutUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from promotional emails</a>
      </p>
    `,
  });
}

export function renderReactivationCorrectionText({
  recipientName,
  siteUrl,
  unsubscribeUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);

  return `Hi ${name},

Sorry about that. The previous Go Pair PH email accidentally used local test links.

Here is the correct public link:
${baseUrl}/

Useful links:
List running shoes: ${baseUrl}/listings/new
Browse Listings: ${baseUrl}/browse
Looking For: ${baseUrl}/looking-for

Use Go Pair PH to find, list, and share running shoes in one cleaner place.

Thanks for your patience,
Go Pair PH

You are receiving this because you opted in to Go Pair PH news and community updates.
Unsubscribe: ${unsubscribeUrl ?? `${baseUrl}/profile`}`;
}

export function renderPriceEstimatorBlastEmail({
  recipientName,
  siteUrl,
  unsubscribeUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);
  const priceGuideUrl = `${baseUrl}/price-guide`;
  const listUrl = `${baseUrl}/listings/new`;
  const browseUrl = `${baseUrl}/browse`;
  const optOutUrl = unsubscribeUrl ?? `${baseUrl}/profile`;

  return renderEmailShell({
    title: PRICE_ESTIMATOR_BLAST_SUBJECT,
    preheader: PRICE_ESTIMATOR_BLAST_PREVIEW,
    children: `
      ${paragraph(`Hi ${escapeHtml(name)},`)}
      ${paragraph('Not sure how much to sell your running shoes for?')}
      ${paragraph('Go Pair PH has a resale price estimator built for running shoes in the Philippines. Add the original retail price, condition, mileage, age, and demand, then get a practical price range you can use before listing.')}
      ${paragraph('It is not a guaranteed selling price, but it can help you avoid pricing too high, too low, or guessing from random posts.')}
      <p style="margin:22px 0 0;">${renderButton(priceGuideUrl, 'Check my resale price')}</p>
      <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.9;">
        ${renderTextLink(listUrl, 'List running shoes')}<br>
        ${renderTextLink(browseUrl, 'Browse running shoes')}
      </p>
      <p style="margin:28px 0 0;text-align:center;">
        <a href="${escapeAttribute(optOutUrl)}" style="display:inline-block;border:1px solid rgba(100,116,139,.45);border-radius:999px;padding:5px 9px;color:#64748b;font-size:10px;line-height:12px;text-decoration:none;">Unsubscribe</a>
      </p>
    `,
  });
}

export function renderPriceEstimatorBlastText({
  recipientName,
  siteUrl,
  unsubscribeUrl,
}: ReactivationBlastEmailArgs): string {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const name = firstName(recipientName);

  return `Hi ${name},

Not sure how much to sell your running shoes for?

Go Pair PH has a resale price estimator built for running shoes in the Philippines. Add the original retail price, condition, mileage, age, and demand, then get a practical price range you can use before listing.

It is not a guaranteed selling price, but it can help you avoid pricing too high, too low, or guessing from random posts.

Check my resale price: ${baseUrl}/price-guide
List running shoes: ${baseUrl}/listings/new
Browse running shoes: ${baseUrl}/browse

Go Pair PH
Runners helping runners.

Unsubscribe: ${unsubscribeUrl ?? `${baseUrl}/profile`}`;
}
