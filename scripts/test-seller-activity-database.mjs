import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raw = process.env.SELLER_ACTIVITY_TEST_POSTGRES_URL;
assert.ok(raw, 'Set SELLER_ACTIVITY_TEST_POSTGRES_URL to a disposable local PostgreSQL server.');
const base = new URL(raw);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Only local PostgreSQL is accepted.');
assert.ok(!base.searchParams.has('host'), 'Host overrides are not accepted.');
const database = `gopair_activity_test_${Date.now()}`;
const target = new URL(base); target.pathname = `/${database}`;
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}
run('createdb', [`--maintenance-db=${base.href}`, database]);
try {
  for (const file of [
    'tests/database/seller-activity-fixture.sql',
    'supabase/migrations/063_seller_activity.sql',
    'supabase/migrations/063_seller_activity.sql', // Reapplying is safe.
    'tests/database/seller-activity.sql',
  ]) run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', target.href, '-f', fileURLToPath(new URL(`../${file}`, import.meta.url))]);
  console.log('Seller activity: server time, identity, throttling, forgery protection, anonymous access and idempotent migration passed.');
} finally { run('dropdb', [`--maintenance-db=${base.href}`, database]); }
