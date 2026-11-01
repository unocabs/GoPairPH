import assert from 'node:assert/strict';
import { beforeEach, afterEach, test, mock } from 'node:test';
import { installFeedbackMocks } from './helpers/feedback-runtime.mjs';
installFeedbackMocks();
const { priceFeedbackSchema, priceFeedbackSnapshot } = await import('../src/lib/pricing/feedbackValidation.ts');
const { estimateRunningShoePrice, PRICE_GUIDE_ENGINE_VERSION } = await import('../src/lib/pricing/runningShoePriceGuide.ts');
const route = await import('../src/app/api/price-estimator/feedback/route.ts');
const admin = await import('../src/app/api/admin/feedback/route.ts');
const { processFeedbackEmails } = await import('../src/lib/feedbackServer.ts');
const { renderFeedbackEmail } = await import('../src/lib/email/feedback.ts');
const { buildPriceFeedbackReview } = await import('../src/lib/pricing/feedbackReview.ts');
const { feedbackComment } = await import('../src/lib/feedback.ts');
const input = { brand:'Adidas', model:'Evo SL', retailPricePhp:6800, condition:'good', mileage:'twenty_to_80', age:'three_to_12_months', demand:'normal', urgency:'balanced', hasBox:true, hasReceipt:true, hasVisibleFlaws:false };
const reference = estimateRunningShoePrice(input).suggestedHigh;
const valid = () => ({ submission_id:'11111111-1111-4111-8111-111111111111', engine_version:PRICE_GUIDE_ENGINE_VERSION, reason:'too_low', suggested_price_php:reference+500, message:'I sold similar shoes for more.', price_choice:'suggested_range', reference_price_php:reference, input:{...input} });
const req = (body, origin='https://gopairph.com') => new Request('https://gopairph.com/api/price-estimator/feedback', { method:'POST', headers:{origin}, body:JSON.stringify(body) });
const originalEnv = {...process.env};
let state;
beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-test-key';
  state = { user:null, admin:false, profileError:null, jobs:[], rows:[], rpcError:null };
  const service = {
    rpc:mock.fn(async name=>({data:name==='submit_product_feedback'?'22222222-2222-4222-8222-222222222222':name==='claim_feedback_emails'?state.jobs:name==='feedback_overview'?{total:0,new:0,too_low:0,too_high:0,models:[]}:true,error:state.rpcError})),
    from() {
      const q={select(){return q;},eq(){return q;},order(){return q;},range(){return q;},update(){return q;},maybeSingle(){return q;},
        then(resolve){return Promise.resolve({data:state.user?{id:'33333333-3333-4333-8333-333333333333',is_admin:state.admin}:null,error:state.profileError,count:0}).then(resolve);}};
      return q;
    },
  };
  globalThis.feedbackMocks = { service, client:{...service, auth:{getUser:async()=>({data:{user:state.user},error:null})}}, email:mock.fn(async()=>'sent') };
});
afterEach(()=>{process.env={...originalEnv};});

test('reason and suggested price are required, finite and consistent with the reviewed price',()=>{
  assert.equal(priceFeedbackSchema.safeParse(valid()).success,true);
  for(const patch of [{reason:undefined},{reason:'fine'},{suggested_price_php:undefined},{suggested_price_php:0},{suggested_price_php:Infinity},{suggested_price_php:reference},{reason:'too_high'},{suggested_price_php:1_000_001},{input:{...input,retailPricePhp:-10}}]) {
    assert.equal(priceFeedbackSchema.safeParse({...valid(),...patch}).success,false,JSON.stringify(patch));
  }
  assert.equal(priceFeedbackSchema.safeParse({...valid(),reason:'too_high',suggested_price_php:reference-500}).success,true);
});
test('server recomputes snapshot and rejects fabricated references or stale engine versions',()=>{
  assert.deepEqual(priceFeedbackSnapshot(priceFeedbackSchema.parse({...valid(),estimate:{suggestedHigh:1}})).estimate,estimateRunningShoePrice(input));
  assert.equal(priceFeedbackSchema.safeParse({...valid(),reference_price_php:reference+100}).success,false);
  assert.equal(priceFeedbackSchema.safeParse({...valid(),engine_version:'old-engine'}).success,false);
  const fast=estimateRunningShoePrice(input).fastSalePrice;
  assert.equal(priceFeedbackSchema.safeParse({...valid(),price_choice:'fast_sale',reference_price_php:fast,suggested_price_php:fast+100}).success,true);
});
test('anonymous feedback saves the actual shoe snapshot with hashed rate identity; supplied user/output fields cannot override it',async()=>{
  const response=await route.POST(req({...valid(),user_id:'attacker',estimate:{suggestedHigh:1}}));
  assert.equal(response.status,201);
  const args=globalThis.feedbackMocks.service.rpc.mock.calls[0].arguments[1];
  assert.equal(args.p_payload.user_id,null);
  assert.equal(args.p_payload.estimator_snapshot.estimate.suggestedHigh,reference);
  assert.equal(args.p_payload.estimator_snapshot.input.hasReceipt,true);
  assert.equal(args.p_payload.estimator_snapshot.input.retailPricePhp,6800);
  assert.equal(args.p_payload.estimator_snapshot.reference_price_php,reference);
  assert.equal(args.p_payload.suggested_price_php,reference+500);
  assert.equal(args.p_payload.message,'I sold similar shoes for more.');
  assert.match(args.p_rate_key,/^[a-f0-9]{64}$/);
  assert.match(args.p_request_hash,/^[a-f0-9]{64}$/);
});
test('cross-origin, oversized and malformed feedback cannot write; database failures never claim success',async()=>{
  assert.equal((await route.POST(req(valid(),'https://evil.example'))).status,403);
  assert.equal((await route.POST(req({...valid(),message:'x'.repeat(13000)}))).status,400);
  assert.equal((await route.POST(req({...valid(),reason:''}))).status,400);
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(),0);
  state.rpcError={message:'Please try again later'};
  assert.equal((await route.POST(req(valid()))).status,429);
  state.rpcError={message:'relation does not exist'};
  const response=await route.POST(req(valid()));
  assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/relation/);
});
test('admin feedback reads and review updates fail closed for anonymous and non-admin users',async()=>{
  for(const user of [null,{id:'user',email:'user@example.com'}]) {
    state.user=user;
    assert.equal((await admin.GET(new Request('https://gopairph.com/api/admin/feedback'))).status,403);
    assert.equal((await admin.PATCH(req({id:valid().submission_id,status:'reviewed'}))).status,403);
  }
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.callCount(),0);
});
test('admin filters reject unbounded/invalid pagination; status changes and missing records have explicit outcomes',async()=>{
  state.user={id:'admin'};state.admin=true;
  assert.equal((await admin.GET(new Request('https://gopairph.com/api/admin/feedback?page=-1'))).status,400);
  assert.equal((await admin.GET(new Request('https://gopairph.com/api/admin/feedback?category=price_estimate&status=new'))).status,200);
  assert.equal((await admin.PATCH(req({id:valid().submission_id,status:'reviewed'}))).status,200);
  assert.equal((await admin.PATCH(req({id:valid().submission_id,status:'sent'}))).status,400);
});
test('email retry preserves the saved feedback and stable delivery content; unconfigured mail stays pending',async()=>{
  const row={id:valid().submission_id,email_lease_token:'lease',category:'price_estimate',message:'test',contact_email:null,page_path:'/price-guide',price_reason:'too_low',suggested_price_php:reference+500,estimator_snapshot:priceFeedbackSnapshot(valid()),email_delivery:null};
  state.jobs=[row];
  globalThis.feedbackMocks.service.rpc=mock.fn(async(name,args)=>{
    if(name==='claim_feedback_emails')return{data:state.jobs,error:null};
    if(name==='snapshot_feedback_email'){row.email_delivery??=args.p_delivery;return{data:row.email_delivery,error:null};}
    return{data:true,error:null};
  });
  globalThis.feedbackMocks.email=mock.fn(async()=>{throw Error('provider timeout');});
  assert.equal((await processFeedbackEmails()).retrying,1);
  const first=globalThis.feedbackMocks.email.mock.calls[0].arguments[0];
  assert.equal(first.idempotencyKey,`feedback/${row.id}`);
  assert.match(first.html,/Review feedback in admin/);
  assert.equal(globalThis.feedbackMocks.service.rpc.mock.calls.at(-1).arguments[1].p_status,'pending');
  globalThis.feedbackMocks.email=mock.fn(async()=>'sent');
  assert.equal((await processFeedbackEmails()).sent,1);
  assert.deepEqual(globalThis.feedbackMocks.email.mock.calls[0].arguments[0],first);
  globalThis.feedbackMocks.email=mock.fn(async()=>'unconfigured');
  assert.equal((await processFeedbackEmails()).retrying,1);
});
test('feedback email escapes untrusted model, comment and contact values',()=>{
  const snapshot=priceFeedbackSnapshot(valid());snapshot.input.model='<img src=x onerror=alert(1)>';
  const html=renderFeedbackEmail({category:'price_estimate',message:'<script>alert(1)</script>',contactEmail:'<bad>',profileName:null,listingTitle:null,listingUrl:null,pagePath:'/price-guide',snapshot,priceReason:'too_low',suggestedPricePhp:5000});
  assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
});

test('admin comparisons preserve submitted SRP and app output rather than recalculating; differences use the reviewed price',()=>{
  const snapshot=priceFeedbackSnapshot(valid());
  snapshot.input.retailPricePhp=8500;
  snapshot.estimate={...snapshot.estimate,suggestedLow:4200,suggestedHigh:4800,fastSalePrice:3900};
  snapshot.reference_price_php=4500;
  const review=buildPriceFeedbackReview(snapshot,'5400');
  assert.equal(review.originalSrp,8500);assert.equal(review.appPrice,4500);assert.equal(review.userPrice,5400);
  assert.equal(review.differencePhp,900);assert.equal(review.differencePercent,20);
  assert.match(review.differenceLabel,/900 higher \(\+20%\)/);
  assert.match(review.metrics[0].value,/8,500/);
  assert.match(review.metrics[1].hint,/52.9%/);
  assert.match(review.prices[0].value,/4,200.*4,800/);
  assert.match(review.prices[1].value,/3,900/);
  assert.equal(review.details.find(row=>row.label==='Receipt available').value,'Yes');
  assert.equal(review.details.find(row=>row.label==='Reported mileage').value,'20–80 km');
  assert.equal(review.details.find(row=>row.label==='Visible flaws reported').value,'No');
  snapshot.price_choice='fast_sale';snapshot.reference_price_php=3900;
  const lower=buildPriceFeedbackReview(snapshot,3500);
  assert.equal(lower.differencePhp,-400);
  assert.match(lower.differenceLabel,/400 lower \(−10.3%\)/);
  assert.equal(lower.prices[2].value,'Fast-sale suggestion');
});

test('missing prices or comments are explicit, never silently shown as zero or synthesized user opinions',()=>{
  const snapshot=priceFeedbackSnapshot(valid());snapshot.input.retailPricePhp=0;
  const review=buildPriceFeedbackReview(snapshot,null);
  assert.equal(review.originalSrp,null);assert.equal(review.userPrice,null);assert.equal(review.differencePercent,null);
  assert.equal(review.metrics[0].value,'Not recorded');assert.equal(review.metrics[1].hint,'');
  assert.equal(feedbackComment('Too low','too_low'),'No additional comment provided.');
  assert.equal(feedbackComment('   ','too_high'),'No additional comment provided.');
  assert.equal(feedbackComment('I sold these for 5000.','too_low'),'I sold these for 5000.');
});

test('new admin emails include SRP, the complete app/user price comparison, useful shoe context and the actual comment',()=>{
  const snapshot=priceFeedbackSnapshot(valid());
  const html=renderFeedbackEmail({category:'price_estimate',message:'I sold these for more.',contactEmail:null,profileName:null,listingTitle:null,listingUrl:null,pagePath:'/price-guide',snapshot,priceReason:'too_low',suggestedPricePhp:reference+500});
  for(const label of ['Original SRP entered','App resale price reviewed','User’s suggested price','App suggested resale range','App fast-sale suggestion','Reported mileage','Box included','Receipt available','Visible flaws reported','User comment'])assert.ok(html.includes(label),label);
  assert.match(html,/6,800/);assert.match(html,/500 higher/);assert.match(html,/I sold these for more\./);
});
