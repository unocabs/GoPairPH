import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';

let cached: Resend | null = null;

export type TransactionalEmailCategory =
  | 'admin_notification'
  | 'featured_promotion'
  | 'feedback'
  | 'listing_milestone'
  | 'listing_published'
  | 'listing_renewal'
  | 'marketplace_offer'
  | 'marketplace_order'
  | 'request_status'
  | 'saved_search'
  | 'seller_note'
  | 'sponsored_promotion'
  | 'wishlist_lead';

interface EmailContentArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface TransactionalEmailArgs extends EmailContentArgs {
  category: TransactionalEmailCategory;
  tags?: Record<string, string>;
}

interface MarketingEmailArgs extends EmailContentArgs {
  campaign: string;
  unsubscribeUrl?: string;
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

export function getTransactionalEmailDefaults() {
  return {
    from: process.env.RESEND_TRANSACTIONAL_FROM ?? 'Go Pair PH <notifications@notify.gopairph.com>',
    replyTo: process.env.RESEND_REPLY_TO_EMAIL ?? 'hello@gopairph.com',
  };
}

export function getMarketingEmailDefaults() {
  return {
    from: process.env.RESEND_MARKETING_FROM ?? 'Go Pair PH <news@news.gopairph.com>',
    replyTo: process.env.RESEND_REPLY_TO_EMAIL ?? 'hello@gopairph.com',
  };
}

export function getMarketingHeaders(campaign: string, unsubscribeUrl?: string): Record<string, string> {
  return {
    'X-GoPairPH-Campaign': campaign,
    ...(unsubscribeUrl ? {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    } : {}),
  };
}

export function getEmailTags(stream: 'transactional' | 'marketing', category: string, tags: Record<string, string> = {}) {
  return Object.entries({ stream, category, ...tags }).map(([name, value]) => ({
    name: sanitizeTagPart(name),
    value: sanitizeTagPart(value),
  }));
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  category,
  tags,
}: TransactionalEmailArgs): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn('[resend] RESEND_API_KEY not set — skipping transactional email');
    return;
  }

  const recipients = await excludeSuppressedRecipients(to);
  if (recipients.length === 0) {
    console.warn(`[resend] All recipients suppressed — skipped ${category} email`);
    return;
  }

  const { from, replyTo } = getTransactionalEmailDefaults();
  const { error } = await client.emails.send({
    from,
    to: recipients,
    replyTo,
    subject,
    html,
    text: text?.trim() || htmlToPlainText(html),
    tags: getEmailTags('transactional', category, tags),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}

export async function sendMarketingEmail({
  to,
  subject,
  html,
  text,
  campaign,
  unsubscribeUrl,
}: MarketingEmailArgs): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn('[resend] RESEND_API_KEY not set — skipping marketing email');
    return;
  }

  const recipients = await excludeSuppressedRecipients(to);
  if (recipients.length === 0) {
    console.warn(`[resend] All recipients suppressed — skipped ${campaign} email`);
    return;
  }

  const { from, replyTo } = getMarketingEmailDefaults();
  const { error } = await client.emails.send({
    from,
    to: recipients,
    replyTo,
    subject,
    html,
    text: text?.trim() || htmlToPlainText(html),
    headers: getMarketingHeaders(campaign, unsubscribeUrl),
    tags: getEmailTags('marketing', campaign),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href: string, label: string) => {
      const cleanLabel = stripTags(label).trim();
      return cleanLabel && cleanLabel !== href ? `${cleanLabel} (${href})` : href;
    })
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table|section)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function excludeSuppressedRecipients(to: string | string[]): Promise<string[]> {
  const recipients = Array.from(new Set((Array.isArray(to) ? to : [to])
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)));
  if (recipients.length === 0) return [];

  const service = createServiceClient();
  const { data, error } = await service
    .from('email_suppressions')
    .select('email')
    .in('email', recipients);

  if (error) throw new Error(`Could not check email suppressions: ${error.message}`);
  const suppressed = new Set((data ?? []).map(row => row.email.toLowerCase()));
  return recipients.filter(email => !suppressed.has(email));
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function sanitizeTagPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256) || 'unknown';
}
