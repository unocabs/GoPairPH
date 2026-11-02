import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBrowseSections } from '../src/lib/browseSections.ts';

const shoes = count => Array.from({ length: count }, (_, index) => ({ id: String(index) }));
const nearYou = rows => Object.fromEntries(rows.map(shoe => [shoe.id, { matchesSize: false, nearYou: true }]));

test('unfiltered matching inventory fills Discover More after four recommendations', () => {
  const inventory = shoes(115);
  const visible = inventory.slice(0, 24);
  const sections = buildBrowseSections(visible, true, nearYou(visible));
  assert.deepEqual(sections, [
    { kind: 'recommended', shoes: visible.slice(0, 4) },
    { kind: 'discover', shoes: visible.slice(4) },
  ]);
  assert.equal(inventory.length, 115, 'section grouping must not remove unloaded inventory');
});

test('Load more appends to Discover More even when every shoe matches the profile', () => {
  const inventory = shoes(48);
  const badges = nearYou(inventory);
  const initial = buildBrowseSections(inventory.slice(0, 24), true, badges);
  const loaded = buildBrowseSections(inventory, true, badges);
  assert.deepEqual(loaded.map(section => section.kind), ['recommended', 'discover']);
  assert.deepEqual(loaded[0], initial[0], 'recommendations stay fixed while discovery grows');
  assert.deepEqual(loaded[1].shoes, inventory.slice(4));
  assert.deepEqual(loaded[1].shoes.slice(0, 20), initial[1].shoes, 'existing discovery shoes keep their order');
  assert.equal(new Set(loaded.flatMap(section => section.shoes.map(shoe => shoe.id))).size, 48);
});

test('discovery includes both extra matches and other shoes in their existing order', () => {
  const visible = shoes(12);
  const matches = visible.filter((_, index) => index % 2 === 0);
  const sections = buildBrowseSections(visible, true, nearYou(matches));
  assert.deepEqual(sections[0].shoes.map(shoe => shoe.id), ['0', '2', '4', '6']);
  assert.deepEqual(sections[1].shoes.map(shoe => shoe.id), ['1', '3', '5', '7', '8', '9', '10', '11']);
  assert.equal(sections.flatMap(section => section.shoes).length, visible.length);
});

test('disabled personalization and zero matches retain one ordinary grid in the existing order', () => {
  const visible = shoes(4);
  assert.deepEqual(buildBrowseSections(visible, false, nearYou(visible)), [{ kind: 'all', shoes: visible }]);
  assert.deepEqual(buildBrowseSections(visible, true, {}), [{ kind: 'all', shoes: visible }]);
  assert.deepEqual(buildBrowseSections([], true, {}), []);
});

test('matching flagged shoes stay in discovery without duplicates or changed ordering', () => {
  const visible = [...shoes(2), { id: 'flagged', running_relevance_flagged: true }];
  const before = structuredClone(visible);
  const sections = buildBrowseSections(visible, true, nearYou(visible));
  assert.deepEqual(sections.map(section => section.shoes.map(shoe => shoe.id)), [['0', '1'], ['flagged']]);
  assert.deepEqual(visible, before);
  assert.ok(sections.every(section => section.shoes.length > 0));
});
