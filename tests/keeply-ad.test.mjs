import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as keeplyAd from '../src/lib/keeplyAd.ts';
import { allowsKeeplyAnalytics, isKeeplyActivation, KEEPLY_AD_PARAMS, KEEPLY_AD_URL } from '../src/lib/keeplyAd.ts';

const consentCommand = (...args) => (function () { return arguments; })(...args);

test('campaign destination and event parameters contain only the approved static attribution', () => {
  assert.equal(KEEPLY_AD_URL, 'https://www.keeplyph.com/demo?utm_source=gopairph&utm_medium=referral&utm_campaign=gopair_home_banner');
  assert.deepEqual(KEEPLY_AD_PARAMS, {
    advertiser: 'keeply', placement: 'homepage_promo_first',
    campaign: 'gopair_home_banner', link_domain: 'www.keeplyph.com',
  });
});

test('primary/keyboard click and middle auxclick each count through just one event path', () => {
  for (const sequence of [
    [['click', 0]], // native mouse/touch/Enter click
    [['click', 0], ['auxclick', 0]], // a non-middle auxclick must not double count
    [['auxclick', 1]],
  ]) {
    assert.equal(sequence.filter(([type, button]) => isKeeplyActivation(type, button, true)).length, 1);
  }
  assert.equal(isKeeplyActivation('click', 0, false), false);
  assert.equal(isKeeplyActivation('auxclick', 2, true), false);
  assert.equal(isKeeplyActivation('keydown', 0, true), false);
  assert.equal(isKeeplyActivation('transitionend', 0, true), false);
});

test('explicit analytics opt-out always suppresses sending', () => {
  assert.equal(allowsKeeplyAnalytics([], true), false);
  assert.equal(allowsKeeplyAnalytics([consentCommand('consent', 'update', { analytics_storage: 'granted' })], true), false);
});

test('declined consent is honoured for both default and update commands', () => {
  for (const command of ['default', 'update']) {
    assert.equal(allowsKeeplyAnalytics([consentCommand('consent', command, { analytics_storage: 'denied' })], false), false);
  }
});

test('read current consent on each activation; never replay declined clicks after consent', () => {
  const queue = [consentCommand('consent', 'default', { analytics_storage: 'denied' })];
  assert.equal(allowsKeeplyAnalytics(queue, false), false);
  queue.push(consentCommand('consent', 'update', { analytics_storage: 'granted' }));
  assert.equal(allowsKeeplyAnalytics(queue, false), true);
  queue.push(consentCommand('consent', 'update', { ad_storage: 'denied' }));
  assert.equal(allowsKeeplyAnalytics(queue, false), true);
  queue.push(consentCommand('consent', 'update', { analytics_storage: 'denied' }));
  assert.equal(allowsKeeplyAnalytics(queue, false), false);
});

test('preserves existing no-CMP policy and ignores unrelated or malformed queue entries', () => {
  for (const queue of [undefined, null, {}, [], [null, 3, {}, { event: 'page_view' }]]) {
    assert.equal(allowsKeeplyAnalytics(queue, false), true);
  }
});

// Run the actual analytics wrapper with browser globals, without contacting GA.
const analyticsSource = ts.transpileModule(
  readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function analyticsRuntime(window, navigator = {}) {
  const context = { window, navigator, exports: {}, require: () => keeplyAd };
  vm.runInNewContext(analyticsSource, context);
  return context.exports;
}

test('repeat activations send repeat events with exactly the static payload', () => {
  const sent = [];
  const analytics = analyticsRuntime({ gtag: (...args) => sent.push(args) });
  analytics.trackKeeplyAdClick();
  analytics.trackKeeplyAdClick();
  assert.equal(sent.length, 2);
  for (const args of sent) {
    assert.deepEqual(JSON.parse(JSON.stringify(args)), ['event', 'keeply_ad_click', KEEPLY_AD_PARAMS]);
  }
});

test('missing, throwing and server-side trackers cannot throw into navigation', () => {
  for (const window of [undefined, {}, { gtag: () => { throw Error('blocked'); } }]) {
    assert.doesNotThrow(() => analyticsRuntime(window).trackKeeplyAdClick());
  }
});

test('a tracker that never finishes is not awaited', () => {
  const analytics = analyticsRuntime({ gtag: () => new Promise(() => {}) });
  assert.equal(analytics.trackKeeplyAdClick(), undefined);
});

test('consent denial, GA disable, DNT and GPC prevent any tracker calls', () => {
  let sent = 0;
  for (const [settings, privacy] of [
    [{ dataLayer: [consentCommand('consent', 'update', { analytics_storage: 'denied' })] }, {}],
    [{ 'ga-disable-G-LH99NEKGMC': true }, {}],
    [{}, { doNotTrack: '1' }],
    [{}, { globalPrivacyControl: true }],
  ]) {
    analyticsRuntime({ gtag: () => sent++, ...settings }, privacy).trackKeeplyAdClick();
  }
  assert.equal(sent, 0);
});
