import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getPayment, paymentUser, reconcilePayment } from '@/lib/payments/server';
import { isAwaitingPayment } from '@/lib/payments/types';
import { validCheckoutUrl } from '@/lib/payments/provider';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await paymentUser();
  if (!auth) return NextResponse.json({ error: 'Please sign in to view this payment.' }, { status: 401 });
  let payment = await getPayment(params.id);
  if (!payment || (payment.seller_id !== auth.profile.id && !auth.profile.is_admin)) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (body?.action && !['check', 'cancel'].includes(body.action)) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  let warning: string | null = null;
  try {
    if (isAwaitingPayment(payment) || (payment.provider === 'paymongo' && payment.status !== 'refunded')) await reconcilePayment(payment, body?.action === 'cancel');
  } catch { warning = 'Confirmation is taking longer. If you paid, please avoid paying again. You can refresh status or contact support.'; }
  payment = await getPayment(params.id);
  if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  const { data: placement } = await createServiceClient().from(payment.placement === 'featured' ? 'featured_promotion_orders' : 'sponsored_promotion_orders')
    .select('status,scheduled_start_at,scheduled_end_at').eq('id', payment.featured_order_id ?? payment.sponsored_order_id).maybeSingle();
  return NextResponse.json({ payment: { ...payment, checkout_url: payment.checkout_url && validCheckoutUrl(payment.checkout_url) ? payment.checkout_url : null }, placement, warning }, { headers: { 'Cache-Control': 'no-store' } });
}
