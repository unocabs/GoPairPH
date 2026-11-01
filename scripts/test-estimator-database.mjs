import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Own an isolated, socket-only cluster; never load .env or connect to Supabase.
const folder = mkdtempSync(join(tmpdir(), 'gopair-estimator-test-'));
const env = {
  ...process.env,
  PGHOST: folder,
  PGPORT: '55469',
  PGDATABASE: 'postgres',
  PGUSER: process.env.USER,
};
delete env.PGSERVICE;
delete env.PGHOSTADDR;
function run(cmd, args) {
  const r = spawnSync(cmd, args, { env, encoding: 'utf8' });
  if (r.status !== 0) throw Error(r.stderr || r.stdout || r.error?.message);
  return r.stdout;
}
const psql = (sql) =>
  run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]).trim();
const literal = (value) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
function race(sql) {
  return new Promise((resolve) => {
    let output = '';
    const child = spawn(
      'psql',
      ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { env },
    );
    child.stdout.on('data', (x) => (output += x));
    child.stderr.on('data', (x) => (output += x));
    child.on('close', (code) => resolve({ code, output }));
  });
}
let started = false;
try {
  run('initdb', [
    '-D',
    join(folder, 'data'),
    '-A',
    'trust',
    '--no-locale',
    '--encoding=UTF8',
  ]);
  run('pg_ctl', [
    '-D',
    join(folder, 'data'),
    '-l',
    join(folder, 'server.log'),
    '-o',
    `-k ${folder} -h '' -p 55469`,
    '-w',
    'start',
  ]);
  started = true;
  psql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
 CREATE TABLE profiles(id UUID PRIMARY KEY); GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  run('psql', [
    '-X',
    '-q',
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    'supabase/migrations/059_estimator_platform.sql',
  ]);
  const user = randomUUID(),
    other = randomUUID();
  psql(`INSERT INTO auth.users VALUES('${user}'),('${other}')`);
  const input = { brand: 'Adidas', model: 'Evo SL' },
    result = { version: 'retail_evidence_v2', suggestedPrice: 4500 };
  const save = (
    owner = user,
    key = randomUUID(),
    identity = 'adidas-evo-sl',
    parent = null,
  ) =>
    `SELECT to_jsonb(save_estimator_estimate('${owner}','${key}','${identity}',${literal(input)},${literal(result)},'retail_evidence_v2',${parent ? `'${parent}'` : 'NULL'}))`;
  const first = JSON.parse(psql(save()));
  assert.equal(
    JSON.parse(psql(`SELECT estimator_access('${user}')`)).freeAvailable,
    true,
  );
  assert.throws(
    () => psql('UPDATE estimator_settings SET premium_enabled=TRUE'),
    /check constraint/,
  );
  psql(
    "UPDATE estimator_settings SET premium_enabled=TRUE,quality_approved=TRUE,independent_outcomes=50,benchmark_report='LOCAL TEST FIXTURE ONLY, NOT A REAL VALIDATION REPORT'",
  );
  const concurrent = await Promise.all([race(save()), race(save())]);
  assert.equal(concurrent.filter((r) => r.code === 0).length, 1);
  const trial = psql(
    `SELECT estimate_id FROM estimator_trials WHERE user_id='${user}'`,
  );
  const correction = JSON.parse(
    psql(save(user, randomUUID(), 'adidas-evo-sl', trial)),
  );
  assert.equal(correction.parent_id, trial);
  assert.throws(
    () => psql(save(user, randomUUID(), 'nike-pegasus-41', trial)),
    /Premium access required/,
  );
  psql(
    `UPDATE estimator_estimates SET created_at=NOW()-INTERVAL '25 hours' WHERE id='${trial}'`,
  );
  assert.throws(
    () => psql(save(user, randomUUID(), 'adidas-evo-sl', correction.id)),
    /Premium access required/,
  );
  const requestId = first.request_id;
  assert.equal(JSON.parse(psql(save(user, requestId))).id, first.id);
  for (const role of ['anon', 'authenticated']) {
    assert.throws(
      () => psql(`SET ROLE ${role}; ${save()}`),
      /permission denied/,
    );
    assert.throws(
      () =>
        psql(
          `SET ROLE ${role}; UPDATE estimator_settings SET premium_enabled=TRUE`,
        ),
      /permission denied/,
    );
  }
  assert.equal(
    psql(
      `SET ROLE authenticated; SET request.jwt.claim.sub='${other}'; SELECT count(*) FROM estimator_estimates`,
    ),
    '0',
  );
  const start = (plan = 'monthly', live = false) =>
    JSON.parse(
      psql(`SELECT start_estimator_payment('${user}','${plan}',${live})`),
    );
  const payment = start();
  assert.equal(payment.amount_minor, 5000);
  assert.equal(start().id, payment.id);
  assert.equal(start().create_checkout, false);
  assert.throws(() => start('permanent'), /existing checkout/);
  assert.throws(() => start('monthly', true), /configuration mismatch/);
  const fulfill = (
    p,
    checkout = 'cs_test',
    paid = 'pay_test',
    amount = 5000,
    mode = false,
  ) =>
    psql(
      `SELECT fulfill_estimator_payment('${p.id}','${checkout}','${paid}',${amount},${mode})`,
    );
  assert.throws(
    () => fulfill(payment, 'cs_test', 'pay_test', 60000),
    /Payment mismatch/,
  );
  const fulfillRace = await Promise.all([
    race(
      `SELECT fulfill_estimator_payment('${payment.id}','cs_test','pay_test',5000,false)`,
    ),
    race(
      `SELECT fulfill_estimator_payment('${payment.id}','cs_test','pay_test',5000,false)`,
    ),
  ]);
  assert.ok(
    fulfillRace.every((result) => result.code === 0),
    JSON.stringify(fulfillRace),
  );
  fulfill(payment);
  assert.equal(
    psql(
      `SELECT count(*) FROM estimator_access_grants WHERE payment_id='${payment.id}'`,
    ),
    '1',
  );
  assert.equal(
    JSON.parse(psql(`SELECT estimator_access('${user}')`)).active,
    true,
  );
  psql('UPDATE estimator_settings SET livemode=TRUE');
  assert.equal(
    JSON.parse(psql(`SELECT estimator_access('${user}')`)).active,
    false,
  );
  psql('UPDATE estimator_settings SET livemode=FALSE');
  const renewal = start();
  fulfill(renewal, 'cs_renew', 'pay_renew');
  assert.equal(
    psql(
      `SELECT a.ends_at=b.starts_at FROM estimator_access_grants a JOIN estimator_access_grants b ON a.payment_id='${payment.id}' AND b.payment_id='${renewal.id}'`,
    ),
    't',
  );
  assert.equal(
    psql(
      "SELECT ((TIMESTAMPTZ '2028-01-31 12:00:00+08' AT TIME ZONE 'Asia/Manila')+INTERVAL '1 month')::DATE",
    ),
    '2028-02-29',
  );
  const refund = (p, id, amount, pay) =>
    psql(
      `SELECT refund_estimator_payment('${p.id}','${pay}','${id}',${amount},false)`,
    );
  refund(payment, 'ref_partial', 1000, 'pay_test');
  assert.equal(
    psql(
      `SELECT revoked FROM estimator_access_grants WHERE payment_id='${payment.id}'`,
    ),
    'f',
  );
  refund(payment, 'ref_rest', 4000, 'pay_test');
  refund(payment, 'ref_rest', 4000, 'pay_test');
  assert.equal(
    psql(
      `SELECT revoked FROM estimator_access_grants WHERE payment_id='${payment.id}'`,
    ),
    't',
  );
  assert.equal(
    psql(
      `SELECT revoked FROM estimator_access_grants WHERE payment_id='${renewal.id}'`,
    ),
    'f',
  );
  assert.throws(
    () => refund(payment, 'ref_excess', 1, 'pay_test'),
    /exceeds payment/,
  );
  const late=JSON.parse(psql(`SELECT start_estimator_payment('${other}','monthly',false)`));
  psql(`SELECT attach_estimator_checkout('${late.id}','cs_late','https://checkout.paymongo.com/late',false)`);
  psql(`SELECT expire_estimator_payment('${late.id}','cs_late',false)`);
  fulfill(late,'cs_late','pay_late');
  assert.equal(JSON.parse(psql(`SELECT estimator_access('${other}')`)).active,true);
  const permanent = start('permanent');
  fulfill(permanent, 'cs_permanent', 'pay_permanent', 60000);
  assert.equal(
    JSON.parse(psql(`SELECT estimator_access('${user}')`)).permanent,
    true,
  );
  assert.equal(
    psql(
      `SELECT ends_at IS NULL FROM estimator_access_grants WHERE payment_id='${permanent.id}'`,
    ),
    't',
  );
  assert.throws(() => start(), /already has permanent/);
  assert.equal(psql('SELECT count(*) FROM claim_estimator_sources()'), '0');
  assert.throws(
    () =>
      psql(
        'UPDATE estimator_sources SET fetch_enabled=TRUE,permission_confirmed=TRUE',
      ),
    /check constraint/,
  );
  psql(
    "UPDATE estimator_sources SET fetch_enabled=TRUE,permission_confirmed=TRUE,permission_note='Local test permission fixture'",
  );
  const claimed = await Promise.all([
    race('SELECT id FROM claim_estimator_sources()'),
    race('SELECT id FROM claim_estimator_sources()'),
  ]);
  const ids = claimed.flatMap((r) =>
    r.output
      .trim()
      .split('\n')
      .filter((x) => /^[a-f0-9-]{36}$/.test(x)),
  );
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.equal(
    psql('SELECT count(*) FROM estimator_retail_references WHERE published'),
    '3',
  );
  console.log(
    'Estimator SQL passed: free-trial race, fixed correction deadline, private history, service-only writes, fixed prices, mode isolation, payment dedupe, renewal extension, refund isolation, permanent grants, and source leases.',
  );
} finally {
  if (started)
    run('pg_ctl', [
      '-D',
      join(folder, 'data'),
      '-m',
      'immediate',
      '-w',
      'stop',
    ]);
  rmSync(folder, { recursive: true, force: true });
}
