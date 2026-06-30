import { escapeHtml, renderCallout, renderEmailShell, renderInfoRows } from '@/lib/email/template';

interface FeedbackEmailData {
  category: string;
  message: string;
  contactEmail: string | null;
  profileName: string | null;
  listingTitle: string | null;
  listingUrl: string | null;
  pagePath: string;
}

function labelCategory(value: string): string {
  const labels: Record<string, string> = {
    confusing: 'Confusing',
    missing_feature: 'Missing feature',
    bug: 'Bug',
    suggestion: 'Suggestion',
  };
  return labels[value] ?? value;
}

export function renderFeedbackEmail(data: FeedbackEmailData): string {
  const listing = data.listingTitle ?? 'No listing attached';
  const message = escapeHtml(data.message).replaceAll('\n', '<br />');
  const listingLink = data.listingUrl
    ? `<p style="margin:8px 0 0;"><a href="${escapeHtml(data.listingUrl)}" style="color:#2dd4bf;font-weight:700;text-decoration:none;">Open listing</a></p>`
    : '';

  return renderEmailShell({
    eyebrow: 'Go Pair PH feedback',
    title: 'New feedback',
    preheader: 'A user sent feedback from Go Pair PH.',
    children: `
      <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;">A user sent feedback after using Go Pair PH.</p>
      ${renderInfoRows([
        { label: 'Category', value: labelCategory(data.category) },
        { label: 'Profile', value: data.profileName ?? 'Unknown profile' },
        { label: 'Contact', value: data.contactEmail ?? 'Not provided' },
        { label: 'Listing', value: listing },
        { label: 'Page', value: data.pagePath },
      ])}
      ${listingLink}
      ${renderCallout('Message', message)}
    `,
  });
}
