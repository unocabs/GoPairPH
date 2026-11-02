import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const host=process.env.PGHOST||'/tmp';
assert.ok(['/tmp','127.0.0.1','localhost','::1'].includes(host),'Only local PostgreSQL is accepted.');
assert.ok(!process.env.PGSERVICE,'Unset PGSERVICE.');
assert.ok(!process.env.PGHOSTADDR||['127.0.0.1','::1'].includes(process.env.PGHOSTADDR),'Only local PostgreSQL is accepted.');
const database=`gopair_flash_test_${process.pid}`;
const cwd=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env={...process.env,PGHOST:host,PGDATABASE:database};
function run(cmd,args){const r=spawnSync(cmd,args,{cwd,env,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.error?.message||r.stdout);return r.stdout;}
function race(sql){return new Promise(resolve=>{let output='';const p=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',sql],{cwd,env});p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>output+=x);p.on('error',error=>resolve({code:1,output:error.message}));p.on('close',code=>resolve({code,output}));});}
run('createdb',[database]);
try{
  for(const file of ['tests/database/payment-fixture.sql','supabase/migrations/044_featured_promotion_orders.sql','supabase/migrations/045_gp_coins.sql','supabase/migrations/050_sponsored_promotion_orders.sql','supabase/migrations/053_paymongo_promotion_payments.sql','tests/database/flash-deals-fixture.sql','supabase/migrations/062_flash_deals_and_coin_purchases.sql','tests/database/flash-deals.sql'])run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-f',file]);
  const sql="SELECT start_flash_deal('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001',4400,'dddddddd-dddd-4ddd-8ddd-dddddddddddd')";
  const results=await Promise.all([race(sql),race(sql)]);
  assert.ok(results.every(item=>item.code===0),JSON.stringify(results));
  const count=run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',"SELECT COUNT(*) FROM gp_coin_transactions WHERE metadata->>'action'='flash_deal'"]).trim();
  assert.equal(count,'1','Concurrent retries spent coins twice.');
  console.log('Flash Deals SQL, coin purchase verification, refunds, RLS, offer pricing and concurrent retries passed.');
}finally{run('dropdb',[database]);}
