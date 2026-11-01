import { NextResponse } from 'next/server';
import {
  parsePaymongoEvent,
  paymentConfiguration,
  readWebhookBody,
  verifyPaymongoSignature,
} from '@/lib/payments/provider';
import {
  verifyEstimatorCheckout,
  verifyEstimatorRefund,
} from '@/lib/pricing/estimatorPayments';
import { createServiceClient } from '@/lib/supabase/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.ESTIMATOR_PAYMONGO_WEBHOOK_SECRET;
  let config;
  try {
    config = paymentConfiguration();
  } catch {
    return new Response('Unconfigured', { status: 503 });
  }
  if (!secret) return new Response('Unconfigured', { status: 503 });
  let raw;
  try {
    raw = await readWebhookBody(request);
  } catch {
    return new Response('Invalid body', { status: 413 });
  }
  if (
    !verifyPaymongoSignature(
      raw,
      request.headers.get('paymongo-signature') ?? '',
      secret,
      config.live,
    )
  )
    return new Response('Invalid signature', { status: 400 });
  let event;
  try {
    event = parsePaymongoEvent(JSON.parse(raw));
  } catch {
    return new Response('Invalid event', { status: 400 });
  }
  if (event.attributes.livemode !== config.live)
    return new Response('Invalid environment', { status: 400 });
  try {
    const { type, data } = event.attributes;
    if (type === 'checkout_session.payment.paid')
      await verifyEstimatorCheckout(data.id);
    else if (type.includes('refund') && data.id.startsWith('ref_'))
      await verifyEstimatorRefund(data.id);
    else if (type.includes('refund') || type.includes('dispute')) {
      const paymentId = String(
        data.attributes.payment_id ??
          (data.id.startsWith('pay_') ? data.id : ''),
      );
      const { data: payment, error } = await createServiceClient()
        .from('estimator_payments')
        .select('provider_checkout_id')
        .eq('provider_payment_id', paymentId)
        .maybeSingle();
      if (error) throw Error('Could not resolve payment.');
      if (payment?.provider_checkout_id)
        await verifyEstimatorCheckout(payment.provider_checkout_id);
    }
    return NextResponse.json({ received: true });
  } catch {
    return new Response('Retry later', { status: 500 });
  }
}
