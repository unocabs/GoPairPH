import { NextResponse } from 'next/server';
import { paymentUser } from '@/lib/payments/server';
import { getCoinPurchase, reconcileCoinPurchase } from '@/lib/payments/coinPurchases';
import { createServiceClient } from '@/lib/supabase/server';
import { validCheckoutUrl } from '@/lib/payments/provider';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await paymentUser();
  if (!auth) return NextResponse.json({ error: 'Please sign in to check this purchase.' }, { status: 401 });
  const purchase = await getCoinPurchase(params.id);
  if (!purchase || (purchase.profile_id !== auth.profile.id && !auth.profile.is_admin)) return NextResponse.json({ error: 'Purchase not found.' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (body?.action && !['check','cancel'].includes(body.action)) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  let warning: string | null = null;
  try { await reconcileCoinPurchase(purchase, body?.action === 'cancel'); }
  catch { warning = 'Payment confirmation is taking longer. If you paid, please avoid paying again. Check again or contact support with your reference.'; }
  const [fresh, wallet] = await Promise.all([
    getCoinPurchase(purchase.id),
    createServiceClient().from('gp_coin_wallets').select('available_balance,locked_at').eq('profile_id', purchase.profile_id).maybeSingle(),
  ]);
  return NextResponse.json({ purchase: fresh ? { ...fresh, checkout_url: fresh.checkout_url && validCheckoutUrl(fresh.checkout_url) ? fresh.checkout_url : null } : null,
    balance: wallet.data?.available_balance ?? 0, locked: Boolean(wallet.data?.locked_at), warning }, { headers: { 'Cache-Control': 'no-store' } });
}
