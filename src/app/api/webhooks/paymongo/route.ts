import { NextResponse } from 'next/server';
import { parsePaymongoEvent, paymentConfiguration, readWebhookBody, verifyPaymongoSignature } from '@/lib/payments/provider';
import { flagPaymentReview, verifyCheckout, verifyRefund } from '@/lib/payments/server';
import { createServiceClient } from '@/lib/supabase/server';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  let config;
  try { config = paymentConfiguration(); } catch { return new Response('Webhook is not configured', { status: 503 }); }
  let raw: string;
  try { raw = await readWebhookBody(request); } catch { return new Response('Invalid body', { status: 413 }); }
  if (!verifyPaymongoSignature(raw, request.headers.get('paymongo-signature') ?? '', config.secret, config.live)) return new Response('Invalid signature', { status: 400 });
  let event;
  try { event = parsePaymongoEvent(JSON.parse(raw)); } catch { return new Response('Invalid event', { status: 400 }); }
  if (event.attributes.livemode !== config.live) return new Response('Invalid environment', { status: 400 });
  try {
    const { type, data } = event.attributes;
    if (type === 'checkout_session.payment.paid') await verifyCheckout(data.id, event.id);
    else if (type.includes('refund') || type.includes('dispute')) {
      const paymentId = String(data.attributes.payment_id ?? (data.id.startsWith('pay_') ? data.id : ''));
      const checkoutId = data.attributes.checkout_session_id;
      if (typeof checkoutId === 'string') await verifyCheckout(checkoutId);
      if (data.id.startsWith('ref_')) await verifyRefund(data.id);
      const { data: payment, error: paymentError } = await createServiceClient().from('promotion_payments').select('id,provider_checkout_id').eq('provider_payment_id', paymentId).maybeSingle();
      if (paymentError) throw new Error('Could not find refund payment');
      if (payment && !data.id.startsWith('ref_')) {
        await flagPaymentReview(payment.id, `PayMongo ${type}. Check refund/dispute details in the merchant dashboard.`);
        // The dashboard exposes payment.refunded/payment.refund.updated, which
        // may carry a payment resource. Re-fetch its stored checkout and verify
        // each refund rather than relying on a refund.succeeded subscription.
        if (type.includes('refund') && payment.provider_checkout_id) await verifyCheckout(payment.provider_checkout_id);
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error('[paymongo] webhook processing failed', event.id);
    return new Response('Retry later', { status: 500 });
  }
}
