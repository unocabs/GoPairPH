import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateEstimator } from '../src/lib/pricing/estimator.ts';
import { estimateRunningShoePrice } from '../src/lib/pricing/runningShoePriceGuide.ts';
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[
    Math.max(0, Math.ceil(values.length * p) - 1)
  ];
const models = [
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
    aliases: [],
    category: 'road',
  },
  {
    id: 'nike-pegasus-41',
    brand: 'Nike',
    name: 'Pegasus 41',
    aliases: [],
    category: 'road',
  },
];
const prices = [6800, 6503, 4437],
  srps = [8500, 9290, 7395];
const references = models.map((m, i) => ({
  id: `frozen-reference-${i}`,
  model_id: m.id,
  source_url: [
    'https://www.adidas.com.ph/adizero-evo-sl-shoes/KJ1363.html',
    'https://www.asics.com/ph/en-ph/novablast-5/p/1011B974-750.html',
    'https://sportscentral.ph/products/nike-men-pegasus-41-road-running-shoes-fd2722-501',
  ][i],
  source_name: 'Frozen Nov 1 retail observation',
  variant: 'See migration 059 for exact colour/SKU',
  regular_price_php: srps[i],
  price_php: prices[i],
  observed_at: '2026-11-01T00:00:00+08:00',
  valid_until: null,
  availability: 'unknown',
  published: true,
}));
const now = new Date('2026-11-01T06:00:00Z');
const base = {
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
const rows = [];
for (const [i, model] of models.entries())
  for (const condition of ['new', 'like_new', 'good', 'fair'])
    for (const age of [
      'under_3_months',
      'three_to_12_months',
      'one_to_two_years',
      'over_two_years',
    ]) {
      const input = {
        ...base,
        brand: model.brand,
        model: model.name,
        retailPricePhp: srps[i],
        condition,
        age,
        mileage: condition === 'new' ? 'unused' : 'twenty_to_80',
        mileageKm: condition === 'new' ? 0 : 20,
      };
      const old = estimateRunningShoePrice(input),
        current = calculateEstimator(input, model, references, [], now);
      assert.ok(
        current.suggestedLow > 0 &&
          current.fastSalePrice <= current.suggestedLow &&
          current.suggestedLow <= current.suggestedPrice &&
          current.suggestedPrice <= current.suggestedHigh &&
          current.suggestedHigh <= prices[i],
      );
      rows.push({
        model: model.name,
        condition,
        age,
        v1_range: [old.suggestedLow, old.suggestedHigh],
        v2_range: [current.suggestedLow, current.suggestedHigh],
        v2_asking_price: current.suggestedPrice,
      });
    }
let report = {
  type: 'synthetic_correctness_only',
  frozen_at: now.toISOString(),
  scenarios: rows.length,
  real_validation_outcomes: 0,
  market_accuracy_proven: false,
  premium_launch: 'blocked_pending_independent_outcomes_and_pilot',
  accepted_provisional_examples: models.map((model, i) => ({
    model: model.name,
    price_php: calculateEstimator(
      {
        ...base,
        brand: model.brand,
        model: model.name,
        retailPricePhp: srps[i],
      },
      model,
      references,
      [],
      now,
    ).suggestedPrice,
  })),
  rows,
};
const index = process.argv.indexOf('--dataset');
if (index !== -1) {
  const dataset = JSON.parse(readFileSync(process.argv[index + 1], 'utf8'));
  assert.ok(
    dataset.holdout?.length >= 50,
    'At least 50 real holdout outcomes are required.',
  );
  assert.ok(
    dataset.policy?.calibration_report && dataset.policy?.frozen_at,
    'Record calibration report and freeze date before evaluating holdout.',
  );
  assert.ok(
    dataset.policy.target_coverage > 0 &&
      dataset.policy.target_coverage <= 1 &&
      dataset.policy.maximum_median_relative_width > 0,
    'Freeze coverage and width policy first.',
  );
  const ids = new Set(),
    sellers = new Set(),
    trainingSellers = new Set(dataset.training.map((row) => row.seller_group));
  const earliest = Math.min(
    ...dataset.holdout.map((row) => Date.parse(row.estimated_at)),
  );
  assert.ok(
    Date.parse(dataset.policy.frozen_at) <= earliest,
    'Coverage policy must predate the holdout.',
  );
  for (const row of dataset.training) {
    assert.ok(
      Date.parse(row.sold_at) < earliest,
      'Training must precede holdout.',
    );
    assert.equal(row.provenance, 'buyer_seller_confirmed');
  }
  const evaluated = dataset.holdout.map((row) => {
    assert.ok(
      !ids.has(row.id) &&
        !sellers.has(row.seller_group) &&
        !trainingSellers.has(row.seller_group),
      'Group/deduplicate sellers and transaction IDs before splitting.',
    );
    ids.add(row.id);
    sellers.add(row.seller_group);
    assert.equal(row.provenance, 'buyer_seller_confirmed');
    assert.ok(
      row.evidence_note?.length >= 10 &&
        Number.isFinite(row.price_php) &&
        row.price_php > 0,
      'Document real final-price provenance.',
    );
    assert.ok(
      Date.parse(row.estimated_at) <= Date.parse(row.sold_at),
      'Estimate must precede the target sale.',
    );
    assert.ok(
      !dataset.training.some((item) => item.id === row.id),
      'Target leakage.',
    );
    const model = dataset.models.find((model) => model.id === row.model_id);
    assert.ok(model, 'Model missing from declared scope.');
    const input = row.input,
      current = calculateEstimator(
        input,
        model,
        dataset.references,
        dataset.training,
        new Date(row.estimated_at),
      );
    const old = estimateRunningShoePrice({
      ...input,
      age: input.age === 'unknown' ? 'one_to_two_years' : input.age,
    });
    const legacy = (old.suggestedLow + old.suggestedHigh) / 2;
    const simple =
      current.basisPhp *
      { new: 0.9, like_new: 0.77, good: 0.65, fair: 0.425 }[input.condition];
    const comparable = dataset.training
      .filter(
        (item) =>
          item.model_id === model.id && item.condition === input.condition,
      )
      .map((item) => Number(item.price_php));
    return {
      model_id: model.id,
      truth: row.price_php,
      legacy_error: Math.abs(legacy - row.price_php),
      current_error: Math.abs(current.suggestedPrice - row.price_php),
      simple_error: Math.abs(simple - row.price_php),
      comparable_error: comparable.length
        ? Math.abs(median(comparable) - row.price_php)
        : null,
      covered:
        row.price_php >= current.suggestedLow &&
        row.price_php <= current.suggestedHigh,
      relative_width:
        (current.suggestedHigh - current.suggestedLow) / row.price_php,
      signed_error: current.suggestedPrice - row.price_php,
    };
  });
  const metrics = (values) => ({
    count: values.length,
    median_percentage_error: median(
      values.map((row) => row.current_error / row.truth),
    ),
    legacy_median_percentage_error: median(
      values.map((row) => row.legacy_error / row.truth),
    ),
    simple_median_percentage_error: median(
      values.map((row) => row.simple_error / row.truth),
    ),
    comparable_median_percentage_error: values.some(
      (row) => row.comparable_error != null,
    )
      ? median(
          values
            .filter((row) => row.comparable_error != null)
            .map((row) => row.comparable_error / row.truth),
        )
      : null,
    median_peso_error: median(values.map((row) => row.current_error)),
    legacy_median_peso_error: median(values.map((row) => row.legacy_error)),
    p90_percentage_error: percentile(
      values.map((row) => row.current_error / row.truth),
      0.9,
    ),
    legacy_p90_percentage_error: percentile(
      values.map((row) => row.legacy_error / row.truth),
      0.9,
    ),
    coverage: values.filter((row) => row.covered).length / values.length,
    median_relative_width: median(values.map((row) => row.relative_width)),
    median_signed_peso_error: median(values.map((row) => row.signed_error)),
  });
  const overall = metrics(evaluated),
    groups = Object.fromEntries(
      dataset.models.map((model) => [
        model.id,
        metrics(evaluated.filter((row) => row.model_id === model.id)),
      ]),
    );
  const accuracyTargetsMet =
    overall.median_percentage_error <=
      overall.legacy_median_percentage_error * 0.8 &&
    overall.median_peso_error < overall.legacy_median_peso_error &&
    overall.p90_percentage_error <=
      overall.legacy_p90_percentage_error * 1.05 &&
    overall.coverage >= dataset.policy.target_coverage &&
    overall.median_relative_width <=
      dataset.policy.maximum_median_relative_width &&
    Object.values(groups).every((group) => group.count >= 10);
  report = {
    type: 'real_outcome_evaluation',
    outcomes: evaluated.length,
    policy: dataset.policy,
    overall,
    groups,
    accuracy_targets_met: accuracyTargetsMet,
    premium_launch:
      'manual_review_required_including_payment_mobile_user_value_and_cost_gates',
  };
}
if (index !== -1)
  assert.ok(
    process.argv.indexOf('--output') >= 0,
    'Pass --output /private/path/report.json.',
  );
const destination =
  index === -1
    ? 'docs/estimator-synthetic-benchmark-2026-11-01.json'
    : process.argv[process.argv.indexOf('--output') + 1];
assert.ok(
  destination && destination !== '--dataset',
  'Pass --output /private/path/report.json for real datasets.',
);
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(
  `${report.type}: ${report.scenarios ?? report.outcomes} cases. Report: ${destination}. This script never enables premium.`,
);
