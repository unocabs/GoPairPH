import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { installFeedbackMocks } from './helpers/feedback-runtime.mjs';
installFeedbackMocks();
const history = await import('../src/app/api/price-estimator/history/route.ts');
const api = await import('../src/app/api/price-estimator/route.ts');
const id = '11111111-1111-4111-8111-111111111111';
const input = {
  brand: 'Adidas',
  model: 'Evo SL',
  retailPricePhp: 8500,
  condition: 'good',
  mileage: 'twenty_to_80',
  mileageKm: 20,
  age: 'three_to_12_months',
  demand: 'normal',
  urgency: 'balanced',
  hasBox: true,
  hasReceipt: true,
  hasVisibleFlaws: false,
};
let state;
const request = (body) =>
  new Request('https://gopairph.com/api/price-estimator', {
    method: 'POST',
    headers: { origin: 'https://gopairph.com' },
    body: JSON.stringify(body),
  });
const originalEnv = { ...process.env };
beforeEach(() => {
  state = {
    user: { id },
    error: null,
    filters: [],
    models: [
      {
        id: 'evo',
        brand: 'Adidas',
        name: 'Adizero Evo SL',
        aliases: ['Evo SL'],
        category: 'road',
      },
    ],
  };
  const service = {
    rpc: mock.fn(async (name, args) => ({
      data:
        name === 'estimator_access'
          ? {
              premiumEnabled: false,
              freeAvailable: true,
              active: false,
              permanent: false,
              expiresAt: null,
              trialEstimateId: null,
              correctionUntil: null,
            }
          : name === 'save_estimator_estimate'
            ? { id, input: args.p_input, result: args.p_result }
            : null,
      error: state.error,
    })),
    from(table) {
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          state.filters.push([table, key, value]);
          return q;
        },
        gte() {
          return q;
        },
        order() {
          return q;
        },
        or() {
          return q;
        },
        limit() {
          return q;
        },
        then(resolve) {
          return Promise.resolve({
            data: table === 'estimator_models' ? state.models : [],
            error: null,
          }).then(resolve);
        },
      };
      return q;
    },
  };
  globalThis.feedbackMocks = {
    service,
    client: {
      auth: {
        getUser: async () => ({ data: { user: state.user }, error: null }),
      },
    },
  };
});
afterEach(() => {
  process.env = { ...originalEnv };
});
test('account sign-in and same-origin validation occur before any estimate is saved', async () => {
  state.user = null;
  assert.equal(
    (await api.POST(request({ request_id: id, input }))).status,
    401,
  );
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
  assert.equal(
    (
      await api.POST(
        new Request('https://gopairph.com/api/price-estimator', {
          method: 'POST',
          headers: { origin: 'https://evil.com' },
          body: '{}',
        }),
      )
    ).status,
    403,
  );
});
test('server validates inputs and rejects unused shoes with mileage without consuming a trial', async () => {
  for (const patch of [
    { retailPricePhp: 0 },
    { mileageKm: -1 },
    { condition: 'new' },
  ])
    assert.equal(
      (
        await api.POST(
          request({ request_id: id, input: { ...input, ...patch } }),
        )
      ).status,
      400,
    );
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(), 0);
});
test('client owner, price output and engine fields cannot replace the saved server calculation', async () => {
  const response = await api.POST(
    request({
      request_id: id,
      input,
      user_id: 'attacker',
      result: { suggestedPrice: 999999 },
      engine_version: 'fake',
    }),
  );
  assert.equal(response.status, 201);
  const call = globalThis.feedbackMocks.service.rpc.mock.calls.find(
    (call) => call.arguments[0] === 'save_estimator_estimate',
  ).arguments[1];
  assert.equal(call.p_user, id);
  assert.equal(call.p_version, 'retail_evidence_v2');
  assert.notEqual(call.p_result.suggestedPrice, 999999);
  assert.equal(call.p_identity, 'adidas:evo');
});
test('an exhausted account receives a paywall response without a result or consumed request', async () => {
  state.error = { code: 'P0001', message: 'Premium access required' };
  const response = await api.POST(request({ request_id: id, input }));
  assert.equal(response.status, 402);
  assert.equal((await response.json()).estimate, undefined);
});
test('overview reads only the signed-in account and is never publicly cached', async () => {
  const response = await api.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  const data = await response.json();
  assert.equal(data.checkoutEnabled, false);
  for (const table of ['estimator_estimates', 'estimator_payments'])
    assert.ok(
      state.filters.some(
        ([t, key, value]) => t === table && key === 'user_id' && value === id,
      ),
    );
});

test('history pagination authenticates and rejects malformed cursors', async () => {
  state.user = null;
  assert.equal(
    (
      await history.GET(
        new Request('https://gopairph.com/api/price-estimator/history'),
      )
    ).status,
    401,
  );
  state.user = { id };
  assert.equal(
    (
      await history.GET(
        new Request(
          'https://gopairph.com/api/price-estimator/history?before=invalid',
        ),
      )
    ).status,
    400,
  );
  const response = await history.GET(
    new Request('https://gopairph.com/api/price-estimator/history'),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.ok(
    state.filters.some(
      ([table, key, value]) =>
        table === 'estimator_estimates' && key === 'user_id' && value === id,
    ),
  );
});
