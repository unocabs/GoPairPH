import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';
import { installPaymentMocks } from './helpers/payment-runtime.mjs';
import { isAwaitingPayment } from '../src/lib/payments/types.ts';
installPaymentMocks();
const { checkoutSchema, parsePaymongoEvent, paymentConfiguration, paymongo, readWebhookBody, validCheckoutUrl, verifyPaymongoSignature } = await import('../src/lib/payments/provider.ts');
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
beforeEach(() => {
  Object.assign(process.env, { PAYMONGO_MODE: 'test', PAYMONGO_SECRET_KEY: 'sk_test_example', PAYMONGO_WEBHOOK_SECRET: 'test-secret', PAYMONGO_PAYMENT_METHODS: 'qrph,gcash', NEXT_PUBLIC_SITE_URL: 'https://gopairph.com' });
});
afterEach(() => { process.env = { ...originalEnv }; globalThis.fetch = originalFetch; });

test('configuration enforces test/live keys, supported methods and trusted return URLs', () => {
  assert.deepEqual(paymentConfiguration().labels, ['QR Ph', 'GCash']);
  process.env.PAYMONGO_SECRET_KEY = 'sk_live_example'; assert.throws(paymentConfiguration);
  process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
  process.env.PAYMONGO_PAYMENT_METHODS = 'qrph,bank'; assert.throws(paymentConfiguration);
  process.env.PAYMONGO_PAYMENT_METHODS = 'qrph';
  for (const url of ['http://gopairph.com', 'https://user@gopairph.com', 'https://gopairph.com/redirect', 'https://gopairph.com/?next=evil']) { process.env.NEXT_PUBLIC_SITE_URL = url; assert.throws(paymentConfiguration); }
});
test('only the PayMongo HTTPS checkout domain is accepted', () => {
  assert.equal(validCheckoutUrl('https://checkout.paymongo.com/session'), true);
  for (const url of ['https://checkout.paymongo.com.evil.com/pay', 'https://evil@checkout.paymongo.com/pay', 'javascript:alert(1)', 'http://checkout.paymongo.com/pay', 'https://checkout.paymongo.com:444/pay']) assert.equal(validCheckoutUrl(url), false);
});
test('webhooks require the raw-body HMAC, correct mode and recent timestamp', () => {
  const now = 1_800_000_000_000, stamp = String(now / 1000), raw = '{"test":true}';
  const signature = createHmac('sha256', 'secret').update(`${stamp}.${raw}`).digest('hex');
  assert.equal(verifyPaymongoSignature(raw, `t=${stamp},te=${signature},li=`, 'secret', false, now), true);
  assert.equal(verifyPaymongoSignature(raw, `t=${stamp},te=,li=${signature}`, 'secret', true, now), true);
  assert.equal(verifyPaymongoSignature(raw + ' ', `t=${stamp},te=${signature}`, 'secret', false, now), false);
  assert.equal(verifyPaymongoSignature(raw, `t=${stamp},te=${signature}`, 'secret', true, now), false);
  assert.equal(verifyPaymongoSignature(raw, `t=${stamp},te=${signature}`, 'secret', false, now + 301_000), false);
  assert.equal(verifyPaymongoSignature(raw, 't=NaN,te=x', 'secret', false, now), false);
});
test('legacy and hosted event envelopes have stable deduplication keys', () => {
  const attributes = { type: 'checkout_session.payment.paid', livemode: false, data: { id: 'cs_test', attributes: {} } };
  assert.equal(parsePaymongoEvent({ data: { id: 'evt_test', attributes } }).id, 'evt_test');
  const hosted = { event_type: 'send.webhook', data: attributes };
  assert.equal(parsePaymongoEvent(hosted).id, parsePaymongoEvent(structuredClone(hosted)).id);
  assert.throws(() => parsePaymongoEvent({ data: {} }));
});
test('provider requests use server Basic authentication, no cache and centavo amounts', async () => {
  let call;
  globalThis.fetch = async (url, init) => { call = { url, init }; return Response.json({ data: { id: 'cs_test' } }); };
  await paymongo('/v2/checkout_sessions', { line_items: [{ amount: 3000, currency: 'PHP', quantity: 1 }] });
  assert.equal(call.url, 'https://api.paymongo.com/v2/checkout_sessions');
  assert.equal(call.init.headers.Authorization, `Basic ${Buffer.from('sk_test_example:').toString('base64')}`);
  assert.equal(call.init.cache, 'no-store');
  assert.equal(JSON.parse(call.init.body).data.attributes.line_items[0].amount, 3000);
  globalThis.fetch = async () => new Response('provider detail', { status: 400 });
  await assert.rejects(paymongo('/v2/checkout_sessions', {}), /400/);
});
test('checkout schema rejects malformed IDs and non-integral payment amounts', () => {
  assert.throws(() => checkoutSchema.parse({ data: { id: '../../secrets', attributes: { livemode: false } } }));
  assert.throws(() => checkoutSchema.parse({ data: { id: 'cs_test', attributes: { livemode: false, payments: [{ id: 'pay_test', attributes: { amount: 1.5, currency: 'PHP', livemode: false, status: 'paid' } }] } } }));
});
test('webhook body size is bounded even without a content-length header', async () => {
  assert.equal(await readWebhookBody(new Request('https://example.com', { method: 'POST', body: '{"ok":1}' })), '{"ok":1}');
  await assert.rejects(readWebhookBody(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(262145) })), /large/);
});
test('reviewed unpaid checkouts stay pending; paid reviews and refunds do not poll', () => {
  assert.equal(isAwaitingPayment({ status: 'review', paid_at: null }), true);
  assert.equal(isAwaitingPayment({ status: 'review', paid_at: '2026-10-30' }), false);
  assert.equal(isAwaitingPayment({ status: 'expired', paid_at: null }), false);
});
test('payment return reference survives the existing seller dashboard sign-in redirect', async () => {
  const { resolvePostSignInPath } = await import('../src/lib/auth/postSignInRedirect.ts');
  const next='/promotions/payments?order=11111111-1111-4111-8111-111111111111';
  const client={from(){throw new Error('Payment return must not be diverted into profile lookup');}};
  assert.equal(await resolvePostSignInPath(client,'user',next),next);
});
