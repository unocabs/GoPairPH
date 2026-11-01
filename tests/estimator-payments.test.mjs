import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { installFeedbackMocks } from './helpers/feedback-runtime.mjs';
installFeedbackMocks();
const {
  verifyEstimatorCheckout,
  verifyEstimatorRefund,
  createEstimatorCheckout,
  reconcileEstimatorPayment,
} = await import('../src/lib/pricing/estimatorPayments.ts');
const checkout = await import(
  '../src/app/api/price-estimator/checkout/route.ts'
);
const webhook = await import(
  '../src/app/api/webhooks/estimator-paymongo/route.ts'
);
const status = await import(
  '../src/app/api/price-estimator/payments/[id]/route.ts'
);
const feedback = await import(
  '../src/app/api/price-estimator/feedback/route.ts'
);
const originalEnv = { ...process.env },
  originalFetch = globalThis.fetch;
const id = '11111111-1111-4111-8111-111111111111',
  userId = '22222222-2222-4222-8222-222222222222';
let payment, session, state;
beforeEach(() => {
  Object.assign(process.env, {
    PAYMENTS_ENABLED: 'true',
    ESTIMATOR_CHECKOUT_ENABLED: 'true',
    PAYMONGO_MODE: 'test',
    PAYMONGO_SECRET_KEY: 'sk_test_example',
    PAYMONGO_WEBHOOK_SECRET: 'other-secret',
    ESTIMATOR_PAYMONGO_WEBHOOK_SECRET: 'estimator-secret',
    PAYMONGO_PAYMENT_METHODS: 'qrph',
    NEXT_PUBLIC_SITE_URL: 'https://gopairph.com',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only',
  });
  payment = {
    id,
    user_id: userId,
    plan: 'monthly',
    amount_minor: 5000,
    livemode: false,
    status: 'pending',
    provider_checkout_id: 'cs_test',
    provider_payment_id: null,
    checkout_url: 'https://checkout.paymongo.com/test',
    paid_at: null,
    created_at: new Date().toISOString(),
    last_checked_at: null,
  };
  session = {
    data: {
      id: 'cs_test',
      attributes: {
        livemode: false,
        reference_number: id,
        checkout_url: 'https://checkout.paymongo.com/test',
        status: 'active',
        line_items: [{ amount: 5000, quantity: 1, currency: 'PHP' }],
        payments: [
          {
            id: 'pay_test',
            attributes: {
              amount: 5000,
              currency: 'PHP',
              status: 'paid',
              livemode: false,
            },
          },
        ],
      },
    },
  };
  state = {
    user: { id: userId, email: 'buyer@example.com' },
    create: true,
    owned: true,
    estimate: {
      id,
      user_id: userId,
      input: {
        brand: 'Adidas',
        model: 'Evo SL',
        retailPricePhp: 8500,
        condition: 'good',
        mileage: 'twenty_to_80',
        mileageKm: 20,
        age: 'three_to_12_months',
        hasBox: true,
        hasReceipt: true,
        hasVisibleFlaws: false,
        demand: 'normal',
        urgency: 'balanced',
      },
      result: {
        version: 'retail_evidence_v2',
        suggestedPrice: 4500,
        suggestedLow: 4100,
        suggestedHigh: 4800,
        fastSalePrice: 3700,
        confidence: 'low',
        evidenceType: 'retail_reference',
        reasons: [],
      },
    },
  };
  const service = {
    rpc: mock.fn(async (name) => ({
      data:
        name === 'start_estimator_payment'
          ? { ...payment, create_checkout: state.create }
          : name === 'estimator_access'
            ? { active: false }
            : name === 'claim_feedback_emails'
              ? []
              : name === 'submit_product_feedback'
                ? id
                : null,
      error: null,
    })),
    from(table) {
      let update = false;
      const filters = {};
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          filters[key] = value;
          return q;
        },
        neq() {
          return q;
        },
        or() {
          return q;
        },
        update() {
          update = true;
          return q;
        },
        maybeSingle() {
          return q;
        },
        then(resolve) {
          let data =
            table === 'profiles'
              ? { id: userId, is_admin: false }
              : table === 'estimator_estimates'
                ? state.estimate
                : payment;
          if (table === 'estimator_payments' && filters.user_id && !state.owned)
            data = null;
          if (table === 'estimator_estimates' && !state.owned) data = null;
          if (update) data = [{ id }];
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  globalThis.feedbackMocks = {
    service,
    client: {
      ...service,
      auth: {
        getUser: async () => ({ data: { user: state.user }, error: null }),
      },
    },
    email: mock.fn(async () => 'sent'),
  };
  globalThis.fetch = mock.fn(async () => Response.json(session));
});
afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});
const request = (body) =>
  new Request('https://gopairph.com/api/price-estimator/checkout', {
    method: 'POST',
    headers: { origin: 'https://gopairph.com' },
    body: JSON.stringify(body),
  });
test('only exact provider-confirmed payment identity, amount, currency and mode can grant access', async () => {
  await verifyEstimatorCheckout('cs_test', id);
  assert.equal(
    globalThis.feedbackMocks.service.rpc.mock.calls[0].arguments[0],
    'fulfill_estimator_payment',
  );
  globalThis.feedbackMocks.service.rpc.mock.resetCalls();
  for (const [field, value] of [
    ['amount', 1],
    ['currency', 'USD'],
    ['livemode', true],
  ]) {
    const attributes = session.data.attributes.payments[0].attributes,
      old = attributes[field];
    attributes[field] = value;
    await assert.rejects(verifyEstimatorCheckout('cs_test', id));
    attributes[field] = old;
  }
  await assert.rejects(verifyEstimatorCheckout('cs_test', userId));
  payment.provider_checkout_id = 'cs_other';
  await assert.rejects(verifyEstimatorCheckout('cs_test', id));
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
});
test('unpaid return and active checkout cancellation cannot create a grant or claim expiry', async () => {
  session.data.attributes.payments = [];
  await verifyEstimatorCheckout('cs_test', id);
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
  await reconcileEstimatorPayment(payment, true);
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
});
test('manual monthly checkout uses fixed centavos and no recurring mandate', async () => {
  payment.provider_checkout_id = null;
  payment.checkout_url = null;
  await createEstimatorCheckout(state.user, 'monthly');
  const body = JSON.parse(globalThis.fetch.mock.calls[0].arguments[1].body).data
    .attributes;
  assert.equal(body.line_items[0].amount, 5000);
  assert.equal(body.reference_number, id);
  assert.match(body.description, /no automatic renewal/);
  assert.equal(body.pass_on_fees, false);
  assert.equal(
    globalThis.feedbackMocks.service.rpc.mock.calls[1].arguments[0],
    'attach_estimator_checkout',
  );
});
test('permanent checkout charges 600 pesos exactly', async () => {
  payment = {
    ...payment,
    plan: 'permanent',
    amount_minor: 60000,
    provider_checkout_id: null,
    checkout_url: null,
  };
  await createEstimatorCheckout(state.user, 'permanent');
  assert.equal(
    JSON.parse(globalThis.fetch.mock.calls[0].arguments[1].body).data.attributes
      .line_items[0].amount,
    60000,
  );
});
test('ambiguous checkout creation is held for review and never blindly recreated', async () => {
  payment.checkout_url = null;
  globalThis.fetch = mock.fn(async () => {
    throw Error('Timeout');
  });
  const result = await createEstimatorCheckout(state.user, 'monthly');
  assert.equal(result.pending, true);
  assert.equal(globalThis.fetch.mock.callCount(), 1);
  state.create = false;
  payment.checkout_url = null;
  await createEstimatorCheckout(state.user, 'monthly');
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});
test('unpaid orphan recovery checks line items and trusted URL before attaching', async () => {
  payment.provider_checkout_id = null;
  session.data.attributes.payments = [];
  await verifyEstimatorCheckout('cs_test', id);
  assert.equal(
    globalThis.feedbackMocks.service.rpc.mock.calls[0].arguments[0],
    'attach_estimator_checkout',
  );
  globalThis.feedbackMocks.service.rpc.mock.resetCalls();
  session.data.attributes.line_items[0].amount = 1;
  await assert.rejects(verifyEstimatorCheckout('cs_test', id));
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
});
test('disabled checkout, missing terms, cross-site and unauthenticated requests cannot start payment', async () => {
  const body = { plan: 'monthly', accept_terms: true };
  process.env.ESTIMATOR_CHECKOUT_ENABLED = 'false';
  assert.equal((await checkout.POST(request(body))).status, 503);
  process.env.ESTIMATOR_CHECKOUT_ENABLED = 'true';
  assert.equal(
    (await checkout.POST(request({ ...body, accept_terms: false }))).status,
    400,
  );
  state.user = null;
  assert.equal((await checkout.POST(request(body))).status, 401);
  assert.equal(
    (
      await checkout.POST(
        new Request('https://gopairph.com/api/price-estimator/checkout', {
          method: 'POST',
          headers: { origin: 'https://evil.com' },
          body: JSON.stringify(body),
        }),
      )
    ).status,
    403,
  );
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});
test('payment reconciliation is restricted to the account owner', async () => {
  state.owned = false;
  const response = await status.POST(request({ action: 'check' }), {
    params: { id },
  });
  assert.equal(response.status, 404);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});
test('wrong webhook signature or mode cannot verify a payment', async () => {
  const raw = JSON.stringify({
    data: {
      id: 'evt_test',
      attributes: {
        type: 'checkout_session.payment.paid',
        livemode: true,
        data: { id: 'cs_test', attributes: {} },
      },
    },
  });
  const stamp = Math.floor(Date.now() / 1000),
    sig = createHmac('sha256', 'estimator-secret')
      .update(`${stamp}.${raw}`)
      .digest('hex');
  const make = (signed) =>
    new Request('https://gopairph.com/api/webhooks/estimator-paymongo', {
      method: 'POST',
      headers: signed ? { 'paymongo-signature': `t=${stamp},te=${sig}` } : {},
      body: raw,
    });
  assert.equal((await webhook.POST(make(false))).status, 400);
  assert.equal((await webhook.POST(make(true))).status, 400);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});
test('verified provider refunds use payment identity; disputes cannot activate access', async () => {
  globalThis.fetch = mock.fn(async () =>
    Response.json({
      data: {
        id: 'ref_test',
        attributes: {
          payment_id: 'pay_test',
          status: 'succeeded',
          amount: 5000,
          currency: 'PHP',
          livemode: false,
        },
      },
    }),
  );
  await verifyEstimatorRefund('ref_test');
  assert.equal(
    globalThis.feedbackMocks.service.rpc.mock.calls[0].arguments[0],
    'refund_estimator_payment',
  );
  globalThis.feedbackMocks.service.rpc.mock.resetCalls();
  globalThis.fetch = mock.fn(async () => Response.json(session));
  session.data.attributes.payments[0].attributes.disputed = true;
  await verifyEstimatorCheckout('cs_test', id);
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
});
const feedbackBody = () => ({
  estimate_id: id,
  submission_id: userId,
  reason: 'too_low',
  suggested_price_php: 5000,
  message: 'I think this should be higher.',
  price_choice: 'suggested_range',
  reference_price_php: 4500,
  input: { retailPricePhp: 999999 },
  estimate: { suggestedPrice: 1 },
});
test('v2 feedback saves the owned historical snapshot, ignoring forged client inputs', async () => {
  const response = await feedback.POST(request(feedbackBody()));
  assert.equal(response.status, 201);
  const payload = globalThis.feedbackMocks.service.rpc.mock.calls.find(
    (call) => call.arguments[0] === 'submit_product_feedback',
  ).arguments[1].p_payload;
  assert.equal(payload.estimator_snapshot.input.retailPricePhp, 8500);
  assert.equal(payload.estimator_snapshot.reference_price_php, 4500);
  assert.equal(payload.estimator_snapshot.engine_version, 'retail_evidence_v2');
  assert.equal(payload.estimator_snapshot.evidence_type, 'retail_reference');
});
test('v2 feedback rejects another account, fabricated reference and reversed feedback direction', async () => {
  state.owned = false;
  assert.equal((await feedback.POST(request(feedbackBody()))).status, 404);
  state.owned = true;
  assert.equal(
    (
      await feedback.POST(
        request({ ...feedbackBody(), reference_price_php: 1 }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await feedback.POST(request({ ...feedbackBody(), reason: 'too_high' })))
      .status,
    400,
  );
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
});

test('a correctly signed estimator webhook re-fetches and verifies the provider payment', async () => {
  const raw = JSON.stringify({
    data: {
      id: 'evt_good',
      attributes: {
        type: 'checkout_session.payment.paid',
        livemode: false,
        data: { id: 'cs_test', attributes: {} },
      },
    },
  });
  const stamp = Math.floor(Date.now() / 1000),
    signature = createHmac('sha256', 'estimator-secret')
      .update(`${stamp}.${raw}`)
      .digest('hex');
  const response = await webhook.POST(
    new Request('https://gopairph.com/api/webhooks/estimator-paymongo', {
      method: 'POST',
      headers: { 'paymongo-signature': `t=${stamp},te=${signature}` },
      body: raw,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(globalThis.fetch.mock.callCount(), 1);
  assert.equal(
    globalThis.feedbackMocks.service.rpc.mock.calls[0].arguments[0],
    'fulfill_estimator_payment',
  );
});
