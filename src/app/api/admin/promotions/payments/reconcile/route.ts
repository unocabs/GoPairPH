import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { paymentUser, reconcilePayment } from '@/lib/payments/server';
import { sendPromotionPaymentEmail } from '@/lib/payments/notifications';
import type { PromotionPayment } from '@/lib/payments/types';
import { reconcileCoinPurchase, type CoinPurchase } from '@/lib/payments/coinPurchases';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const cron = secret && request.headers.get('authorization') === `Bearer ${secret}`;
  if (!cron && !(await paymentUser())?.profile.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const started = Date.now();
  const service = createServiceClient();
  const live = process.env.PAYMONGO_MODE === 'live';
  const { data, error } = await service.from('promotion_payments').select('*').eq('livemode', live)
    .is('paid_at', null).in('status', ['creating', 'pending', 'review']).order('last_checked_at', { nullsFirst: true }).order('created_at').limit(3);
  if (error) return NextResponse.json({ error: 'Could not load pending payments.' }, { status: 500 });
  let checked = 0;
  for (const payment of (data ?? []) as PromotionPayment[]) {
    if (Date.now() - started > 20_000) break;
    try { await reconcilePayment(payment); checked++; }
    catch { console.warn('[payments] reconciliation pending', payment.id); }
    // Rotate unresolved creations too, so one missing checkout cannot starve others.
    await service.from('promotion_payments').update({ last_checked_at: new Date().toISOString() }).eq('id', payment.id);
  }
  const { error: syncError } = await service.rpc('reconcile_promotion_payment_placements');
  if (syncError) return NextResponse.json({ error: 'Placement review synchronization failed.' }, { status: 500 });
  if (Date.now() - started < 15_000) {
    const { data: paid } = await service.from('promotion_payments').select('*').eq('livemode', live).eq('provider', 'paymongo')
      .not('paid_at', 'is', null).in('status', ['paid', 'review']).order('last_checked_at', { nullsFirst: true }).limit(1);
    for (const payment of (paid ?? []) as PromotionPayment[]) {
      await reconcilePayment(payment).catch(() => console.warn('[payments] refund check pending', payment.id));
    }
  }
  if (Date.now() - started < 35_000) {
    const { data: unsent } = await service.from('promotion_payments').select('id').not('paid_at', 'is', null).is('notified_at', null).in('status', ['paid', 'review']).order('created_at').limit(3);
    for (const row of unsent ?? []) {
      if (Date.now() - started > 40_000) break;
      await sendPromotionPaymentEmail(row.id).catch(() => console.warn('[payments] email retry pending', row.id));
    }
  }
  let coinsChecked = 0;
  if (Date.now() - started < 40_000) {
    const { data: coinPurchases, error: coinError } = await service.from('gp_coin_purchases').select('*').eq('livemode',live)
      .in('status',['creating','pending','review','paid']).order('last_checked_at',{nullsFirst:true}).order('created_at').limit(2);
    if (coinError) return NextResponse.json({ error: 'Could not load coin purchases for verification.' }, { status: 500 });
    for (const purchase of (coinPurchases ?? []) as CoinPurchase[]) {
      if (Date.now() - started > 42_000) break;
      await reconcileCoinPurchase(purchase).then(() => { coinsChecked++; }).catch(() => console.warn('[coins] reconciliation pending',purchase.id));
      await service.from('gp_coin_purchases').update({last_checked_at:new Date().toISOString()}).eq('id',purchase.id);
    }
  }
  return NextResponse.json({ checked, coinsChecked });
}
export const GET = run;
export const POST = run;
