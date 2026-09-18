import assert from 'node:assert/strict';
import test from 'node:test';
import { getListingAvailability } from '../src/lib/listingAvailability.ts';

// Run with Node 22+: node --experimental-strip-types --test tests/listing-availability.test.mjs
const active = { status: 'active', shop_id: null, has_stock: true, inventory_mode: 'single' };

test('active community shoes allow requests', () => {
  assert.deepEqual(getListingAvailability(active), { unavailable: false, canRequest: true, label: 'Available' });
});

for (const [status, label] of [['sold', 'Sold'], ['donated', 'Claimed'], ['archived', 'Unavailable']]) {
  test(`${status} shoes lead to alternatives and cannot be requested`, () => {
    assert.deepEqual(getListingAvailability({ ...active, status }), { unavailable: true, canRequest: false, label });
  });
}

test('reserved shoes retain their existing request-management flow', () => {
  assert.deepEqual(getListingAvailability({ ...active, status: 'reserved', shop_id: 'shop', has_stock: false }), {
    unavailable: false, canRequest: false, label: 'Reserved',
  });
});

test('single-stock shops cannot accept orders when out of stock', () => {
  assert.deepEqual(getListingAvailability({ ...active, shop_id: 'shop', has_stock: false }), {
    unavailable: true, canRequest: false, label: 'Out of stock',
  });
});

for (const shoe_variants of [undefined, [], [{ quantity: 0 }]]) {
  test(`multi-size shops with no available size cannot accept orders (${JSON.stringify(shoe_variants)})`, () => {
    assert.deepEqual(getListingAvailability({ ...active, shop_id: 'shop', inventory_mode: 'multi', shoe_variants }), {
      unavailable: true, canRequest: false, label: 'Out of stock',
    });
  });
}

test('multi-size shops allow an order when at least one size is in stock', () => {
  assert.deepEqual(getListingAvailability({
    ...active, shop_id: 'shop', inventory_mode: 'multi', shoe_variants: [{ quantity: 0 }, { quantity: 2 }],
  }), { unavailable: false, canRequest: true, label: 'Available' });
});

test('the explicit stock flag takes precedence over stale variant quantities', () => {
  assert.equal(getListingAvailability({
    ...active, shop_id: 'shop', has_stock: false, inventory_mode: 'multi', shoe_variants: [{ quantity: 2 }],
  }).canRequest, false);
});
