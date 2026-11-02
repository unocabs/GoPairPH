import assert from 'node:assert/strict';
import test from 'node:test';
import { getSellerActivity, SELLER_ACTIVE_WINDOW_MS } from '../src/lib/sellerActivity.ts';

const now = Date.parse('2026-11-02T12:00:00Z');
const ago = elapsed => new Date(now - elapsed).toISOString();

test('active now expires at five minutes, including on an already open page', () => {
  const timestamp = ago(0);
  assert.equal(getSellerActivity(timestamp, now).activeNow, true);
  assert.equal(getSellerActivity(timestamp, now + SELLER_ACTIVE_WINDOW_MS - 1).label, 'Seller active now');
  assert.deepEqual(getSellerActivity(timestamp, now + SELLER_ACTIVE_WINDOW_MS), {
    activeNow: false, relative: '5m ago', label: 'Seller active 5m ago',
  });
});

test('compact activity labels cover minutes, hours, days, months, and years', () => {
  for (const [elapsed, relative] of [
    [25 * 60_000, '25m ago'], [2 * 3_600_000, '2h ago'],
    [3 * 86_400_000, '3d ago'], [90 * 86_400_000, '3mo ago'],
    [730 * 86_400_000, '2y ago'],
  ]) assert.equal(getSellerActivity(ago(elapsed), now).relative, relative);
});

test('unknown, invalid, and future activity uses the listing-date fallback', () => {
  for (const value of [null, undefined, '', 'invalid', ago(-60_000)]) {
    assert.equal(getSellerActivity(value, now), null);
  }
});
