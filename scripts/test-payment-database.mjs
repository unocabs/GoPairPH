import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Only an explicitly local PostgreSQL instance is accepted. Never touch the
// application's Supabase environment or a developer's existing database.
const host = process.env.PGHOST || '/tmp';
if (!['/tmp', '127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Payment database tests require local PostgreSQL.');
if (process.env.PGSERVICE) throw new Error('Unset PGSERVICE before running local database tests.');
if (process.env.PGHOSTADDR && !['127.0.0.1', '::1'].includes(process.env.PGHOSTADDR)) throw new Error('PGHOSTADDR must also be local.');
const database = `gopair_payment_test_${process.pid}`;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = { ...process.env, PGHOST: host, PGDATABASE: database };
function run(command, args, input) {
  const result = spawnSync(command, args, { env, cwd: root, input, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || `${command} failed`);
  return result.stdout;
}
function psql(sql) { return run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql]); }
function race(sql) {
  return new Promise(resolve => {
    const child = spawn('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { env, cwd: root });
    let output = '';
    child.stdout.on('data', value => { output += value; }); child.stderr.on('data', value => { output += value; });
    child.on('error', error => resolve({ code: 1, output: error.message }));
    child.on('exit', code => resolve({ code, output }));
  });
}
run('createdb', [database]);
try {
  for (const file of ['tests/database/payment-fixture.sql', 'supabase/migrations/044_featured_promotion_orders.sql', 'supabase/migrations/045_gp_coins.sql', 'supabase/migrations/050_sponsored_promotion_orders.sql', 'supabase/migrations/053_paymongo_promotion_payments.sql', 'tests/database/promotion-payments.sql']) {
    run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-f', file]);
  }
  const results = await Promise.all([
    race("SELECT create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','top_pick',7,0,FALSE)"),
    race("SELECT create_promotion_checkout('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000006','top_pick',7,0,FALSE)"),
  ]);
  assert.equal(results.filter(result => result.code === 0).length, 1, JSON.stringify(results));
  assert.match(results.find(result => result.code !== 0).output, /slots are full/);
  assert.equal(psql('SELECT COUNT(*) FROM sponsored_promotion_orders WHERE status=\'reserved\'').trim(), '1');
  psql("SELECT create_promotion_checkout('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000002','featured',7,0,FALSE)");
  psql(`GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT ON profiles TO authenticated;
    SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',FALSE);
    DO $$ BEGIN ASSERT (SELECT COUNT(*)=0 FROM promotion_payments); END $$; RESET ROLE;`);
  console.log('Payment SQL, RLS and concurrent slot reservation tests passed.');
} finally { run('dropdb', [database]); }
