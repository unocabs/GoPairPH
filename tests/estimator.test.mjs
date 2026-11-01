import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculateEstimator,
  matchEstimatorModel,
  isFreshReference,
} from '../src/lib/pricing/estimator.ts';
import {
  extractRetailOffer,
  permittedRetailUrl,
  fetchRetailOffer,
} from '../src/lib/pricing/retailImport.ts';
const now = new Date('2026-11-01T06:00:00Z');
export const models = [
  {
    id: 'adidas-evo-sl',
    brand: 'Adidas',
    name: 'Adizero Evo SL',
    aliases: ['Evo SL'],
    category: 'road',
  },
  {
    id: 'asics-novablast-5',
    brand: 'Asics',
    name: 'Novablast 5',
    aliases: ['Novablast5'],
    category: 'road',
  },
  {
    id: 'nike-pegasus-41',
    brand: 'Nike',
    name: 'Pegasus 41',
    aliases: ['Pegasus41'],
    category: 'road',
  },
];
const prices = [6800, 6503, 4437],
  srps = [8500, 9290, 7395],
  anchors = [4500, 4300, 2900];
export const refs = models.map((m, i) => ({
  id: `ref${i}`,
  model_id: m.id,
  source_url: 'https://www.adidas.com.ph/product',
  source_name: 'Retail fixture',
  variant: 'Specific colour',
  regular_price_php: srps[i],
  price_php: prices[i],
  observed_at: '2026-11-01T00:00:00+08:00',
  valid_until: null,
  availability: 'unknown',
  published: true,
}));
export const input = {
  brand: 'Adidas',
  model: 'Evo SL',
  retailPricePhp: 8500,
  condition: 'good',
  mileage: 'twenty_to_80',
  mileageKm: 20,
  age: 'three_to_12_months',
  demand: 'normal',
  urgency: 'balanced',
  hasBox: true,
  hasReceipt: true,
  hasVisibleFlaws: false,
};
const calc = (patch = {}, references = refs, sales = []) =>
  calculateEstimator({ ...input, ...patch }, models[0], references, sales, now);
for (let i = 0; i < 3; i++)
  test(`${models[i].name}: accepted 20km provisional anchor ₱${anchors[i]}`, () => {
    const result = calculateEstimator(
      {
        ...input,
        brand: models[i].brand,
        model: models[i].name,
        retailPricePhp: srps[i],
      },
      models[i],
      refs,
      [],
      now,
    );
    assert.equal(result.suggestedPrice, anchors[i]);
    assert.equal(result.confidence, 'low');
    assert.equal(result.evidenceType, 'retail_reference');
  });
for (const model of models)
  for (const condition of ['new', 'like_new', 'good', 'fair'])
    for (const age of [
      'under_3_months',
      'three_to_12_months',
      'one_to_two_years',
      'over_two_years',
    ])
      test(`${model.name}, ${condition}, ${age}: bounded, ordered guidance`, () => {
        const i = models.indexOf(model),
          value = {
            ...input,
            brand: model.brand,
            model: model.name,
            retailPricePhp: srps[i],
            condition,
            age,
            mileageKm: condition === 'new' ? 0 : 20,
            mileage: condition === 'new' ? 'unused' : 'twenty_to_80',
          };
        const r = calculateEstimator(value, model, refs, [], now);
        assert.ok(r.fastSalePrice <= r.suggestedLow);
        assert.ok(
          r.suggestedLow <= r.suggestedPrice &&
            r.suggestedPrice <= r.suggestedHigh,
        );
        assert.ok(r.suggestedHigh <= prices[i]);
        assert.ok(r.suggestedLow > 0);
      });
test('wear, age, flaws and condition never increase the price', () => {
  let previous = Infinity;
  for (const mileageKm of [0, 20, 50, 100, 200, 500, 1000]) {
    const r = calc({ mileageKm });
    assert.ok(r.suggestedPrice <= previous);
    previous = r.suggestedPrice;
  }
  previous = Infinity;
  for (const age of [
    'under_3_months',
    'three_to_12_months',
    'one_to_two_years',
    'over_two_years',
  ]) {
    const r = calc({ age });
    assert.ok(r.suggestedPrice <= previous);
    previous = r.suggestedPrice;
  }
  assert.ok(
    calc({ hasVisibleFlaws: true }).suggestedPrice < calc().suggestedPrice,
  );
  previous = Infinity;
  for (const condition of ['new', 'like_new', 'good', 'fair']) {
    const r = calc({ condition, mileage: 'unused', mileageKm: 0 });
    assert.ok(r.suggestedPrice <= previous);
    previous = r.suggestedPrice;
  }
});
test('demand, urgency, receipt, box and desired asking price cannot inflate market value', () => {
  const base = calc();
  for (const patch of [
    { demand: 'popular' },
    { urgency: 'best_price' },
    { urgency: 'sell_fast' },
    { hasBox: false, hasReceipt: false },
    { askingPricePhp: 20000 },
  ])
    assert.equal(calc(patch).suggestedPrice, base.suggestedPrice);
  assert.equal(
    calc({ askingPricePhp: 10000 }).assessment.label,
    'Above the suggested range',
  );
  assert.equal(
    calc({ askingPricePhp: 1000 }).assessment.label,
    'Below the suggested range',
  );
  assert.equal(
    calc({ askingPricePhp: 4500 }).assessment.label,
    'Within the suggested range',
  );
});
test('generation and variant identity are exact, case and documented aliases normalize', () => {
  assert.equal(
    matchEstimatorModel({ brand: 'ADIDAS', model: 'adidas EVO SL' }, models)
      ?.id,
    models[0].id,
  );
  for (const model of [
    'Evo SL Woven',
    'Evo SL EXO',
    'Evo SL 2',
    'Adios Pro Evo 1',
  ])
    assert.equal(matchEstimatorModel({ brand: 'Adidas', model }, models), null);
  assert.equal(
    matchEstimatorModel({ brand: 'Nike', model: 'Evo SL' }, models),
    null,
  );
});
test('stale, expired, future, unpublished and sold-out retail offers fail closed', () => {
  for (const patch of [
    { observed_at: '2026-09-01T00:00:00Z' },
    { observed_at: '2026-12-01T00:00:00Z' },
    { valid_until: '2026-10-31T00:00:00Z' },
    { published: false },
    { availability: 'out_of_stock' },
  ]) {
    const ref = { ...refs[0], ...patch };
    assert.equal(isFreshReference(ref, now), false);
    assert.equal(calc({}, [ref]).evidenceType, 'user_retail');
    assert.equal(calc({}, [ref]).basisPhp, 8500);
  }
});
test('unknown model and unknown wear are explicit low-evidence fallback', () => {
  const r = calculateEstimator(
    {
      ...input,
      model: 'Unknown',
      mileage: 'unknown',
      mileageKm: null,
      age: 'unknown',
    },
    null,
    refs,
    [],
    now,
  );
  assert.equal(r.reference, null);
  assert.equal(r.confidence, 'low');
  assert.ok(r.warnings.some((w) => w.includes('Unknown mileage')));
});
test('contradictory inputs and nonfinite values are rejected', () => {
  for (const patch of [
    { condition: 'new', mileageKm: 20 },
    { retailPricePhp: NaN },
    { retailPricePhp: 0 },
    { mileageKm: -1 },
    { mileageKm: Infinity },
    { askingPricePhp: -1 },
  ])
    assert.throws(() => calc(patch));
});
const sales = Array.from({ length: 5 }, (_, i) => ({
  id: `sale${i}`,
  model_id: models[0].id,
  condition: 'good',
  price_php: 4200 + i * 100,
  sold_at: '2026-10-20T00:00:00Z',
  seller_group: `seller${i}`,
  provenance: 'buyer_seller_confirmed',
}));
test('only five independent confirmed, recent, model/condition matched outcomes promote evidence', () => {
  assert.equal(calc({}, refs, sales).evidenceType, 'sold_comparables');
  assert.equal(calc({}, refs, sales).confidence, 'medium');
  for (const patch of [
    { seller_group: 'same' },
    { provenance: 'seller_reported' },
    { condition: 'new' },
    { model_id: models[1].id },
    { sold_at: '2025-10-20T00:00:00Z' },
    { sold_at: '2027-01-01T00:00:00Z' },
  ])
    assert.notEqual(
      calc(
        {},
        refs,
        sales.map((s) => ({ ...s, ...patch })),
      ).evidenceType,
      'sold_comparables',
    );
});
test('isolated outlier cannot dominate the comparable estimate', () => {
  const base = calc({}, refs, sales);
  const outlier = calc({}, refs, [
    ...sales,
    { ...sales[0], id: 'outlier', seller_group: 'other', price_php: 500000 },
  ]);
  assert.equal(outlier.suggestedPrice, base.suggestedPrice);
});
const source = {
  sku: 'FD2722-501',
  url: 'https://sportscentral.ph/products/test',
};
const product = (patch = {}, offer = {}) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', sku: 'FD2722-501', offers: { '@type': 'Offer', price: 4437, priceCurrency: 'PHP', availability: 'https://schema.org/InStock', ...offer }, ...patch })}</script>`;
test('structured import requires exact SKU and PHP; invalid and ambiguous offers do not publish', () => {
  assert.deepEqual(extractRetailOffer(product(), source), {
    price: 4437,
    availability: 'available',
    validUntil: null,
  });
  for (const html of [
    product({ sku: 'FD2722-502' }),
    product({}, { priceCurrency: 'USD' }),
    product({}, { price: 0 }),
    product({}, { '@type': 'AggregateOffer', lowPrice: 4437 }),
    '<html>₱4,437</html>',
    product() + product({}, { price: 5000 }),
  ])
    assert.throws(() => extractRetailOffer(html, source));
});
test('import handles graph, expiry dates, stock and invalid JSON safely', () => {
  const p = JSON.parse(product().match(/>(.*)</)[1]);
  assert.equal(
    extractRetailOffer(
      `<script type="application/ld+json">${JSON.stringify({ '@graph': [p] })}</script>`,
      source,
    ).price,
    4437,
  );
  assert.equal(
    extractRetailOffer(
      product(
        {},
        {
          priceValidUntil: '2026-11-01',
          availability: 'https://schema.org/OutOfStock',
        },
      ),
      source,
    ).validUntil,
    '2026-11-01T16:00:00.000Z',
  );
  assert.throws(() =>
    extractRetailOffer(
      '<script type="application/ld+json">not JSON</script>',
      source,
    ),
  );
});
test('source URLs reject credentials, ports, foreign domains and non-HTTPS', async () => {
  for (const url of [
    'http://www.adidas.com.ph/x',
    'https://www.adidas.com.ph.attacker.com/x',
    'https://user:pass@www.adidas.com.ph/x',
    'https://www.adidas.com.ph:123/x',
    'https://127.0.0.1/x',
  ]) {
    assert.equal(permittedRetailUrl(url), false);
    await assert.rejects(fetchRetailOffer({ ...source, url }));
  }
  assert.equal(permittedRetailUrl(source.url), true);
});

test('manual billing preview matches Manila month-end clamping and UTC storage', async () => {
  const { monthlyExpiry } = await import('../src/lib/pricing/billingDates.ts');
  assert.equal(
    monthlyExpiry('2027-01-31T04:00:00Z'),
    '2027-02-28T04:00:00.000Z',
  );
  assert.equal(
    monthlyExpiry('2028-01-31T04:00:00Z'),
    '2028-02-29T04:00:00.000Z',
  );
  assert.equal(
    monthlyExpiry('2026-12-31T15:59:59Z'),
    '2027-01-31T15:59:59.000Z',
  );
  assert.throws(() => monthlyExpiry('invalid'));
});

test('history cursor retains microsecond precision and rejects query injection', async () => {
  const { historyCursor, parseHistoryCursor } = await import(
    '../src/lib/pricing/historyCursor.ts'
  );
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    created_at: '2026-11-01T01:02:03.123456+00:00',
  };
  assert.equal(parseHistoryCursor(historyCursor(row)).date, row.created_at);
  assert.equal(parseHistoryCursor('2026-11-01T00:00:00Z|not-a-uuid'), null);
  assert.equal(
    parseHistoryCursor('2026-11-01T00:00:00Z),user_id.eq.other|' + row.id),
    null,
  );
});

test('legitimate retail discounts do not flag an accurately entered original SRP', () => {
  const result = calculateEstimator(
    {
      ...input,
      brand: models[1].brand,
      model: models[1].name,
      retailPricePhp: 9290,
    },
    models[1],
    refs,
    [],
    now,
  );
  assert.ok(
    !result.warnings.some((warning) => warning.includes('SRP differs')),
  );
  assert.equal(
    calc({ retailPricePhp: 100000 }).suggestedPrice,
    calc().suggestedPrice,
  );
});
test('nonfinite sale observations and unknown wear cannot manufacture confidence', () => {
  assert.notEqual(
    calc(
      {},
      refs,
      sales.map((row) => ({ ...row, price_php: NaN })),
    ).evidenceType,
    'sold_comparables',
  );
  assert.equal(
    calc({ age: 'unknown', mileage: 'unknown', mileageKm: null }, refs, sales)
      .confidence,
    'low',
  );
});
