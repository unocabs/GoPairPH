import assert from 'node:assert/strict';
import test from 'node:test';
import { runningShoesFirst } from '../src/lib/runningShoeReviews.ts';

test('only explicitly flagged shoes move; normal running shoes keep their existing order', () => {
  const normal = [{ id: 'fresh' }, { id: 'matched', running_relevance_flagged: false }, { id: 'older' }];
  assert.deepEqual(runningShoesFirst(normal), normal);
  const rows = [
    { id: 'flagged-sponsored', running_relevance_flagged: true, sponsored_until: '2099-01-01' },
    normal[0], normal[1], { id: 'flagged-cheapest', running_relevance_flagged: true, price_php: 1 }, normal[2],
  ];
  assert.deepEqual(runningShoesFirst(rows).map(row => row.id), ['fresh', 'matched', 'older', 'flagged-sponsored', 'flagged-cheapest']);
  assert.equal(rows[0].id, 'flagged-sponsored', 'does not mutate cached input');
  assert.deepEqual(runningShoesFirst([]), []);
});
