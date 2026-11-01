import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const raw=process.env.MESSAGING_TEST_POSTGRES_URL;
if(!raw) throw new Error('Set MESSAGING_TEST_POSTGRES_URL to a disposable local PostgreSQL server. Production is never used.');
const base=new URL(raw);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Only a local PostgreSQL server is accepted');
const host=base.searchParams.get('host');assert.ok(!host||host.startsWith('/'),'Remote host overrides are not allowed');
const database='gopair_chat_test_'+Date.now();
const target=new URL(base);target.pathname='/'+database;
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',env:process.env});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout;}
const psql=(sql)=>run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-d',target.href,'-c',sql]);
function race(sql){return new Promise(resolve=>{let output='';const p=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-d',target.href,'-c',sql]);p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>output+=x);p.on('close',code=>resolve({code,output}));});}
run('createdb',['--maintenance-db='+base.href,database]);
try {
  for(const file of ['tests/database/messaging-fixture.sql','supabase/migrations/055_messaging_and_notification_queue.sql','supabase/migrations/056_marketplace_chat_offers.sql','supabase/migrations/057_notification_collectors.sql'])run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-d',target.href,'-f',fileURLToPath(new URL('../'+file,import.meta.url))]);
  const activation=readFileSync(new URL('../supabase/setup/notification-dispatch.sql',import.meta.url),'utf8');
  psql(activation.split('-- BEGIN MARKETPLACE LOCKDOWN')[1].split('-- END MARKETPLACE LOCKDOWN')[0]);
  run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-d',target.href,'-f',fileURLToPath(new URL('../tests/database/messaging.sql',import.meta.url))]);
  psql(`INSERT INTO profiles (id,user_id) VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    INSERT INTO shoes (id,seller_id,inventory_mode) VALUES ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','multi');
    INSERT INTO shoe_variants (id,shoe_id,size_eu,quantity) VALUES ('66666666-6666-4666-8666-666666666666','55555555-5555-4555-8555-555555555555',42,2);
    SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',FALSE);
    SELECT marketplace_submit_offer('55555555-5555-4555-8555-555555555555','dddddddd-dddd-4ddd-8ddd-dddddddddddd',NULL,4500,'66666666-6666-4666-8666-666666666666');`);
  const request=psql('SELECT id FROM purchase_requests').trim();
  const auth="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',FALSE);";
  const results=await Promise.all([race(`BEGIN; ${auth} SELECT accept_purchase_request('${request}'); SELECT pg_sleep(0.2); COMMIT;`),race(`BEGIN; ${auth} SELECT accept_purchase_request('${request}'); COMMIT;`)]);
  assert.ok(results.every(r=>r.code===0),JSON.stringify(results));
  assert.equal(psql('SELECT quantity FROM shoe_variants').trim(),'1','Concurrent accept consumed stock twice');
  assert.equal(psql("SELECT COUNT(*) FROM chat_messages WHERE kind='offer' AND body LIKE '%accepted%'").trim(),'1');
  console.log('Messaging SQL, RLS, unread episodes, cooldown, durable retries, and concurrent stock checks passed.');
} finally {run('dropdb',['--maintenance-db='+base.href,database]);}
