import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { checkoutSchema, paymongo, paymentConfiguration, paymentsEnabled, validCheckoutUrl, ProviderError } from '@/lib/payments/provider';
import { fulfillPayment, getPayment, paymentUser } from '@/lib/payments/server';
import type { PromotionPayment } from '@/lib/payments/types';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const selection = z.object({ listingId: z.string().uuid(), placement: z.enum(['featured', 'top_pick']), durationDays: z.union([z.literal(7), z.literal(30)]), coinsToUse: z.number().int().min(0).max(300).refine(value => value % 2 === 0).default(0) });

export async function GET() {
  let methods: string[] = [];
  try { if (paymentsEnabled()) methods = paymentConfiguration().labels; } catch { /* Fail closed until configured. */ }
  return NextResponse.json({ enabled: methods.length > 0, methods }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = selection.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid listing, placement, duration, and GP Coin amount.' }, { status: 400 });
  const auth = await paymentUser();
  if (!auth) return NextResponse.json({ error: 'Please sign in before starting checkout.' }, { status: 401 });
  const body = parsed.data;
  const price = body.placement === 'featured' ? (body.durationDays === 7 ? 50 : 150) : (body.durationDays === 7 ? 30 : 100);
  if ((body.placement === 'top_pick' && body.coinsToUse !== 0) || body.coinsToUse > price * 2) return NextResponse.json({ error: 'Invalid GP Coin amount.' }, { status: 400 });
  const coinOnly = body.coinsToUse === price * 2;
  let config: ReturnType<typeof paymentConfiguration> | null = null;
  if (!coinOnly) {
    try { if (!paymentsEnabled()) throw new Error(); config = paymentConfiguration(); }
    catch { return NextResponse.json({ error: 'PayMongo checkout is not available yet. Please try again later.' }, { status: 503 }); }
  }
  const mode = process.env.PAYMONGO_MODE;
  if (!['test', 'live'].includes(mode ?? '')) return NextResponse.json({ error: 'Promotion checkout is not configured yet.' }, { status: 503 });
  const service = createServiceClient();
  const { data, error } = await service.rpc('create_promotion_checkout', { p_seller: auth.profile.id, p_listing: body.listingId, p_placement: body.placement, p_days: body.durationDays, p_coins: body.coinsToUse, p_live: mode === 'live' });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  const payment = data as PromotionPayment & { create_checkout: boolean };
  const statusUrl = `/promotions/payments?order=${payment.id}`;
  try {
    if (payment.provider === 'gp_coins') {
      await fulfillPayment(payment, null, null, `coins:${payment.id}`, 'gp_coins');
      return NextResponse.json({ statusUrl });
    }
    if (payment.checkout_url && validCheckoutUrl(payment.checkout_url)) return NextResponse.json({ checkoutUrl: payment.checkout_url, statusUrl });
    if (!payment.create_checkout) return NextResponse.json({ statusUrl });
    if (!config || payment.amount_minor !== (price - body.coinsToUse / 2) * 100) throw new Error('Order amount mismatch');
    const session = checkoutSchema.parse(await paymongo('/v2/checkout_sessions', {
      line_items: [{ name: `Go Pair PH ${body.placement === 'featured' ? 'Featured' : 'Top Pick'}: ${body.durationDays} days`, amount: payment.amount_minor, currency: 'PHP', quantity: 1 }],
      payment_method_types: config.methods, reference_number: payment.id, metadata: { gopairph_payment_id: payment.id },
      success_url: `${config.siteUrl}${statusUrl}&payment=return`, cancel_url: `${config.siteUrl}${statusUrl}&payment=cancelled`,
      description: 'Running shoe listing promotion. One-time payment.', pass_on_fees: false, send_email_receipt: true,
      billing: { email: auth.user.email },
    })).data;
    const url = session.attributes.checkout_url ?? '';
    if (session.attributes.livemode !== config.live || !validCheckoutUrl(url) || (session.attributes.reference_number && session.attributes.reference_number !== payment.id)) throw new Error('Unexpected checkout');
    const { error: attachError } = await service.rpc('attach_promotion_checkout', { p_id: payment.id, p_checkout: session.id, p_url: url, p_live: config.live });
    if (attachError) {
      const fresh = await getPayment(payment.id);
      if (fresh?.paid_at) return NextResponse.json({ statusUrl });
      throw new Error('Could not attach checkout');
    }
    return NextResponse.json({ checkoutUrl: url, statusUrl });
  } catch (failure) {
    if (failure instanceof ProviderError && [400, 401, 403, 404, 422].includes(failure.status)) {
      const { error: releaseError } = await service.rpc('expire_promotion_payment', { p_id: payment.id, p_checkout: null, p_live: payment.livemode });
      if (releaseError) console.error('[payments] rejected checkout release pending', payment.id);
      return NextResponse.json({ statusUrl, error: 'PayMongo could not open checkout. Please check payment status.' }, { status: 202 });
    }
    console.error('[payments] checkout needs reconciliation', payment.id);
    // Keep the order and holds. The provider may have created a payable session.
    return NextResponse.json({ statusUrl, error: 'Checkout needs a status check. Please avoid starting another payment.' }, { status: 202 });
  }
}
