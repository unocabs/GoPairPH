import assert from 'node:assert/strict';
import test from 'node:test';
import { getBrowseRotation, orderBrowseRotation } from '../src/lib/browseRotation.ts';
import { captureBrowsePosition, restoreBrowsePosition } from '../src/lib/browseScroll.ts';

test('Load more preserves mixed-order prefixes instead of reshuffling older inventory', () => {
  const inventory = Array.from({ length: 115 }, (_, index) => ({ id: `shoe-${index}` }));
  const first = orderBrowseRotation(inventory, '2026-11-02');
  const next = orderBrowseRotation([...inventory].reverse(), '2026-11-02');
  assert.deepEqual(next.slice(0, 24), first.slice(0, 24));
  assert.deepEqual(next.slice(0, 48), first.slice(0, 48));
  assert.notDeepEqual(first, orderBrowseRotation(inventory, '2026-11-03'));
  assert.equal(inventory[0].id, 'shoe-0');
});

test('pagination pins the rotation across Philippines midnight', () => {
  const rotation = getBrowseRotation(undefined, new Date('2026-11-01T15:59:59Z'));
  assert.equal(rotation, '2026-11-01');
  assert.equal(getBrowseRotation(rotation, new Date('2026-11-01T16:00:01Z')), rotation);
  assert.equal(getBrowseRotation('invalid', new Date('2026-11-01T16:00:01Z')), '2026-11-02');
});

function screen() {
  const view = { scrollX: 0, scrollY: 1200, innerHeight: 800,
    scrollTo(options) { this.scrollX = options.left; this.scrollY = options.top; this.lastScroll = options; } };
  const positions = new Map([['previous', 800], ['visible', 1150], ['last', 1550]]);
  const doc = { querySelectorAll() { return [...positions].map(([id, y]) => ({
    getAttribute() { return id; },
    getBoundingClientRect() { return { top: y - view.scrollY, bottom: y - view.scrollY + 300 }; },
  })); } };
  return { view, doc, positions };
}

test('appending a batch restores the same viewport even if the browser followed the moving button', () => {
  const { view, doc, positions } = screen();
  const before = captureBrowsePosition(doc, view);
  positions.set('new', 1900);
  view.scrollY = 4500;
  restoreBrowsePosition(before, doc, view);
  assert.equal(view.scrollY, 1200);
  assert.equal(view.lastScroll.behavior, 'instant');
  assert.equal(captureBrowsePosition(doc, view).anchor.top, before.anchor.top);
});

test('new recommendations inserted above discovery keep the viewed shoe at the same screen offset', () => {
  const { view, doc, positions } = screen();
  const before = captureBrowsePosition(doc, view);
  for (const [id, top] of positions) positions.set(id, top + 650);
  restoreBrowsePosition(before, doc, view);
  assert.equal(view.scrollY, 1850);
  assert.deepEqual(captureBrowsePosition(doc, view).anchor, before.anchor);
});

test('a removed listing or an empty page falls back to the saved scroll position', () => {
  const { view, doc, positions } = screen();
  const before = captureBrowsePosition(doc, view);
  positions.clear(); view.scrollY = 4500;
  restoreBrowsePosition(before, doc, view);
  assert.equal(view.scrollY, 1200);
  assert.equal(captureBrowsePosition(doc, view).anchor, null);
});
