import assert from 'node:assert/strict';
import test from 'node:test';
import { isHomepageTopPick, selectHomepageTopPicks } from '../src/lib/homepageTopPicks.ts';

const now = Date.parse('2026-11-01T10:15:00Z');
const hour = 60 * 60 * 1000;
const shoe = (id, overrides = {}) => ({
  id,
  status: 'active',
  has_stock: true,
  listed_in_main_feed: true,
  quality_flagged_at: null,
  sponsored_until: '2026-12-01T00:00:00Z',
  shoe_images: [{ id: `photo-${id}` }],
  ...overrides,
});
const ids = shoes => shoes.map(item => item.id);

test('only available public shoes with photos and a current promotion qualify', () => {
  assert.equal(isHomepageTopPick(shoe('active'), now), true);
  for (const overrides of [
    { status: 'sold' }, { status: 'reserved' }, { status: 'donated' }, { status: 'archived' },
    { has_stock: false }, { listed_in_main_feed: false },
    { quality_flagged_at: '2026-10-31T00:00:00Z' },
    { shoe_images: [] }, { shoe_images: undefined },
    { sponsored_until: null }, { sponsored_until: 'invalid' },
    { sponsored_until: new Date(now).toISOString() },
    { sponsored_until: new Date(now - 1).toISOString() },
  ]) {
    assert.equal(isHomepageTopPick(shoe('ineligible', overrides), now), false, JSON.stringify(overrides));
  }
});

test('cached candidates stop qualifying immediately when their promotion expires', () => {
  const cached = shoe('expiring', { sponsored_until: new Date(now + 1000).toISOString() });
  assert.deepEqual(ids(selectHomepageTopPicks([cached], null, now)), ['expiring']);
  assert.deepEqual(selectHomepageTopPicks([cached], null, now + 1000), []);
});

test('the Featured spotlight and duplicate IDs do not consume Top Pick slots', () => {
  const shoes = ['a', 'b', 'c', 'd', 'e'].map(id => shoe(id));
  assert.deepEqual(ids(selectHomepageTopPicks([...shoes, shoes[1]], 'a', now)), ['b', 'c', 'd', 'e']);
  assert.deepEqual(selectHomepageTopPicks([shoe('a')], 'a', now), []);
  assert.deepEqual(selectHomepageTopPicks([], null, now), []);
});

test('small pools keep a stable order and never add filler listings', () => {
  const shoes = [shoe('c'), shoe('a'), shoe('b')];
  assert.deepEqual(ids(selectHomepageTopPicks(shoes, null, now)), ['a', 'b', 'c']);
  assert.deepEqual(ids(selectHomepageTopPicks(shoes, null, now + hour)), ['a', 'b', 'c']);
  assert.deepEqual(ids(shoes), ['c', 'a', 'b']);
});

test('rotation is stable during an hour and gives every eligible shoe exposure', () => {
  // Include pool sizes divisible by four and sizes that require wrapping.
  for (const count of [5, 6, 8, 9, 15]) {
    const shoes = Array.from({ length: count }, (_, index) => shoe(String(index).padStart(2, '0')));
    const first = ids(selectHomepageTopPicks(shoes, null, now));
    assert.deepEqual(ids(selectHomepageTopPicks([...shoes].reverse(), null, now + 1000)), first);
    assert.notDeepEqual(ids(selectHomepageTopPicks(shoes, null, now + hour)), first);
    const seen = new Set();
    for (let index = 0; index < count; index += 1) {
      const selected = selectHomepageTopPicks(shoes, null, now + index * hour);
      assert.equal(selected.length, 4);
      assert.equal(new Set(ids(selected)).size, 4);
      selected.forEach(item => seen.add(item.id));
    }
    assert.equal(seen.size, count);
  }
});
