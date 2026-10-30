import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { installPaymentMocks } from './helpers/payment-runtime.mjs';
installPaymentMocks();
const { verifyCheckout, reconcilePayment } = await import('../src/lib/payments/server.ts');
const checkout = await import('../src/app/api/promotions/checkout/route.ts');
const webhook = await import('../src/app/api/webhooks/paymongo/route.ts');
const status = await import('../src/app/api/promotions/payments/[id]/route.ts');
const originalEnv = { ...process.env }, originalFetch = globalThis.fetch;
const id = '11111111-1111-4111-8111-111111111111';
let payment, providerSession, state;

beforeEach(() => {
  Object.assign(process.env, { PAYMENTS_ENABLED: 'true', PAYMONGO_MODE: 'test', PAYMONGO_SECRET_KEY: 'sk_test_example', PAYMONGO_WEBHOOK_SECRET: 'secret', PAYMONGO_PAYMENT_METHODS: 'qrph', NEXT_PUBLIC_SITE_URL: 'https://gopairph.com' });
  payment = { id, seller_id: 'seller', listing_id: '22222222-2222-4222-8222-222222222222', provider: 'paymongo', placement: 'featured', duration_days: 7, amount_minor: 5000, currency: 'PHP', coins_used: 0, livemode: false, status: 'pending', provider_checkout_id: 'cs_test', provider_payment_id: null, expires_at: new Date(Date.now()+120000).toISOString(), created_at: new Date().toISOString(), paid_at: null };
  providerSession = { data: { id: 'cs_test', attributes: { livemode: false, reference_number: id, status: 'active', checkout_url: 'https://checkout.paymongo.com/test', payments: [{ id: 'pay_test', attributes: { amount: 5000, currency: 'PHP', status: 'paid', livemode: false } }] } } };
  state = { owner: 'seller', user: { id: 'auth-user', email: 'test@example.com' }, create: true };
  const service = {
    rpc: mock.fn(async name => ({ data: name === 'create_promotion_checkout' ? { ...payment, create_checkout: state.create } : null, error: null })),
    from(table) {
      const query = { select(){ return query; }, eq(){return query;}, neq(){return query;}, or(){return query;}, update(){return query;}, maybeSingle(){return query;},
        then(resolve) { return Promise.resolve({ data: table === 'profiles' ? { id: state.owner, is_admin: false } : table === 'promotion_payments' ? payment : null, error: null }).then(resolve); } };
      return query;
    },
  };
  globalThis.paymentMocks = { service, authClient: { ...service, auth: { getUser: async()=>({ data:{ user:state.user },error:null }) } } };
  globalThis.fetch = mock.fn(async()=>Response.json(providerSession));
});
afterEach(() => { process.env={...originalEnv}; globalThis.fetch=originalFetch; });

test('payment verification retrieves the provider record and fulfills exact identity once per database transaction', async () => {
  await verifyCheckout('cs_test','evt_test',id);
  assert.match(globalThis.fetch.mock.calls[0].arguments[0], /v1\/checkout_sessions\/cs_test$/);
  assert.deepEqual(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments, ['fulfill_promotion_payment', { p_id:id,p_checkout:'cs_test',p_payment:'pay_test',p_amount:5000,p_currency:'PHP',p_live:false,p_event:'evt_test',p_method:null }]);
});
test('wrong amount, currency, mode, checkout and order reference cannot fulfill', async () => {
  for (const field of ['amount','currency','livemode']) {
    const original=providerSession.data.attributes.payments[0].attributes[field];
    providerSession.data.attributes.payments[0].attributes[field]=field==='amount'?1:field==='currency'?'USD':true;
    await assert.rejects(verifyCheckout('cs_test')); providerSession.data.attributes.payments[0].attributes[field]=original;
  }
  payment.provider_checkout_id='cs_other'; await assert.rejects(verifyCheckout('cs_test')); payment.provider_checkout_id='cs_test';
  await assert.rejects(verifyCheckout('cs_test',undefined,'33333333-3333-4333-8333-333333333333'));
  assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
});
test('returning with an unpaid session never grants placement', async () => {
  providerSession.data.attributes.payments=[]; await verifyCheckout('cs_test');
  assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
});
test('local expiry cannot release an active provider checkout', async () => {
  payment.expires_at = new Date(Date.now()-1000).toISOString();
  providerSession.data.attributes.payments=[];
  globalThis.paymentMocks.service.from = () => {
    let lease=false;
    const q={update(){lease=true;return q;},eq(){return q;},or(){return q;},select(){return q;},maybeSingle(){return q;},then(resolve){return Promise.resolve({data:lease?[{id}]:payment,error:null}).then(resolve);}}; return q;
  };
  globalThis.fetch=mock.fn(async (url,init)=> init?.method==='POST' ? new Response('{}',{status:400}) : Response.json(providerSession));
  await reconcilePayment(payment);
  assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
  assert.equal(globalThis.fetch.mock.callCount(),3);
});
test('checkout creation uses server amounts and trusted URLs, then attaches the provider session', async () => {
  payment.provider_checkout_id=null;
  const response=await checkout.POST(new Request('https://gopairph.com/api/promotions/checkout',{method:'POST',headers:{origin:'https://gopairph.com'},body:JSON.stringify({listingId:payment.listing_id,placement:'featured',durationDays:7,amount:1})}));
  assert.equal(response.status,200);
  const sent=JSON.parse(globalThis.fetch.mock.calls[0].arguments[1].body).data.attributes;
  assert.equal(sent.line_items[0].amount,5000); assert.equal(sent.pass_on_fees,false);
  assert.equal(sent.success_url,`https://gopairph.com/promotions/payments?order=${id}&payment=return`);
  assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[1].arguments[0],'attach_promotion_checkout');
});
test('existing checkout is reused and ambiguous creation is not retried', async () => {
  state.create=false;
  const request=()=>new Request('https://gopairph.com/api/promotions/checkout',{method:'POST',body:JSON.stringify({listingId:payment.listing_id,placement:'featured',durationDays:7})});
  payment.checkout_url='https://checkout.paymongo.com/existing';
  assert.equal((await (await checkout.POST(request())).json()).checkoutUrl,payment.checkout_url);
  payment.checkout_url=null; assert.equal((await (await checkout.POST(request())).json()).statusUrl,`/promotions/payments?order=${id}`);
  assert.equal(globalThis.fetch.mock.callCount(),0);
});
test('disabled payments, cross-site requests and unauthenticated checkout cannot contact the provider', async () => {
  const request=(origin='https://gopairph.com')=>new Request('https://gopairph.com/api/promotions/checkout',{method:'POST',headers:{origin},body:JSON.stringify({listingId:payment.listing_id,placement:'featured',durationDays:7})});
  assert.equal((await checkout.POST(request('https://evil.com'))).status,403);
  process.env.PAYMENTS_ENABLED='false'; assert.equal((await checkout.POST(request())).status,503);
  process.env.PAYMENTS_ENABLED='true'; state.user=null; assert.equal((await checkout.POST(request())).status,401);
  assert.equal(globalThis.fetch.mock.callCount(),0);
});
test('another seller cannot read, reconcile or cancel a payment', async () => {
  state.owner='other-seller';
  const response=await status.POST(new Request('https://gopairph.com/api/promotions/payments/'+id,{method:'POST',body:JSON.stringify({action:'cancel'})}),{params:{id}});
  assert.equal(response.status,404); assert.equal(globalThis.fetch.mock.callCount(),0);
});
test('unsigned and wrong-environment webhook events cannot contact the provider', async () => {
  const raw=JSON.stringify({data:{id:'evt_test',attributes:{type:'checkout_session.payment.paid',livemode:true,data:{id:'cs_test',attributes:{}}}}});
  const stamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256','secret').update(`${stamp}.${raw}`).digest('hex');
  const request=(signed)=>new Request('https://gopairph.com/api/webhooks/paymongo',{method:'POST',headers:signed?{'paymongo-signature':`t=${stamp},te=${signature}`}: {},body:raw});
  assert.equal((await webhook.POST(request(false))).status,400);
  assert.equal((await webhook.POST(request(true))).status,400);
  assert.equal(globalThis.fetch.mock.callCount(),0);
});

test('a signed paid webhook settles existing payments even when new checkout is disabled', async () => {
  process.env.PAYMENTS_ENABLED='false';
  const raw=JSON.stringify({data:{id:'evt_valid',attributes:{type:'checkout_session.payment.paid',livemode:false,data:{id:'cs_test',attributes:{}}}}});
  const stamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256','secret').update(`${stamp}.${raw}`).digest('hex');
  const response=await webhook.POST(new Request('https://gopairph.com/api/webhooks/paymongo',{method:'POST',headers:{'paymongo-signature':`t=${stamp},te=${signature}`},body:raw}));
  assert.equal(response.status,200);
  assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments[0],'fulfill_promotion_payment');
});
test('an ambiguous provider timeout preserves the pending order and does not create a replacement', async () => {
  payment.provider_checkout_id=null;
  globalThis.fetch=mock.fn(async()=>{throw new Error('timeout');});
  const response=await checkout.POST(new Request('https://gopairph.com/api/promotions/checkout',{method:'POST',body:JSON.stringify({listingId:payment.listing_id,placement:'featured',durationDays:7})}));
  assert.equal(response.status,202);
  assert.equal((await response.json()).statusUrl,`/promotions/payments?order=${id}`);
  assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),1);
});
test('a definitive provider rejection releases the unused local reservation', async () => {
  payment.provider_checkout_id=null;
  globalThis.fetch=mock.fn(async()=>new Response('{}',{status:422}));
  await checkout.POST(new Request('https://gopairph.com/api/promotions/checkout',{method:'POST',body:JSON.stringify({listingId:payment.listing_id,placement:'featured',durationDays:7})}));
  assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[1].arguments[0],'expire_promotion_payment');
  assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[1].arguments[1].p_checkout,null);
});
test('coin-only checkout works without provider credentials and never contacts PayMongo', async () => {
  payment.provider='gp_coins'; payment.amount_minor=0; payment.coins_used=100; payment.provider_checkout_id=null;
  delete process.env.PAYMONGO_SECRET_KEY; delete process.env.PAYMONGO_WEBHOOK_SECRET; process.env.PAYMENTS_ENABLED='false';
  const response=await checkout.POST(new Request('https://gopairph.com/api/promotions/checkout',{method:'POST',body:JSON.stringify({listingId:payment.listing_id,placement:'featured',durationDays:7,coinsToUse:100})}));
  assert.equal(response.status,200);
  assert.equal(globalThis.fetch.mock.callCount(),0);
  assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[1].arguments[0],'fulfill_promotion_payment');
});
test('orphan session recovery validates unpaid line items and supports an expired session', async () => {
  payment.provider_checkout_id=null; providerSession.data.attributes.payments=[];
  await assert.rejects(verifyCheckout('cs_test',undefined,id),/amount mismatch/);
  providerSession.data.attributes.line_items=[{amount:5000,quantity:1,currency:'PHP'}];
  providerSession.data.attributes.status='expired';
  const result=await verifyCheckout('cs_test',undefined,id);
  assert.equal(result.session.id,'cs_test');
  assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
});
test('confirmed provider expiry releases the exact attached checkout', async () => {
  providerSession.data.attributes.payments=[]; providerSession.data.attributes.status='expired';
  await verifyCheckout('cs_test');
  assert.deepEqual(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments,['expire_promotion_payment',{p_id:id,p_checkout:'cs_test',p_live:false}]);
});

for (const eventType of ['payment.refunded', 'payment.refund.updated']) {
  test(`${eventType} retrieves and verifies refund records without a refund.succeeded event`, async () => {
    payment.provider_payment_id='pay_test';
    providerSession.data.attributes.payments[0].attributes.refunds=[{id:'ref_test'}];
    globalThis.fetch=mock.fn(async url=>Response.json(String(url).endsWith('/v1/refunds/ref_test')
      ? {data:{id:'ref_test',attributes:{payment_id:'pay_test',status:'succeeded',amount:5000,currency:'PHP',livemode:false}}}
      : providerSession));
    const raw=JSON.stringify({data:{id:'evt_refund',attributes:{type:eventType,livemode:false,data:{id:'pay_test',attributes:{}}}}});
    const stamp=String(Math.floor(Date.now()/1000));
    const signature=createHmac('sha256','secret').update(`${stamp}.${raw}`).digest('hex');
    const response=await webhook.POST(new Request('https://gopairph.com/api/webhooks/paymongo',{method:'POST',headers:{'paymongo-signature':`t=${stamp},te=${signature}`},body:raw}));
    assert.equal(response.status,200);
    assert.ok(globalThis.fetch.mock.calls.some(call=>String(call.arguments[0]).endsWith('/v1/refunds/ref_test')));
    const refundCall=globalThis.paymentMocks.service.rpc.mock.calls.find(call=>call.arguments[0]==='record_promotion_refund');
    assert.deepEqual(refundCall.arguments[1],{p_payment:'pay_test',p_refund:'ref_test',p_amount:5000,p_live:false});
  });
}
