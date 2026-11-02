import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { COIN_PACKS, coinReturnPath } from '@/lib/flashDeals';
import { checkoutSchema, paymongo, paymentConfiguration, paymentsEnabled, ProviderError, validCheckoutUrl } from '@/lib/payments/provider';
import { paymentUser } from '@/lib/payments/server';
import { getCoinPurchase, type CoinPurchase } from '@/lib/payments/coinPurchases';
export const runtime = 'nodejs';
export const maxDuration = 60;

const selection = z.object({ coins: z.number().int().refine(value => COIN_PACKS.some(pack => pack.coins === value)), returnPath: z.string().max(500).optional() });

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = selection.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose one of the available GP Coin packs.' }, { status: 400 });
  const auth = await paymentUser();
  if (!auth) return NextResponse.json({ error: 'Please sign in before buying GP Coins.' }, { status: 401 });
  let config;
  try { if (!paymentsEnabled()) throw Error(); config = paymentConfiguration(); }
  catch { return NextResponse.json({ error: 'Coin checkout is not available right now. Your earned coins still work for Flash Deals.' }, { status: 503 }); }
  const service = createServiceClient();
  const { data, error } = await service.rpc('create_gp_coin_purchase', {
    p_profile: auth.profile.id, p_coins: parsed.data.coins, p_live: config.live, p_return: coinReturnPath(parsed.data.returnPath),
  });
  if (error) return NextResponse.json({ error: error.code === 'PGRST202' ? 'Coin purchases are not available yet. Please try again later.' : error.message }, { status: 409 });
  const purchase = data as CoinPurchase & { create_checkout: boolean };
  const statusUrl = `/coins?order=${purchase.id}`;
  try {
    if (purchase.checkout_url && validCheckoutUrl(purchase.checkout_url)) return NextResponse.json({ checkoutUrl: purchase.checkout_url, statusUrl });
    if (!purchase.create_checkout) return NextResponse.json({ statusUrl });
    if (purchase.amount_minor !== purchase.coins * 50 || !COIN_PACKS.some(pack => pack.coins === purchase.coins)) throw new Error('Order amount mismatch.');
    const session = checkoutSchema.parse(await paymongo('/v2/checkout_sessions', {
      line_items: [{ name: `${purchase.coins} GP Coins — Go Pair PH promotion credits`, amount: purchase.amount_minor, currency: 'PHP', quantity: 1 }],
      reference_number: purchase.id, metadata: { gopairph_coin_purchase_id: purchase.id }, payment_method_types: config.methods,
      success_url: `${config.siteUrl}${statusUrl}&payment=return`, cancel_url: `${config.siteUrl}${statusUrl}&payment=cancelled`,
      description: 'One-time purchase of Go Pair PH promotional credits. Not a payment for shoes.',
      pass_on_fees: false, send_email_receipt: true, billing: { email: auth.user.email },
    })).data;
    const url = session.attributes.checkout_url ?? '';
    if (session.attributes.livemode !== config.live || !validCheckoutUrl(url)
      || (session.attributes.reference_number && session.attributes.reference_number !== purchase.id)) throw new Error('Unexpected checkout.');
    const { error: attachError } = await service.rpc('attach_gp_coin_checkout', { p_id: purchase.id, p_checkout: session.id, p_url: url, p_live: config.live });
    if (attachError) {
      if ((await getCoinPurchase(purchase.id))?.paid_at) return NextResponse.json({ statusUrl });
      throw new Error('Could not attach checkout.');
    }
    return NextResponse.json({ checkoutUrl: url, statusUrl });
  } catch (failure) {
    if (failure instanceof ProviderError && [400,401,403,404,422].includes(failure.status)) {
      await service.rpc('expire_gp_coin_purchase', { p_id: purchase.id, p_checkout: null, p_live: purchase.livemode });
    }
    // Never create another charge after an ambiguous network failure.
    console.error('[coins] checkout needs a status check', purchase.id);
    return NextResponse.json({ statusUrl }, { status: 202 });
  }
}
