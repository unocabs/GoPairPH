import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { flagPaymentReview, getPayment, paymentUser, reconcilePayment, verifyCheckout } from '@/lib/payments/server';
import { validCheckoutUrl } from '@/lib/payments/provider';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await paymentUser();
  if (!auth?.profile.is_admin) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const payment = await getPayment(params.id);
  if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  const body = z.object({ action: z.enum(['check', 'review', 'recover']), note: z.string().trim().min(3).max(1000).optional(), checkoutId: z.string().regex(/^cs_[A-Za-z0-9]+$/).optional() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid payment action.' }, { status: 400 });
  try {
    if (body.data.action === 'check') await reconcilePayment(payment);
    else if (body.data.action === 'review') {
      if (!body.data.note) return NextResponse.json({ error: 'Add a review note.' }, { status: 400 });
      await flagPaymentReview(payment.id, body.data.note);
    } else {
      if (!body.data.checkoutId || payment.provider_checkout_id) return NextResponse.json({ error: 'Only unresolved checkout creation can be recovered.' }, { status: 400 });
      const result = await verifyCheckout(body.data.checkoutId, undefined, payment.id);
      if (!result) throw new Error('Checkout not found');
      const fresh = await getPayment(payment.id);
      if (!fresh?.paid_at) {
        const url = result.session.attributes.checkout_url ?? null;
        const expired = result.session.attributes.status === 'expired';
        if (!expired && (!url || !validCheckoutUrl(url))) throw new Error('Invalid provider URL');
        const { error } = await createServiceClient().rpc('attach_promotion_checkout', { p_id: payment.id, p_checkout: result.session.id, p_url: url, p_live: payment.livemode });
        if (error) throw error;
        if (expired) {
          const { error: expiryError } = await createServiceClient().rpc('expire_promotion_payment', { p_id: payment.id, p_checkout: result.session.id, p_live: payment.livemode });
          if (expiryError) throw expiryError;
        } else {
          const attached = await getPayment(payment.id);
          if (attached) await reconcilePayment(attached);
        }
      }
    }
    return NextResponse.json({ payment: await getPayment(params.id) });
  } catch {
    return NextResponse.json({ error: 'Payment could not be verified. Confirm the order reference in PayMongo before trying again.' }, { status: 409 });
  }
}
