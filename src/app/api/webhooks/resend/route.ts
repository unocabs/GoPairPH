import { NextResponse } from 'next/server';
import { getResendClient, getTransactionalEmailDefaults } from '@/lib/email/resend';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    tags?: Record<string, string>;
    bounce?: { type?: string; subType?: string; message?: string };
    suppressed?: { type?: string; message?: string };
    [key: string]: unknown;
  };
}

export async function POST(request: Request) {
  const client = getResendClient();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!client || !webhookSecret) {
    console.error('[resend-webhook] Resend client or webhook secret is not configured');
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  const payload = await request.text();
  const webhookEventId = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!webhookEventId || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
  }

  let event: ResendWebhookEvent;
  try {
    event = client.webhooks.verify({
      payload,
      headers: { id: webhookEventId, timestamp, signature },
      webhookSecret,
    }) as unknown as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const resendEmailId = event.data.email_id;
  const recipients = Array.from(new Set((event.data.to ?? []).map(email => email.trim().toLowerCase()).filter(Boolean)));
  if (!resendEmailId || recipients.length === 0) {
    return NextResponse.json({ received: true, recorded: 0 });
  }

  const service = createServiceClient();
  if (event.type === 'email.received') {
    return forwardInboundEmail({
      client,
      service,
      event,
      webhookEventId,
      resendEmailId,
      recipients,
    });
  }

  const eventRows = recipients.map(recipient => ({
    webhook_event_id: webhookEventId,
    resend_email_id: resendEmailId,
    event_type: event.type,
    recipient,
    occurred_at: event.created_at,
    payload: event,
  }));
  const { error: eventError } = await service
    .from('email_delivery_events')
    .upsert(eventRows, { onConflict: 'webhook_event_id,recipient', ignoreDuplicates: true });
  if (eventError) {
    console.error('[resend-webhook] event insert failed', eventError);
    return NextResponse.json({ error: 'Could not record webhook' }, { status: 500 });
  }

  const suppressionReason = getSuppressionReason(event);
  if (suppressionReason) {
    const suppressionRows = recipients.map(email => ({
      email,
      reason: suppressionReason,
      resend_email_id: resendEmailId,
      details: event.data,
      updated_at: new Date().toISOString(),
    }));
    const { error: suppressionError } = await service
      .from('email_suppressions')
      .upsert(suppressionRows, { onConflict: 'email' });
    if (suppressionError) {
      console.error('[resend-webhook] suppression upsert failed', suppressionError);
      return NextResponse.json({ error: 'Could not update suppressions' }, { status: 500 });
    }

    const userId = event.data.tags?.user_id;
    if (event.type === 'email.complained' && userId) {
      await service
        .from('profiles')
        .update({ marketing_email_enabled: false, marketing_email_unsubscribed_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
  }

  return NextResponse.json({ received: true, recorded: recipients.length });
}

async function forwardInboundEmail({
  client,
  service,
  event,
  webhookEventId,
  resendEmailId,
  recipients,
}: {
  client: NonNullable<ReturnType<typeof getResendClient>>;
  service: ReturnType<typeof createServiceClient>;
  event: ResendWebhookEvent;
  webhookEventId: string;
  resendEmailId: string;
  recipients: string[];
}) {
  const allowedRecipients = new Set(['hello@gopairph.com', 'dmarc@gopairph.com']);
  const matchedRecipients = recipients.filter(recipient => allowedRecipients.has(recipient));
  if (matchedRecipients.length === 0) {
    console.warn('[resend-webhook] ignored inbound email for an unconfigured address', recipients);
    return NextResponse.json({ received: true, forwarded: false });
  }

  const destination = process.env.EMAIL_FORWARD_TO?.trim();
  if (!destination) {
    console.error('[resend-webhook] EMAIL_FORWARD_TO is not configured');
    return NextResponse.json({ error: 'Inbound forwarding is not configured' }, { status: 503 });
  }

  const { data: existing } = await service
    .from('email_delivery_events')
    .select('id')
    .eq('webhook_event_id', webhookEventId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true, forwarded: true, duplicate: true });
  }

  const { from } = getTransactionalEmailDefaults();
  const { error: forwardError } = await client.emails.receiving.forward({
    emailId: resendEmailId,
    to: destination,
    from,
  });
  if (forwardError) {
    console.error('[resend-webhook] inbound forwarding failed', forwardError);
    return NextResponse.json({ error: 'Could not forward inbound email' }, { status: 502 });
  }

  const eventRows = matchedRecipients.map(recipient => ({
    webhook_event_id: webhookEventId,
    resend_email_id: resendEmailId,
    event_type: event.type,
    recipient,
    occurred_at: event.created_at,
    payload: event,
  }));
  const { error: eventError } = await service
    .from('email_delivery_events')
    .upsert(eventRows, { onConflict: 'webhook_event_id,recipient', ignoreDuplicates: true });
  if (eventError) {
    console.error('[resend-webhook] inbound event insert failed after forwarding', eventError);
  }

  return NextResponse.json({ received: true, forwarded: true });
}

function getSuppressionReason(event: ResendWebhookEvent): 'complaint' | 'permanent_bounce' | 'provider_suppression' | null {
  if (event.type === 'email.complained') return 'complaint';
  if (event.type === 'email.suppressed') return 'provider_suppression';
  if (event.type === 'email.bounced' && event.data.bounce?.type?.toLowerCase() === 'permanent') {
    return 'permanent_bounce';
  }
  return null;
}
