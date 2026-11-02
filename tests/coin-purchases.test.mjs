import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { afterEach,beforeEach,mock,test } from 'node:test';
import { installPaymentMocks } from './helpers/payment-runtime.mjs';
installPaymentMocks();
const {verifyCoinCheckout,verifyCoinRefund}=await import('../src/lib/payments/coinPurchases.ts');
const checkout=await import('../src/app/api/coins/checkout/route.ts');
const status=await import('../src/app/api/coins/purchases/[id]/route.ts');
const flash=await import('../src/app/api/flash-deals/route.ts');
const webhook=await import('../src/app/api/webhooks/paymongo/route.ts');
const originalEnv={...process.env},originalFetch=globalThis.fetch;
const id='11111111-1111-4111-8111-111111111111',listingId='22222222-2222-4222-8222-222222222222';
let purchase,session,state;
beforeEach(()=>{
 Object.assign(process.env,{PAYMENTS_ENABLED:'true',PAYMONGO_MODE:'test',PAYMONGO_SECRET_KEY:'sk_test_example',PAYMONGO_WEBHOOK_SECRET:'secret',PAYMONGO_PAYMENT_METHODS:'qrph',NEXT_PUBLIC_SITE_URL:'https://gopairph.com'});
 purchase={id,profile_id:'seller',coins:40,amount_minor:2000,currency:'PHP',livemode:false,status:'pending',provider_checkout_id:'cs_coins',provider_payment_id:null,checkout_url:null,created_at:new Date().toISOString(),paid_at:null,return_path:'/flash-deals/new'};
 session={data:{id:'cs_coins',attributes:{livemode:false,reference_number:id,status:'active',checkout_url:'https://checkout.paymongo.com/coins',payments:[{id:'pay_coins',attributes:{amount:2000,currency:'PHP',status:'paid',livemode:false}}]}}};
 state={owner:'seller',user:{id:'auth-user',email:'test@example.com'},create:true,rpcError:null};
 const service={rpc:mock.fn(async(name)=>({data:name==='create_gp_coin_purchase'?{...purchase,create_checkout:state.create}:name==='start_flash_deal'?{id,listing_id:listingId}:null,error:state.rpcError})),
 from(table){const q={select(){return q;},eq(){return q;},neq(){return q;},or(){return q;},update(){return q;},single(){return q;},maybeSingle(){return q;},then(resolve){return Promise.resolve({data:table==='profiles'?{id:state.owner,is_admin:false}:table==='gp_coin_purchases'?purchase:table==='shoes'?{id:listingId,slug:'on-cloud-5'}:null,error:null}).then(resolve);}};return q;}};
 globalThis.paymentMocks={service,authClient:{...service,auth:{getUser:async()=>({data:{user:state.user},error:null})}}};
 globalThis.fetch=mock.fn(async()=>Response.json(session));
});
afterEach(()=>{process.env={...originalEnv};globalThis.fetch=originalFetch;});
const request=(path,body,origin='https://gopairph.com')=>new Request('https://gopairph.com'+path,{method:'POST',headers:{origin},body:JSON.stringify(body)});

test('coin checkout uses trusted server pack amounts and preserves the seller draft',async()=>{
 purchase.provider_checkout_id=null;
 const response=await checkout.POST(request('/api/coins/checkout',{coins:40,amount_minor:1,returnPath:'/flash-deals/new?listing='+listingId+'&sale=4400'}));
 assert.equal(response.status,200);
 const sent=JSON.parse(globalThis.fetch.mock.calls[0].arguments[1].body).data.attributes;
 assert.equal(sent.line_items[0].amount,2000);assert.equal(sent.pass_on_fees,false);
 assert.equal(sent.success_url,`https://gopairph.com/coins?order=${id}&payment=return`);
 assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[1].arguments[0],'attach_gp_coin_checkout');
 assert.match(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments[1].p_return,/sale=4400/);
});
test('invalid packs, disabled checkout, cross-origin and anonymous users cannot create charges',async()=>{
 assert.equal((await checkout.POST(request('/api/coins/checkout',{coins:999}))).status,400);
 assert.equal((await checkout.POST(request('/api/coins/checkout',{coins:40},'https://evil.com'))).status,403);
 process.env.PAYMENTS_ENABLED='false';assert.equal((await checkout.POST(request('/api/coins/checkout',{coins:40}))).status,503);
 process.env.PAYMENTS_ENABLED='true';state.user=null;assert.equal((await checkout.POST(request('/api/coins/checkout',{coins:40}))).status,401);
 assert.equal(globalThis.fetch.mock.callCount(),0);assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
});
test('retries reuse a pending purchase without opening a second checkout',async()=>{
 state.create=false;purchase.checkout_url='https://checkout.paymongo.com/existing';
 assert.equal((await(await checkout.POST(request('/api/coins/checkout',{coins:40}))).json()).checkoutUrl,purchase.checkout_url);
 purchase.checkout_url=null;
 assert.equal((await(await checkout.POST(request('/api/coins/checkout',{coins:40}))).json()).statusUrl,`/coins?order=${id}`);
 assert.equal(globalThis.fetch.mock.callCount(),0);
});
test('an ambiguous provider timeout keeps the unresolved purchase and cannot claim success',async()=>{
 purchase.provider_checkout_id=null;globalThis.fetch=mock.fn(async()=>{throw Error('timeout');});
 const response=await checkout.POST(request('/api/coins/checkout',{coins:40}));
 assert.equal(response.status,202);assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),1);
 assert.equal((await response.json()).statusUrl,`/coins?order=${id}`);
});
test('returning from an unpaid checkout never credits coins',async()=>{
 session.data.attributes.payments=[];await verifyCoinCheckout('cs_coins',id);
 assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
});
test('wrong amount, currency, mode, checkout or order never credits coins',async()=>{
 for(const field of ['amount','currency','livemode']){const attrs=session.data.attributes.payments[0].attributes;const before=attrs[field];attrs[field]=field==='amount'?1:field==='currency'?'USD':true;await assert.rejects(verifyCoinCheckout('cs_coins',id));attrs[field]=before;}
 purchase.provider_checkout_id='cs_other';await assert.rejects(verifyCoinCheckout('cs_coins',id));purchase.provider_checkout_id='cs_coins';
 await assert.rejects(verifyCoinCheckout('cs_coins',listingId));
 assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
});
test('a verified payment credits through the atomic RPC and flags refunded credits before they can be spent',async()=>{
 session.data.attributes.payments[0].attributes.disputed=true;
 await verifyCoinCheckout('cs_coins',id);
 const [name,params]=globalThis.paymentMocks.service.rpc.mock.calls[0].arguments;
 assert.equal(name,'fulfill_gp_coin_purchase');assert.equal(params.p_amount,2000);assert.equal(params.p_review,true);
});
test('only confirmed provider refunds remove credits',async()=>{
 const refund={data:{id:'ref_coins',attributes:{payment_id:'pay_coins',status:'pending',amount:1000,currency:'PHP',livemode:false}}};
 globalThis.fetch=mock.fn(async()=>Response.json(refund));await verifyCoinRefund('ref_coins');
 assert.equal(globalThis.paymentMocks.service.rpc.mock.callCount(),0);
 refund.data.attributes.status='succeeded';await verifyCoinRefund('ref_coins');
 assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments[0],'record_gp_coin_purchase_refund');
});
test('another account cannot inspect or cancel someone else’s purchase',async()=>{
 state.owner='another-seller';
 assert.equal((await status.POST(request('/api/coins/purchases/'+id,{action:'cancel'}),{params:{id}})).status,404);
 assert.equal(globalThis.fetch.mock.callCount(),0);
});
test('signed coin webhooks work when new checkout is disabled; unsigned events cannot credit',async()=>{
 process.env.PAYMENTS_ENABLED='false';
 const raw=JSON.stringify({data:{id:'evt_coin',attributes:{type:'checkout_session.payment.paid',livemode:false,data:{id:'cs_coins',attributes:{}}}}});
 assert.equal((await webhook.POST(new Request('https://gopairph.com/api/webhooks/paymongo',{method:'POST',body:raw}))).status,400);
 const stamp=String(Math.floor(Date.now()/1000));const sig=createHmac('sha256','secret').update(`${stamp}.${raw}`).digest('hex');
 const response=await webhook.POST(new Request('https://gopairph.com/api/webhooks/paymongo',{method:'POST',headers:{'paymongo-signature':`t=${stamp},te=${sig}`},body:raw}));
 assert.equal(response.status,200);assert.equal(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments[0],'fulfill_gp_coin_purchase');
});
test('Flash Deal launch uses the authenticated seller and never a client-supplied balance or fee',async()=>{
 const response=await flash.POST(request('/api/flash-deals',{listingId,price:4400,clientId:id,seller:'someone-else',coins:0,balance:99999}));
 assert.equal(response.status,200);
 assert.deepEqual(globalThis.paymentMocks.service.rpc.mock.calls[0].arguments,['start_flash_deal',{p_seller:'seller',p_listing:listingId,p_price:4400,p_client:id}]);
 assert.equal((await response.json()).listingUrl,'/listings/on-cloud-5');
});
test('failed Flash Deal activation returns the reason and never claims the coins were spent',async()=>{
 state.rpcError={message:'Flash Deals is full right now. Your coins have not been spent.'};
 const response=await flash.POST(request('/api/flash-deals',{listingId,price:4400,clientId:id}));
 assert.equal(response.status,409);assert.match((await response.json()).error,/not been spent/);
});
