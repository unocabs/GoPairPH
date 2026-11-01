import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Own an isolated, socket-only cluster; never load .env or connect to Supabase.
const folder=mkdtempSync(join(tmpdir(),'gopair-feedback-test-'));
const env={...process.env,PGHOST:folder,PGPORT:'55468',PGDATABASE:'postgres',PGUSER:process.env.USER};
delete env.PGSERVICE;delete env.PGHOSTADDR;
function run(cmd,args){const r=spawnSync(cmd,args,{env,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout||r.error?.message);return r.stdout;}
const psql=sql=>run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',sql]).trim();
const literal=value=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
const payload=()=>({submission_id:randomUUID(),category:'price_estimate',message:'Too low',page_path:'/price-guide',price_reason:'too_low',suggested_price_php:5000,
  estimator_snapshot:{engine_version:'retail_formula_v1',input:{brand:'Adidas',model:'Evo SL',condition:'good'},estimate:{suggestedLow:3200,suggestedHigh:4600},reference_price_php:4600,evidence_type:'formula'}});
const submit=(body,key='a'.repeat(64),hash='b'.repeat(64))=>`SELECT submit_product_feedback(${literal(body)},'${key}','${hash}')`;
function race(sql){return new Promise(resolve=>{let output='';const child=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',sql],{env});child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);child.on('close',code=>resolve({code,output}));});}
let started=false;
try {
  run('initdb',['-D',join(folder,'data'),'-A','trust','--no-locale','--encoding=UTF8']);
  run('pg_ctl',['-D',join(folder,'data'),'-l',join(folder,'server.log'),'-o',`-k ${folder} -h '' -p 55468`,'-w','start']);started=true;
  psql(`CREATE EXTENSION "uuid-ossp"; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS 'SELECT NULL::UUID';
    CREATE TABLE profiles(id UUID PRIMARY KEY,user_id UUID); CREATE TABLE shoes(id UUID PRIMARY KEY);
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-f','supabase/migrations/034_feedback_messages.sql']);
  psql("INSERT INTO feedback_messages(message) VALUES ('Historical feedback')");
  run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-f','supabase/migrations/058_price_estimator_feedback.sql']);
  assert.equal(psql("SELECT email_status FROM feedback_messages WHERE message='Historical feedback'"),'legacy');
  const body=payload();const id=psql(`SET ROLE service_role; ${submit(body)}`).split('\n').at(-1);
  assert.equal(psql(`SET ROLE service_role; ${submit(body)}`).split('\n').at(-1),id);
  assert.equal(psql("SELECT count(*) FROM feedback_messages WHERE category='price_estimate'"),'1');
  assert.throws(()=>psql(`SET ROLE service_role; ${submit({...body,message:'Changed'},'a'.repeat(64),'c'.repeat(64))}`),/Feedback request changed/);
  assert.throws(()=>psql(`SET ROLE service_role; ${submit(payload())}`),/try again later/);
  assert.throws(()=>psql(`INSERT INTO feedback_messages(category,message,price_reason,suggested_price_php,estimator_snapshot) VALUES ('price_estimate','bad','too_low',NULL,${literal(body.estimator_snapshot)})`),/check constraint/);
  for(const role of ['anon','authenticated']) {
    assert.throws(()=>psql(`SET ROLE ${role}; SELECT * FROM feedback_messages`),/permission denied/);
    assert.throws(()=>psql(`SET ROLE ${role}; ${submit(payload())}`),/permission denied/);
    assert.throws(()=>psql(`SET ROLE ${role}; INSERT INTO feedback_messages(message) VALUES ('bypass')`),/permission denied/);
    assert.throws(()=>psql(`SET ROLE ${role}; SELECT feedback_overview()`),/permission denied/);
    assert.throws(()=>psql(`SET ROLE ${role}; SELECT claim_feedback_emails()`),/permission denied/);
  }
  const concurrent=payload();const sql=`BEGIN; SET ROLE service_role; ${submit(concurrent,'d'.repeat(64))}; SELECT pg_sleep(0.1); COMMIT;`;
  const dupes=await Promise.all([race(sql),race(sql)]);assert.ok(dupes.every(result=>result.code===0),JSON.stringify(dupes));
  assert.equal(psql(`SELECT count(*) FROM feedback_messages WHERE submission_id='${concurrent.submission_id}'`),'1');
  const leases=await Promise.all([race('SET ROLE service_role; SELECT id FROM claim_feedback_emails()'),race('SET ROLE service_role; SELECT id FROM claim_feedback_emails()')]);
  assert.ok(leases.every(result=>result.code===0),JSON.stringify(leases));
  const claimed=leases.flatMap(result=>result.output.trim().split('\n').filter(line=>/^[a-f0-9-]{36}$/.test(line)));
  assert.equal(claimed.length,2);assert.equal(new Set(claimed).size,2);
  const token=psql(`SELECT email_lease_token FROM feedback_messages WHERE id='${id}'`);
  const delivery={to:['admin@example.com'],subject:'Feedback',html:'Saved content'};
  assert.deepEqual(JSON.parse(psql(`SET ROLE service_role; SELECT snapshot_feedback_email('${id}','${token}',${literal(delivery)})`)),delivery);
  assert.equal(JSON.parse(psql(`SET ROLE service_role; SELECT snapshot_feedback_email('${id}','${token}',${literal({...delivery,subject:'Changed'})})`)).subject,'Feedback');
  assert.equal(psql(`SET ROLE service_role; SELECT finish_feedback_email('${id}','${randomUUID()}','sent')`),'f');
  assert.equal(psql(`SET ROLE service_role; SELECT finish_feedback_email('${id}','${token}','pending')`),'t');
  assert.equal(psql(`SELECT count(*) FROM claim_feedback_emails('${id}')`),'0');
  psql(`UPDATE feedback_messages SET email_next_attempt_at=NOW()-INTERVAL '1 minute' WHERE id='${id}'`);
  assert.equal(psql(`SELECT count(*) FROM claim_feedback_emails('${id}')`),'1');
  const overview=JSON.parse(psql('SET ROLE service_role; SELECT feedback_overview()'));
  assert.equal(overview.total,3);assert.equal(overview.too_low,2);assert.equal(overview.models[0].total,2);
  psql(`INSERT INTO feedback_messages(message, rate_key, created_at) SELECT 'Rate test', repeat('e',64), NOW() - n * INTERVAL '1 minute' FROM generate_series(1,20) n`);
  assert.throws(()=>psql(`SET ROLE service_role; ${submit(payload(),'e'.repeat(64))}`),/try again later/);
  const reversed={...body.estimator_snapshot,reference_price_php:6000};
  assert.throws(()=>psql(`INSERT INTO feedback_messages(category,message,price_reason,suggested_price_php,estimator_snapshot) VALUES ('price_estimate','contradiction','too_low',5000,${literal(reversed)})`),/check constraint/);
  console.log('Feedback SQL constraints, private access, atomic deduplication/rate limits, concurrent email leases, delivery snapshots, retries, and aggregation passed.');
} finally {
  if(started)run('pg_ctl',['-D',join(folder,'data'),'-m','immediate','-w','stop']);
  rmSync(folder,{recursive:true,force:true});
}
