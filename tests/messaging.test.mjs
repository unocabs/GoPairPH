import assert from 'node:assert/strict';
import { beforeEach, afterEach, test, mock } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { installMessagingMocks } from './helpers/messaging-runtime.mjs';
installMessagingMocks();
const inbox = await import('../src/app/api/messages/route.ts');
const thread = await import('../src/app/api/messages/[id]/route.ts');
const offers = await import('../src/app/api/offers/route.ts');
const status = await import('../src/app/api/purchase-requests/[id]/status/route.ts');
const cron = await import('../src/app/api/admin/notifications/process/route.ts');
const { deliverNotification, processNotifications } = await import('../src/lib/notifications.ts');
const { resolvePostSignInPath } = await import('../src/lib/auth/postSignInRedirect.ts');
const { messageQuestions, purchaseStatusLabel } = await import('../src/lib/messaging/config.ts');
const originalEnv = { ...process.env };
const id = '11111111-1111-4111-8111-111111111111';
let user, queryData, queryError;
function query() {
  const q = new Proxy({}, { get(_, key) { if (key==='then') return (resolve,reject)=>Promise.resolve({data:queryData,error:queryError}).then(resolve,reject); return ()=>q; } });
  return q;
}
const req = (path, body, origin='https://gopairph.com')=>new Request('https://gopairph.com'+path,{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
beforeEach(()=>{
  user={id:'test-auth'};queryData={id};queryError=null;
  const service={from:mock.fn(query),rpc:mock.fn(async(name,args)=>({data:name==='notification_delivery_snapshot'?args.p_delivery:name==='prepare_chat_notification'?[{id}]:[],error:null})),auth:{admin:{getUserById:async()=>({data:{user:{email:'test@example.invalid'}},error:null})}}};
  globalThis.chatMocks={service,client:{...service,auth:{getUser:async()=>({data:{user},error:null})}},email:mock.fn(async()=> 'sent')};
  process.env.CRON_SECRET='isolated-test-secret';process.env.RESEND_API_KEY='isolated-test-key';
});
afterEach(()=>{process.env={...originalEnv};});

test('private APIs reject logged-out callers and cross-origin mutations without writing',async()=>{
  user=null;
  assert.equal((await inbox.GET(new Request('https://gopairph.com/api/messages'))).status,401);
  assert.equal((await inbox.POST(req('/api/messages',{listing_id:id,client_id:id,body:'Hi'}))).status,401);
  user={id:'test'};
  assert.equal((await inbox.POST(req('/api/messages',{listing_id:id,client_id:id,body:'Hi'},'https://evil.example'))).status,403);
  assert.equal(globalThis.chatMocks.client.rpc.mock.callCount(),0);
});
test('message sends use authenticated RPC and preserve client retry identity',async()=>{
  globalThis.chatMocks.client.rpc=mock.fn(async()=>({data:{id,conversation_id:id},error:null}));
  const response=await inbox.POST(req('/api/messages',{listing_id:id,client_id:id,body:'  Can you ship?  '}));
  assert.equal(response.status,200);
  assert.deepEqual(globalThis.chatMocks.client.rpc.mock.calls[0].arguments,['chat_send',{p_listing:id,p_client_id:id,p_body:'Can you ship?'}]);
});
test('oversized payloads, invalid cursors and spoofed system actions cannot reach messaging RPCs',async()=>{
  assert.equal((await inbox.POST(req('/api/messages',{listing_id:id,client_id:id,body:'x'.repeat(13000)}))).status,400);
  assert.equal((await inbox.GET(new Request('https://gopairph.com/api/messages?before=invalid'))).status,400);
  const r=new Request('https://gopairph.com/api/messages/'+id,{method:'PATCH',body:JSON.stringify({action:'system',body:'Accepted'})});
  assert.equal((await thread.PATCH(r,{params:{id}})).status,400);
  assert.equal(globalThis.chatMocks.client.rpc.mock.callCount(),0);
});
test('offer endpoints share atomic creation and version-aware transitions; they do not send duplicate emails',async()=>{
  globalThis.chatMocks.client.rpc=mock.fn(async()=>({data:{id,conversation_id:id},error:null}));
  assert.equal((await offers.POST(req('/api/offers',{listing_id:id,client_id:id,offer_price_php:4500}))).status,200);
  assert.equal(globalThis.chatMocks.client.rpc.mock.calls[0].arguments[0],'marketplace_submit_offer');
  assert.equal((await status.POST(req('/api/purchase-requests/'+id+'/status',{action:'accept',version:3}),{params:{id}})).status,200);
  assert.equal(globalThis.chatMocks.client.rpc.mock.calls[1].arguments[1].p_expected_version,3);
  assert.equal(globalThis.chatMocks.email.mock.callCount(),0);
});
test('cron fails closed with absent/wrong secret and does not claim jobs when email is unconfigured',async()=>{
  delete process.env.CRON_SECRET;
  assert.equal((await cron.GET(new Request('https://gopairph.com/test'))).status,401);
  process.env.CRON_SECRET='isolated-test-secret';delete process.env.RESEND_API_KEY;
  assert.equal((await cron.GET(new Request('https://gopairph.com/test',{headers:{authorization:'Bearer isolated-test-secret'}}))).status,503);
  assert.equal(globalThis.chatMocks.service.rpc.mock.callCount(),0);
});
test('read-before-send cancels chat email; recipient cooldown defers without acknowledging the job',async()=>{
  const job={id,kind:'chat',recipient_id:id,lease_token:id,payload:{}};
  globalThis.chatMocks.service.rpc=mock.fn(async()=>({data:[],error:null}));
  assert.equal(await deliverNotification(job),'skipped');
  globalThis.chatMocks.service.rpc=mock.fn(async()=>({data:null,error:null}));
  assert.equal(await deliverNotification(job),'deferred');
  assert.equal(globalThis.chatMocks.email.mock.callCount(),0);
});
test('chat retries use stable provider identity and omit private message bodies',async()=>{
  const job={id,kind:'chat',recipient_id:id,lease_token:id,payload:{}};
  await deliverNotification(job);await deliverNotification(job);
  const calls=globalThis.chatMocks.email.mock.calls;
  assert.equal(calls[0].arguments[0].idempotencyKey,`notification/${id}`);
  assert.deepEqual(calls[0].arguments,calls[1].arguments);
  assert.match(calls[0].arguments[0].html,/Open your messages/);
});
test('delivery failures are returned to the durable retry queue without marking sent',async()=>{
  const job={id,kind:'chat',recipient_id:id,lease_token:id,payload:{}};
  globalThis.chatMocks.service.rpc=mock.fn(async(name,args)=>({data:name==='claim_notification_jobs'?[job]:name==='prepare_chat_notification'?[{id}]:name==='notification_delivery_snapshot'?args.p_delivery:null,error:null}));
  globalThis.chatMocks.email=mock.fn(async()=>{throw new Error('provider timeout');});
  assert.deepEqual(await processNotifications(),{sent:0,skipped:0,retrying:1,deferred:0});
  const finish=globalThis.chatMocks.service.rpc.mock.calls.filter(c=>c.arguments[0]==='finish_notification_job');
  assert.equal(finish.length,1);assert.equal(finish[0].arguments[1].p_status,'pending');
});
test('transactional suppression closes a notification as skipped',async()=>{
  globalThis.chatMocks.email=mock.fn(async()=> 'suppressed');
  assert.equal(await deliverNotification({id,kind:'chat',recipient_id:id,lease_token:id,payload:{}}),'skipped');
});
test('sign-in resumes messages and buying for active sellers without dashboard queries',async()=>{
  const client={from(){throw new Error('Context should be preserved before profile lookup');}};
  for(const destination of ['/messages?conversation='+id,'/messages?listing='+id,'/buying?tab=reserved']) assert.equal(await resolvePostSignInPath(client,'test',destination),destination);
});
test('question shortcuts respect fixed/free listings and withdrawal labels distinguish seller declines',()=>{
  assert.equal(messageQuestions('for_sale',false).some(x=>/negotiable/.test(x)),false);
  assert.equal(messageQuestions('donate',true).some(x=>/price/.test(x)),false);
  assert.equal(purchaseStatusLabel('declined','buyer_withdrew'),'Withdrawn');
  assert.equal(purchaseStatusLabel('declined','seller_declined'),'Declined');
});
test('weekly reporting is removed and saved-search has a daily schedule',()=>{
  const crons=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')).crons;
  assert.equal(crons.some(j=>j.path==='/api/admin/reports/listing-views'),false);
  assert.equal(existsSync(new URL('../src/app/api/admin/reports/listing-views/route.ts',import.meta.url)),false);
  assert.equal(crons.find(j=>j.path==='/api/saved-search-alerts/daily').schedule,'0 2 * * *');
  assert.equal(crons.some(j=>j.schedule==='* * * * *'),false,'Frequent dispatcher must not break Vercel Hobby deployments');
});
