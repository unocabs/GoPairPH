import assert from 'node:assert/strict';
import test from 'node:test';
import { compareListingFreshness, getListingFreshnessDate, isFreshListing } from '../src/lib/listingFreshness.ts';

const now = Date.parse('2026-11-01T10:00:00Z');
const older = { created_at: '2026-09-01T00:00:00Z' };

test('renewing old shoes places them ahead of earlier new listings', () => {
  const renewed = { ...older, renewed_at: '2026-11-01T09:00:00Z' };
  const newlyPosted = { created_at: '2026-11-01T08:00:00Z', renewed_at: null };
  assert.deepEqual([older, newlyPosted, renewed].sort(compareListingFreshness), [renewed, newlyPosted, older]);
  assert.equal(isFreshListing(renewed, now), true);
  assert.equal(isFreshListing(newlyPosted, now), true);
  assert.equal(isFreshListing(older, now), false);
  assert.equal(renewed.created_at, older.created_at);
});

test('renewal boost ends after the same 24-hour window as a new listing', () => {
  const renewed = { ...older, renewed_at: '2026-10-31T10:00:00Z' };
  assert.equal(isFreshListing(renewed, now - 1), true);
  assert.equal(isFreshListing(renewed, now), false);
  assert.equal(isFreshListing({ created_at: renewed.renewed_at }, now), false);
});

test('editing details or sending a reminder does not grant a freshness boost', () => {
  const edited = { ...older, updated_at: '2026-11-01T09:00:00Z', renewal_reminder_sent_at: '2026-11-01T09:00:00Z' };
  assert.equal(getListingFreshnessDate(edited), older.created_at);
  assert.equal(isFreshListing(edited, now), false);
});

test('a new listing overtakes an earlier renewal', () => {
  const renewed = { ...older, renewed_at: '2026-11-01T08:00:00Z' };
  const newlyPosted = { created_at: '2026-11-01T09:00:00Z' };
  assert.deepEqual([renewed, newlyPosted].sort(compareListingFreshness), [newlyPosted, renewed]);
});
