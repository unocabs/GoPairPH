import 'server-only';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkoutSchema, paymongo, paymentConfiguration, ProviderError } from './provider';
import { isAwaitingPayment, type PromotionPayment } from './types';
import { z } from 'zod';
import { sendPromotionPaymentEmail } from './notifications';

export async function paymentUser() {
  const client = createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await client.from('profiles').select('id,is_admin').eq('user_id', user.id).maybeSingle();
  return profile ? { user, profile } : null;
}

export async function getPayment(id: string): Promise<PromotionPayment | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { data, error } = await createServiceClient().from('promotion_payments').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Could not load payment.');
  return data as PromotionPayment | null;
}

export async function fulfillPayment(payment: PromotionPayment, checkout: string | null, providerPayment: string | null, eventId: string, method: string | null) {
  const { error } = await createServiceClient().rpc('fulfill_promotion_payment', {
    p_id: payment.id, p_checkout: checkout, p_payment: providerPayment, p_amount: payment.amount_minor,
    p_currency: 'PHP', p_live: payment.livemode, p_event: eventId, p_method: method,
  });
  if (error) throw new Error('Payment fulfillment failed.');
  // Email retries are independent of fulfillment; an email failure cannot undo a payment.
  await sendPromotionPaymentEmail(payment.id).catch(() => console.error('[payments] confirmation email pending'));
}

export async function verifyCheckout(checkoutId: string, eventId?: string, expectedId?: string) {
  if (!/^cs_[A-Za-z0-9]+$/.test(checkoutId)) throw new Error('Invalid checkout ID.');
  const live = paymentConfiguration().live;
  const session = checkoutSchema.parse(await paymongo(`/v1/checkout_sessions/${checkoutId}`)).data;
  if (session.id !== checkoutId || session.attributes.livemode !== live) throw new Error('Checkout environment mismatch.');
  const id = z.string().uuid().parse(session.attributes.reference_number);
  if (expectedId && id !== expectedId) throw new Error('Order mismatch.');
  const payment = await getPayment(id);
  if (!payment) return null; // Another application may share the merchant account.
  if (payment.provider !== 'paymongo' || payment.livemode !== live || (payment.provider_checkout_id && payment.provider_checkout_id !== checkoutId)) throw new Error('Checkout mismatch.');
  const paid = session.attributes.payments?.filter(item => item.attributes.status === 'paid') ?? [];
  if (paid.length > 1) throw new Error('Unexpected multiple paid payments.');
  if (!paid.length && !payment.provider_checkout_id) {
    const items = session.attributes.line_items;
    if (!items?.length || items.some(item => item.currency !== 'PHP') || items.reduce((sum, item) => sum + item.amount * item.quantity, 0) !== payment.amount_minor) throw new Error('Checkout amount mismatch.');
  }
  if (paid.length) {
    const item = paid[0];
    if (item.attributes.amount !== payment.amount_minor || item.attributes.currency !== 'PHP' || item.attributes.livemode !== live) throw new Error('Payment amount mismatch.');
    await fulfillPayment(payment, session.id, item.id, eventId ?? `reconcile:${item.id}`, item.attributes.source?.type ?? null);
    if (item.attributes.disputed || item.attributes.refunded || item.attributes.refunds?.length) {
      await flagPaymentReview(payment.id, 'PayMongo reports a refund or dispute. Check the merchant dashboard.');
      for (const refund of item.attributes.refunds ?? []) {
        const parsed = z.union([z.string().regex(/^ref_[A-Za-z0-9]+$/), z.object({ id: z.string().regex(/^ref_[A-Za-z0-9]+$/) })]).safeParse(refund);
        if (parsed.success) await verifyRefund(typeof parsed.data === 'string' ? parsed.data : parsed.data.id);
      }
    }
  } else if (session.attributes.status === 'expired' && payment.provider_checkout_id) {
    const { error } = await createServiceClient().rpc('expire_promotion_payment', { p_id: id, p_checkout: checkoutId, p_live: live });
    if (error) throw new Error('Could not release expired checkout.');
  }
  return { payment, session };
}

export async function flagPaymentReview(id: string, note: string) {
  const { error } = await createServiceClient().from('promotion_payments')
    .update({ status: 'review', review_note: note.slice(0, 1000) }).eq('id', id).neq('status', 'refunded').neq('status', 'expired');
  if (error) throw new Error('Could not record payment review.');
}

export async function reconcilePayment(payment: PromotionPayment, cancel = false) {
  if (payment.provider === 'gp_coins') {
    if (isAwaitingPayment(payment)) await fulfillPayment(payment, null, null, `coins:${payment.id}`, 'gp_coins');
    return;
  }
  if (!payment.provider_checkout_id) {
    if (Date.now() - Date.parse(payment.created_at) > 60_000) {
      await flagPaymentReview(payment.id, 'Checkout creation is unresolved. Locate the provider session by this order reference before retrying or releasing holds.');
    }
    return;
  }
  // Claim a short lease in one query, so multiple tabs/cron do not flood PayMongo.
  const service = createServiceClient();
  const now = new Date().toISOString();
  const { data: claimed, error } = await service.from('promotion_payments').update({ last_checked_at: now })
    .eq('id', payment.id).or(`last_checked_at.is.null,last_checked_at.lt.${new Date(Date.now() - 10_000).toISOString()}`).select('id');
  if (error) throw new Error('Could not check payment.');
  if (!claimed?.length) return;
  const result = await verifyCheckout(payment.provider_checkout_id, undefined, payment.id);
  if (!result) return;
  const attributes = result.session.attributes;
  if (attributes.payments?.some(item => item.attributes.status === 'paid') || attributes.status === 'expired') return;
  if (cancel || Date.parse(payment.expires_at) <= Date.now()) {
    try {
      await paymongo(`/v1/checkout_sessions/${payment.provider_checkout_id}/expire`, undefined, true);
    } catch (error) {
      // 400 includes an ongoing or completed payment. Retrieve again; never release
      // capacity or coins merely because the local reservation timer elapsed.
      if (!(error instanceof ProviderError && error.status === 400)) throw error;
    }
    await verifyCheckout(payment.provider_checkout_id, undefined, payment.id);
  }
}

export async function verifyRefund(refundId: string) {
  if (!/^ref_[A-Za-z0-9]+$/.test(refundId)) return;
  const refund = z.object({ data: z.object({ id: z.string(), attributes: z.object({
    payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/), status: z.string(), amount: z.number().int().positive(), currency: z.literal('PHP'), livemode: z.boolean(),
  }) }) }).parse(await paymongo(`/v1/refunds/${refundId}`)).data;
  if (refund.id !== refundId || refund.attributes.livemode !== paymentConfiguration().live) throw new Error('Refund mismatch.');
  if (refund.attributes.status !== 'succeeded') return;
  const { error } = await createServiceClient().rpc('record_promotion_refund', {
    p_payment: refund.attributes.payment_id, p_refund: refundId, p_amount: refund.attributes.amount, p_live: refund.attributes.livemode,
  });
  if (error) throw new Error('Could not record refund.');
}
