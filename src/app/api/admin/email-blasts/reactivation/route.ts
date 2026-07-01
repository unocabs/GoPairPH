import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  getEmailTags,
  getMarketingEmailDefaults,
  getMarketingHeaders,
  getResendClient,
  sendMarketingEmail,
} from '@/lib/email/resend';
import { createMarketingUnsubscribeToken } from '@/lib/email/unsubscribe';
import {
  PRICE_ESTIMATOR_BLAST_ID,
  PRICE_ESTIMATOR_BLAST_PREVIEW,
  PRICE_ESTIMATOR_BLAST_SUBJECT,
  REACTIVATION_CORRECTION_BLAST_ID,
  REACTIVATION_CORRECTION_PREVIEW,
  REACTIVATION_CORRECTION_SUBJECT,
  REACTIVATION_BLAST_ID,
  REACTIVATION_BLAST_PREVIEW,
  REACTIVATION_BLAST_SUBJECT,
  renderPriceEstimatorBlastEmail,
  renderPriceEstimatorBlastText,
  renderReactivationCorrectionEmail,
  renderReactivationCorrectionText,
  renderReactivationBlastEmail,
  renderReactivationBlastText,
} from '@/lib/email/reactivationBlast';

export const runtime = 'nodejs';

const REACTIVATION_CONFIRMATION_PHRASE = 'SEND REACTIVATION BLAST';
const CORRECTION_CONFIRMATION_PHRASE = 'SEND CORRECTED LINK';
const PRICE_ESTIMATOR_CONFIRMATION_PHRASE = 'SEND PRICE ESTIMATOR BLAST';
const BATCH_SIZE = 100;

type Mode = 'preview' | 'test' | 'send';
type Campaign = 'reactivation' | 'correction' | 'priceEstimator';

interface RequestBody {
  mode?: Mode;
  campaign?: Campaign;
  testEmail?: string;
  confirm?: string;
}

interface BlastRecipient {
  userId: string;
  email: string;
  displayName: string | null;
}

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  marketing_email_enabled: boolean;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as RequestBody;
  const mode = body.mode ?? 'preview';

  if (!['preview', 'test', 'send'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  const campaignKey = getCampaignKey(body.campaign);
  const campaign = getCampaign(campaignKey);

  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const siteUrl = getPublicEmailSiteUrl();
  const service = createServiceClient();
  const recipients = await getBlastRecipients(service);
  const sample = recipients.slice(0, 8).map(recipient => ({
    displayName: recipient.displayName,
    email: maskEmail(recipient.email),
  }));
  const html = campaign.renderHtml({ siteUrl });
  const text = campaign.renderText({ siteUrl });

  if (mode === 'preview') {
    return NextResponse.json({
      blastId: campaign.id,
      subject: campaign.subject,
      previewText: campaign.previewText,
      siteUrl,
      recipientCount: recipients.length,
      confirmationPhrase: campaign.confirmationPhrase,
      sample,
      html,
      text,
    });
  }

  const resend = getResendClient();
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
  }

  if (mode === 'test') {
    const testEmail = body.testEmail?.trim();
    if (!testEmail || !isLikelyEmail(testEmail)) {
      return NextResponse.json({ error: 'Enter a valid test email' }, { status: 400 });
    }

    await sendMarketingEmail({
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html,
      text,
      campaign: `${campaign.id}-test`,
    });

    return NextResponse.json({
      sent: 1,
      recipientCount: recipients.length,
      sample,
    });
  }

  if (body.confirm !== campaign.confirmationPhrase) {
    return NextResponse.json({
      error: `Type "${campaign.confirmationPhrase}" to send this blast to all users.`,
      confirmationPhrase: campaign.confirmationPhrase,
      recipientCount: recipients.length,
    }, { status: 400 });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, recipientCount: 0 });
  }

  const chunks = chunk(recipients, BATCH_SIZE);
  let sent = 0;
  const batchIds: string[] = [];
  const { from, replyTo } = getMarketingEmailDefaults();

  for (let index = 0; index < chunks.length; index += 1) {
    const batch = chunks[index];
    const { data, error } = await resend.batch.send(
      batch.map(recipient => {
        const unsubscribeToken = createMarketingUnsubscribeToken({ userId: recipient.userId, email: recipient.email });
        const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
        return {
          from,
          to: [recipient.email],
          replyTo,
          subject: campaign.subject,
          html: campaign.renderHtml({
            recipientName: recipient.displayName,
            siteUrl,
            unsubscribeUrl,
          }),
          text: campaign.renderText({
            recipientName: recipient.displayName,
            siteUrl,
            unsubscribeUrl,
          }),
          headers: getMarketingHeaders(campaign.id, unsubscribeUrl),
          tags: getEmailTags('marketing', campaign.id, { user_id: recipient.userId }),
        };
      }),
      {
        batchValidation: 'strict',
        idempotencyKey: `${campaign.id}/chunk-${index + 1}`,
      },
    );

    if (error) {
      return NextResponse.json({
        error: error.message ?? JSON.stringify(error),
        sent,
        failedChunk: index + 1,
        recipientCount: recipients.length,
      }, { status: 502 });
    }

    const responseItems = Array.isArray(data) ? data as Array<{ id?: string }> : [];
    sent += batch.length;
    batchIds.push(...responseItems.map(item => item.id).filter((id): id is string => Boolean(id)));
  }

  return NextResponse.json({
    blastId: campaign.id,
    sent,
    recipientCount: recipients.length,
    batches: chunks.length,
    ids: batchIds,
  });
}

function getCampaignKey(campaign: unknown): Campaign {
  if (campaign === 'reactivation' || campaign === 'priceEstimator') return campaign;
  return 'correction';
}

function getCampaign(campaign: Campaign) {
  if (campaign === 'reactivation') {
    return {
      id: REACTIVATION_BLAST_ID,
      subject: REACTIVATION_BLAST_SUBJECT,
      previewText: REACTIVATION_BLAST_PREVIEW,
      confirmationPhrase: REACTIVATION_CONFIRMATION_PHRASE,
      renderHtml: renderReactivationBlastEmail,
      renderText: renderReactivationBlastText,
    };
  }

  if (campaign === 'priceEstimator') {
    return {
      id: PRICE_ESTIMATOR_BLAST_ID,
      subject: PRICE_ESTIMATOR_BLAST_SUBJECT,
      previewText: PRICE_ESTIMATOR_BLAST_PREVIEW,
      confirmationPhrase: PRICE_ESTIMATOR_CONFIRMATION_PHRASE,
      renderHtml: renderPriceEstimatorBlastEmail,
      renderText: renderPriceEstimatorBlastText,
    };
  }

  return {
    id: REACTIVATION_CORRECTION_BLAST_ID,
    subject: REACTIVATION_CORRECTION_SUBJECT,
    previewText: REACTIVATION_CORRECTION_PREVIEW,
    confirmationPhrase: CORRECTION_CONFIRMATION_PHRASE,
    renderHtml: renderReactivationCorrectionEmail,
    renderText: renderReactivationCorrectionText,
  };
}

function getPublicEmailSiteUrl(): string {
  const configured =
    process.env.EMAIL_BLAST_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://gopairph.com';
  const value = configured.replace(/\/$/, '');

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      url.protocol !== 'https:'
    ) {
      return 'https://gopairph.com';
    }
    return value;
  } catch {
    return 'https://gopairph.com';
  }
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true };
}

async function getBlastRecipients(service: ReturnType<typeof createServiceClient>): Promise<BlastRecipient[]> {
  const users: Array<{
    id: string;
    email?: string | null;
    user_metadata?: { full_name?: string | null; name?: string | null } | null;
  }> = [];
  const perPage = 1000;

  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const pageUsers = data.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
  }

  const ids = users.map(user => user.id);
  const profiles = new Map<string, ProfileLite>();
  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await service
      .from('profiles')
      .select('user_id, display_name, marketing_email_enabled')
      .in('user_id', idChunk);
    if (error) throw error;

    for (const profile of (data as ProfileLite[] | null) ?? []) {
      profiles.set(profile.user_id, profile);
    }
  }

  const seen = new Set<string>();
  const eligible = users
    .map(user => {
      const email = user.email?.trim().toLowerCase();
      if (!email || !isLikelyEmail(email) || seen.has(email)) return null;
      seen.add(email);
      const profile = profiles.get(user.id);
      if (!profile?.marketing_email_enabled) return null;
      return {
        userId: user.id,
        email,
        displayName: profile?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      };
    })
    .filter((recipient): recipient is BlastRecipient => Boolean(recipient));

  const suppressed = new Set<string>();
  for (const emailChunk of chunk(eligible.map(recipient => recipient.email), 100)) {
    const { data, error } = await service
      .from('email_suppressions')
      .select('email')
      .in('email', emailChunk);
    if (error) throw error;
    for (const row of data ?? []) suppressed.add(row.email.toLowerCase());
  }
  return eligible.filter(recipient => !suppressed.has(recipient.email));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
}
