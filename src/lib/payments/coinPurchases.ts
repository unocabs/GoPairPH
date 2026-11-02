import 'server-only';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { checkoutSchema, paymongo, paymentConfiguration, ProviderError } from './provider';

export interface CoinPurchase {
  id: string;
  profile_id: string;
  coins: number;
  amount_minor: number;
  currency: 'PHP';
  livemode: boolean;
  status: 'creating' | 'pending' | 'paid' | 'expired' | 'review' | 'refunded';
  provider_checkout_id: string | null;
  provider_payment_id: string | null;
  checkout_url: string | null;
  return_path: string;
  paid_at: string | null;
  created_at: string;
  refunded_amount_minor: number;
  review_note: string | null;
}

export async function getCoinPurchase(id: string): Promise<CoinPurchase | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { data, error } = await createServiceClient().from('gp_coin_purchases').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Coin purchases are temporarily unavailable. Please try again later.');
  return data as CoinPurchase | null;
}

export async function reviewCoinPurchase(id: string, note: string) {
  const { error } = await createServiceClient().rpc('review_gp_coin_purchase', { p_id: id, p_note: note });
  if (error) throw new Error('Could not record payment review.');
}

export async function verifyCoinCheckout(checkoutId: string, expectedId?: string) {
  if (!/^cs_[A-Za-z0-9]+$/.test(checkoutId)) throw new Error('Invalid checkout ID.');
  const config = paymentConfiguration();
  const session = checkoutSchema.parse(await paymongo(`/v1/checkout_sessions/${checkoutId}`)).data;
  if (session.id !== checkoutId || session.attributes.livemode !== config.live) throw new Error('Checkout environment mismatch.');
  const id = z.string().uuid().parse(session.attributes.reference_number);
  if (expectedId && id !== expectedId) throw new Error('Order mismatch.');
  const purchase = await getCoinPurchase(id);
  if (!purchase) return null;
  if (purchase.livemode !== config.live || (purchase.provider_checkout_id && purchase.provider_checkout_id !== checkoutId)) throw new Error('Checkout mismatch.');
  const paid = session.attributes.payments?.filter(item => item.attributes.status === 'paid') ?? [];
  if (paid.length > 1) throw new Error('Unexpected multiple payments.');
  const service = createServiceClient();
  if (paid.length) {
    const item = paid[0];
    if (item.attributes.amount !== purchase.amount_minor || item.attributes.currency !== 'PHP' || item.attributes.livemode !== config.live) throw new Error('Payment amount mismatch.');
    const { error } = await service.rpc('fulfill_gp_coin_purchase', {
      p_id: purchase.id, p_checkout: session.id, p_payment: item.id, p_amount: item.attributes.amount,
      p_currency: item.attributes.currency, p_live: config.live, p_method: item.attributes.source?.type ?? null,
      p_review: Boolean(item.attributes.disputed || item.attributes.refunded || item.attributes.refunds?.length),
    });
    if (error) throw new Error('Could not add purchased coins.');
    if (item.attributes.disputed || item.attributes.refunded || item.attributes.refunds?.length) {
      await reviewCoinPurchase(purchase.id, 'PayMongo reports a refund or dispute. Contact support for review.');
      for (const refund of item.attributes.refunds ?? []) {
        const parsed = z.union([z.string().regex(/^ref_[A-Za-z0-9]+$/), z.object({ id: z.string().regex(/^ref_[A-Za-z0-9]+$/) })]).safeParse(refund);
        if (parsed.success) await verifyCoinRefund(typeof parsed.data === 'string' ? parsed.data : parsed.data.id);
      }
    }
  } else {
    const items = session.attributes.line_items;
    if (!purchase.provider_checkout_id && (!items?.length || items.some(item => item.currency !== 'PHP')
      || items.reduce((sum, item) => sum + item.amount * item.quantity, 0) !== purchase.amount_minor)) throw new Error('Checkout amount mismatch.');
    if (session.attributes.status === 'expired' && purchase.provider_checkout_id) {
      const { error } = await service.rpc('expire_gp_coin_purchase', { p_id: purchase.id, p_checkout: session.id, p_live: config.live });
      if (error) throw new Error('Could not close checkout.');
    }
  }
  return { purchase, session };
}

export async function reconcileCoinPurchase(purchase: CoinPurchase, cancel = false) {
  if (purchase.status === 'refunded' || purchase.status === 'expired') return;
  if (!purchase.provider_checkout_id) {
    if (!purchase.paid_at && Date.now() - Date.parse(purchase.created_at) > 60_000)
      await reviewCoinPurchase(purchase.id, 'Checkout creation needs a status check. Please contact support with your reference before trying to pay again.');
    return;
  }
  const { data: claimed, error } = await createServiceClient().from('gp_coin_purchases')
    .update({ last_checked_at: new Date().toISOString() }).eq('id', purchase.id)
    .or(`last_checked_at.is.null,last_checked_at.lt.${new Date(Date.now() - 10_000).toISOString()}`).select('id');
  if (error) throw new Error('Could not check payment.');
  if (!claimed?.length) return;
  const result = await verifyCoinCheckout(purchase.provider_checkout_id, purchase.id);
  if (!result || result.session.attributes.payments?.some(item => item.attributes.status === 'paid') || result.session.attributes.status === 'expired') return;
  if (cancel || Date.now() - Date.parse(purchase.created_at) > 20 * 60_000) {
    try { await paymongo(`/v1/checkout_sessions/${purchase.provider_checkout_id}/expire`, undefined, true); }
    catch (failure) { if (!(failure instanceof ProviderError && failure.status === 400)) throw failure; }
    await verifyCoinCheckout(purchase.provider_checkout_id, purchase.id);
  }
}

export async function verifyCoinRefund(refundId: string) {
  if (!/^ref_[A-Za-z0-9]+$/.test(refundId)) return;
  const refund = z.object({ data: z.object({ id: z.string(), attributes: z.object({
    payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/), status: z.string(), amount: z.number().int().positive(), currency: z.literal('PHP'), livemode: z.boolean(),
  }) }) }).parse(await paymongo(`/v1/refunds/${refundId}`)).data;
  if (refund.id !== refundId || refund.attributes.livemode !== paymentConfiguration().live) throw new Error('Refund mismatch.');
  if (refund.attributes.status !== 'succeeded') return;
  const { error } = await createServiceClient().rpc('record_gp_coin_purchase_refund', {
    p_payment: refund.attributes.payment_id, p_refund: refundId, p_amount: refund.attributes.amount, p_live: refund.attributes.livemode,
  });
  if (error) throw new Error('Could not record coin refund.');
}
