import assert from 'node:assert/strict';
import test from 'node:test';
import { installGrowthMocks } from './helpers/growth-runtime.mjs';
installGrowthMocks();
const reviews = await import('../src/app/api/listings/[listingId]/running-review/route.ts');
const queue = await import('../src/app/api/admin/running-reviews/route.ts');
const funnel = await import('../src/app/api/admin/marketplace-funnel/route.ts');
const listing = '00000000-0000-4000-8000-000000000011';
const context = { params: { listingId: listing } };
function request(path, body, origin = 'https://example.test') {
  return new Request(`https://example.test${path}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
function setup({ signedIn = true, admin = false, rpcError = null } = {}) {
  const calls = [];
  const profileQuery = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: listing, is_admin: admin } }; } };
  globalThis.growthMocks = {
    serviceCalls: 0, invalidations: [],
    client: { auth: { getUser: async () => ({ data: { user: signedIn ? { id: listing } : null } }) }, from: () => profileQuery,
      rpc: async (...args) => { calls.push(args); return { error: rpcError }; } },
    service: { rpc: async (...args) => { calls.push(args); return { data: { viewed_listings: 5 }, error: rpcError }; } },
  };
  return calls;
}
test('appeals validate origin, identity, authentication and body before calling the database', async () => {
  let calls = setup({ signedIn: false });
  assert.equal((await reviews.POST(request('/review', { action: 'appeal', note: 'Supporting running shoe details.' }), context)).status, 401);
  assert.equal(calls.length, 0);
  calls = setup();
  assert.equal((await reviews.POST(request('/review', { action: 'approve' }, 'https://other.test'), context)).status, 403);
  assert.equal((await reviews.POST(request('/review', { action: 'delete' }), context)).status, 400);
  assert.equal((await reviews.POST(request('/review', { action: 'appeal', note: 'x'.repeat(1001) }), context)).status, 400);
  assert.equal((await reviews.POST(request('/review', { action: 'appeal' }), { params: { listingId: 'invalid' } })).status, 400);
  assert.equal(calls.length, 0);
});
test('database rejection cannot claim approval or invalidate discovery; successful review invalidates all placements', async () => {
  let calls = setup({ rpcError: { message: 'Admin only' } });
  assert.equal((await reviews.POST(request('/review', { action: 'approve' }), context)).status, 400);
  assert.equal(globalThis.growthMocks.invalidations.length, 0);
  calls = setup();
  assert.equal((await reviews.POST(request('/review', { action: 'appeal', note: ' Manufacturer running reference. ' }), context)).status, 200);
  assert.deepEqual(calls[0], ['review_running_shoe', { p_listing: listing, p_action: 'appeal', p_note: 'Manufacturer running reference.' }]);
  assert.ok(globalThis.growthMocks.invalidations.some(args => args[0] === 'homepage-listings'));
  assert.ok(globalThis.growthMocks.invalidations.some(args => args[0] === '/browse'));
});
test('anonymous and non-admin users cannot read review queues, analytics or alter test exclusions', async () => {
  for (const options of [{ signedIn: false }, { admin: false }]) {
    setup(options);
    assert.equal((await queue.GET(new Request('https://example.test/queue'))).status, 403);
    assert.equal((await funnel.GET(new Request('https://example.test/funnel'))).status, 403);
    assert.equal((await funnel.PATCH(request('/funnel', { profile_id: listing, excluded: true }))).status, 403);
    assert.equal(globalThis.growthMocks.serviceCalls, 0);
  }
});
test('admin analytics bounds windows, avoids public caching and reports unavailable migrations honestly', async () => {
  const calls = setup({ admin: true });
  assert.equal((await funnel.GET(new Request('https://example.test/funnel?days=100000'))).status, 400);
  const response = await funnel.GET(new Request('https://example.test/funnel?days=7'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls[0], ['marketplace_funnel_overview', { p_days: 7 }]);
  setup({ admin: true, rpcError: { message: 'missing function' } });
  assert.equal((await funnel.GET(new Request('https://example.test/funnel'))).status, 503);
});
