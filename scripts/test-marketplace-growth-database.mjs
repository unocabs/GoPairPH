import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raw = process.env.GROWTH_TEST_POSTGRES_URL;
assert.ok(raw, 'Set GROWTH_TEST_POSTGRES_URL to a disposable local PostgreSQL server.');
const base = new URL(raw);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Only local PostgreSQL is accepted.');
assert.ok(!base.searchParams.has('host'), 'Host overrides are not accepted.');
const database = `gopair_growth_test_${Date.now()}`;
const target = new URL(base); target.pathname = `/${database}`;
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}
run('createdb', [`--maintenance-db=${base.href}`, database]);
try {
  for (const file of ['tests/database/marketplace-growth-fixture.sql', 'supabase/migrations/060_running_shoe_reviews.sql', 'supabase/migrations/061_marketplace_funnel.sql', 'tests/database/marketplace-growth.sql']) {
    run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', target.href, '-f', fileURLToPath(new URL(`../${file}`, import.meta.url))]);
  }
  console.log('Running-shoe flags, appeals, approval overrides, RLS, cohort ordering, test exclusions and revenue separation passed.');
} finally { run('dropdb', [`--maintenance-db=${base.href}`, database]); }
