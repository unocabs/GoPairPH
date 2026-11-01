import 'server-only';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  checkoutSchema,
  paymongo,
  paymentConfiguration,
  validCheckoutUrl,
  ProviderError,
} from '@/lib/payments/provider';
export interface EstimatorPayment {
  id: string;
  user_id: string;
  plan: 'monthly' | 'permanent';
  amount_minor: number;
  livemode: boolean;
  status: 'creating' | 'pending' | 'paid' | 'expired' | 'review' | 'refunded';
  provider_checkout_id: string | null;
  provider_payment_id: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  created_at: string;
  last_checked_at: string | null;
  refunded_amount_minor: number;
  review_note: string | null;
}
export async function estimatorPayment(
  id: string,
  userId?: string,
): Promise<EstimatorPayment | null> {
  let query = createServiceClient()
    .from('estimator_payments')
    .select('*')
    .eq('id', id);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw Error('Could not load payment.');
  return data as EstimatorPayment | null;
}
async function reviewPayment(id: string, note: string, disputed = false) {
  const service = createServiceClient();
  const result = await service
    .from('estimator_payments')
    .update({ status: 'review', review_note: note })
    .eq('id', id)
    .neq('status', 'refunded');
  if (result.error) throw Error('Could not mark payment for review.');
  if (disputed) {
    const revoked = await service
      .from('estimator_access_grants')
      .update({ revoked: true })
      .eq('payment_id', id);
    if (revoked.error) throw Error('Could not suspend disputed access.');
  }
}
export async function verifyEstimatorRefund(id: string) {
  if (!/^ref_[A-Za-z0-9]+$/.test(id)) return;
  const refund = z
    .object({
      data: z.object({
        id: z.string(),
        attributes: z.object({
          payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
          status: z.string(),
          amount: z.number().int().positive(),
          currency: z.literal('PHP'),
          livemode: z.boolean(),
        }),
      }),
    })
    .parse(await paymongo(`/v1/refunds/${id}`)).data;
  if (
    refund.id !== id ||
    refund.attributes.livemode !== paymentConfiguration().live
  )
    throw Error('Refund identity mismatch.');
  if (refund.attributes.status !== 'succeeded') return;
  const { data: payment, error } = await createServiceClient()
    .from('estimator_payments')
    .select('*')
    .eq('provider_payment_id', refund.attributes.payment_id)
    .maybeSingle();
  if (error) throw Error('Could not resolve refunded payment.');
  if (!payment) return;
  const result = await createServiceClient().rpc('refund_estimator_payment', {
    p_id: payment.id,
    p_payment: refund.attributes.payment_id,
    p_refund: id,
    p_amount: refund.attributes.amount,
    p_live: refund.attributes.livemode,
  });
  if (result.error) throw Error('Could not apply refund.');
}
export async function verifyEstimatorCheckout(
  checkoutId: string,
  expectedId?: string,
) {
  if (!/^cs_[A-Za-z0-9]+$/.test(checkoutId)) throw Error('Invalid checkout.');
  const config = paymentConfiguration();
  const session = checkoutSchema.parse(
    await paymongo(`/v1/checkout_sessions/${checkoutId}`),
  ).data;
  if (session.id !== checkoutId || session.attributes.livemode !== config.live)
    throw Error('Checkout environment mismatch.');
  const id = z.string().uuid().parse(session.attributes.reference_number);
  if (expectedId && id !== expectedId) throw Error('Checkout order mismatch.');
  const payment = await estimatorPayment(id);
  if (!payment) return null;
  if (
    payment.livemode !== config.live ||
    (payment.provider_checkout_id &&
      payment.provider_checkout_id !== checkoutId)
  )
    throw Error('Checkout identity mismatch.');
  const paid =
    session.attributes.payments?.filter(
      (row) => row.attributes.status === 'paid',
    ) ?? [];
  if (paid.length > 1) throw Error('Multiple payments require review.');
  if (!paid.length && !payment.provider_checkout_id) {
    const items = session.attributes.line_items;
    if (
      !items?.length ||
      items.some((row) => row.currency !== 'PHP') ||
      items.reduce((sum, row) => sum + row.amount * row.quantity, 0) !==
        payment.amount_minor
    )
      throw Error('Checkout amount mismatch.');
    const url = session.attributes.checkout_url ?? '';
    if (!validCheckoutUrl(url)) throw Error('Untrusted checkout URL.');
    const attached = await createServiceClient().rpc(
      'attach_estimator_checkout',
      { p_id: id, p_checkout: checkoutId, p_url: url, p_live: config.live },
    );
    if (attached.error) throw Error('Could not recover checkout.');
  }
  if (paid.length) {
    const item = paid[0];
    if (
      item.attributes.amount !== payment.amount_minor ||
      item.attributes.currency !== 'PHP' ||
      item.attributes.livemode !== config.live
    )
      throw Error('Payment amount mismatch.');
    if (item.attributes.disputed) {
      await reviewPayment(
        id,
        'Provider reports a dispute. Resolve in PayMongo before restoring access.',
        true,
      );
      return { payment, session };
    }
    const result = await createServiceClient().rpc(
      'fulfill_estimator_payment',
      {
        p_id: id,
        p_checkout: checkoutId,
        p_payment: item.id,
        p_amount: item.attributes.amount,
        p_live: config.live,
      },
    );
    if (result.error) throw Error('Could not activate estimator access.');
    if (item.attributes.refunded || item.attributes.refunds?.length) {
      await reviewPayment(
        id,
        'Provider reports a refund. Confirming the refund details.',
      );
      for (const raw of item.attributes.refunds ?? []) {
        const parsed = z
          .union([
            z.string().regex(/^ref_[A-Za-z0-9]+$/),
            z.object({ id: z.string().regex(/^ref_[A-Za-z0-9]+$/) }),
          ])
          .safeParse(raw);
        if (parsed.success)
          await verifyEstimatorRefund(
            typeof parsed.data === 'string' ? parsed.data : parsed.data.id,
          );
      }
    }
  } else if (
    session.attributes.status === 'expired' &&
    payment.provider_checkout_id
  ) {
    const result = await createServiceClient().rpc('expire_estimator_payment', {
      p_id: id,
      p_checkout: checkoutId,
      p_live: config.live,
    });
    if (result.error) throw Error('Could not close checkout.');
  }
  return { payment, session };
}
export async function createEstimatorCheckout(
  user: { id: string; email?: string },
  plan: 'monthly' | 'permanent',
) {
  const config = paymentConfiguration();
  const service = createServiceClient();
  const started = await service.rpc('start_estimator_payment', {
    p_user: user.id,
    p_plan: plan,
    p_live: config.live,
  });
  if (started.error)
    throw Error(
      started.error.code === 'P0001'
        ? started.error.message
        : 'Could not prepare checkout.',
    );
  const payment = started.data as EstimatorPayment & {
    create_checkout: boolean;
  };
  const statusUrl = `/price-guide?payment=${payment.id}`;
  if (payment.checkout_url && validCheckoutUrl(payment.checkout_url))
    return { checkoutUrl: payment.checkout_url, statusUrl };
  if (!payment.create_checkout) return { statusUrl };
  try {
    if (payment.amount_minor !== (plan === 'monthly' ? 5000 : 60000))
      throw Error('Incorrect price.');
    const session = checkoutSchema.parse(
      await paymongo('/v2/checkout_sessions', {
        line_items: [
          {
            name: `Go Pair PH estimator: ${plan === 'monthly' ? 'one month, manual renewal' : 'permanent access'}`,
            amount: payment.amount_minor,
            currency: 'PHP',
            quantity: 1,
          },
        ],
        payment_method_types: config.methods.includes('qrph')
          ? ['qrph']
          : config.methods,
        reference_number: payment.id,
        metadata: { gopair_estimator_payment: payment.id },
        success_url: `${config.siteUrl}${statusUrl}`,
        cancel_url: `${config.siteUrl}${statusUrl}&cancelled=1`,
        description:
          'Estimator access. One-time payment; no automatic renewal.',
        pass_on_fees: false,
        send_email_receipt: true,
        billing: { email: user.email },
      }),
    ).data;
    const url = session.attributes.checkout_url ?? '';
    if (
      session.attributes.livemode !== config.live ||
      !validCheckoutUrl(url) ||
      (session.attributes.reference_number &&
        session.attributes.reference_number !== payment.id)
    )
      throw Error('Invalid provider response.');
    const attached = await service.rpc('attach_estimator_checkout', {
      p_id: payment.id,
      p_checkout: session.id,
      p_url: url,
      p_live: config.live,
    });
    if (attached.error) throw Error('Could not attach checkout.');
    return { checkoutUrl: url, statusUrl };
  } catch (cause) {
    if (
      cause instanceof ProviderError &&
      [400, 401, 403, 404, 422].includes(cause.status)
    )
      await service.rpc('expire_estimator_payment', {
        p_id: payment.id,
        p_checkout: null,
        p_live: config.live,
      });
    else
      await reviewPayment(
        payment.id,
        'Checkout creation is unresolved. Locate its PayMongo session by reference before retrying.',
      );
    return { statusUrl, pending: true };
  }
}
export async function reconcileEstimatorPayment(
  payment: EstimatorPayment,
  cancel = false,
) {
  const service = createServiceClient();
  const { data: lease, error } = await service
    .from('estimator_payments')
    .update({ last_checked_at: new Date().toISOString() })
    .eq('id', payment.id)
    .or(
      `last_checked_at.is.null,last_checked_at.lt.${new Date(Date.now() - 15000).toISOString()}`,
    )
    .select('id');
  if (error) throw Error('Could not check payment status.');
  if (!lease?.length) return;
  if (!payment.provider_checkout_id) {
    if (Date.now() - Date.parse(payment.created_at) > 60000)
      await reviewPayment(
        payment.id,
        'Unresolved checkout. Admin must locate the provider session by reference.',
      );
    return;
  }
  const result = await verifyEstimatorCheckout(
    payment.provider_checkout_id,
    payment.id,
  );
  if (
    result &&
    !result.session.attributes.payments?.some(
      (item) => item.attributes.status === 'paid',
    ) &&
    result.session.attributes.status !== 'expired' &&
    (cancel || Date.now() - Date.parse(payment.created_at) > 30 * 60000)
  ) {
    try {
      await paymongo(
        `/v1/checkout_sessions/${payment.provider_checkout_id}/expire`,
        undefined,
        true,
      );
    } catch {
      /* Re-fetch; a provider payment may already be processing. */
    }
    await verifyEstimatorCheckout(payment.provider_checkout_id, payment.id);
  }
}
