import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installFeedbackMocks } from './helpers/feedback-runtime.mjs';
installFeedbackMocks();
const {
  INITIAL_PRICE_GUIDE_INPUT,
  normalizeGuideBrand,
  guideBrandChoice,
  guideMileageBucket,
  guideStepError,
  restoreGuideDraft,
} = await import('../src/lib/pricing/priceGuideWizard.ts');
const valid = {
  ...INITIAL_PRICE_GUIDE_INPUT,
  brand: 'Adidas',
  model: 'Adizero Evo SL',
  retailPricePhp: 8500,
  mileageKm: 20,
  mileage: 'twenty_to_80',
  age: 'three_to_12_months',
  hasBox: true,
  hasReceipt: true,
};
test('brand dropdown restores canonical brand spellings and preserves custom brands', () => {
  for (const [input, expected] of [
    ['ADIDAS', 'Adidas'],
    ['asics', 'Asics'],
    ['new balance', 'New Balance'],
    ['On', 'On Running'],
    ['  Custom Athletics  ', 'Custom Athletics'],
  ])
    assert.equal(normalizeGuideBrand(input), expected);
  assert.equal(guideBrandChoice('ASICS'), 'Asics');
  assert.equal(guideBrandChoice('On'), 'On Running');
  assert.equal(guideBrandChoice('Custom Athletics'), 'Other');
  assert.equal(guideBrandChoice(''), '');
});
test('identity step requires a real brand name, exact model and valid SRP', () => {
  assert.equal(guideStepError(valid, 0), null);
  for (const patch of [
    { brand: '' },
    { brand: 'Other' },
    { model: '   ' },
    { retailPricePhp: 0 },
    { retailPricePhp: NaN },
    { retailPricePhp: 1_000_001 },
  ])
    assert.ok(guideStepError({ ...valid, ...patch }, 0));
  assert.equal(
    guideStepError({ ...valid, brand: 'Custom Athletics' }, 0),
    null,
  );
});
test('precise mileage boundaries retain the estimator contract', () => {
  for (const [km, expected] of [
    [null, 'unknown'],
    [0, 'unused'],
    [19.9, 'under_20'],
    [20, 'twenty_to_80'],
    [80, 'twenty_to_80'],
    [80.1, 'eighty_to_200'],
    [200, 'eighty_to_200'],
    [200.1, 'over_200'],
  ])
    assert.equal(guideMileageBucket(km), expected);
});
test('unused contradictions and invalid optional prices block completion', () => {
  assert.ok(guideStepError({ ...valid, condition: 'new' }, 2));
  assert.equal(
    guideStepError(
      { ...valid, condition: 'new', mileageKm: 0, mileage: 'unused' },
      2,
    ),
    null,
  );
  assert.ok(guideStepError({ ...valid, mileageKm: -1 }, 2));
  assert.equal(
    guideStepError({ ...valid, mileageKm: null, mileage: 'unknown' }, 2),
    null,
  );
  assert.equal(guideStepError({ ...valid, askingPricePhp: null }, 4), null);
  assert.ok(guideStepError({ ...valid, askingPricePhp: 0 }, 4));
});
test('sign-in drafts restore the current step, custom brand, exact mileage and extras', () => {
  const draft = {
    ...valid,
    brand: 'Custom Athletics',
    _step: 4,
    _brandChoice: 'Other',
    askingPricePhp: 4500,
  };
  const restored = restoreGuideDraft(draft);
  assert.equal(restored.step, 4);
  assert.equal(restored.brandChoice, 'Other');
  assert.equal(restored.input.brand, 'Custom Athletics');
  assert.equal(restored.input.mileageKm, 20);
  assert.equal(restored.input.hasReceipt, true);
  assert.equal(restored.input.askingPricePhp, 4500);
  assert.equal(Object.hasOwn(restored.input, '_step'), false);
});
test('partial drafts and corrupted storage recover without blocking the form', () => {
  assert.equal(restoreGuideDraft(null), null);
  assert.equal(restoreGuideDraft('bad'), null);
  const partial = restoreGuideDraft({ brand: 'ASICS', _step: 4 });
  assert.equal(partial.step, 0);
  assert.equal(partial.brandChoice, 'Asics');
  assert.equal(partial.input.model, '');
  const old = restoreGuideDraft({ ...valid, brand: 'adidas' });
  assert.equal(old.brandChoice, 'Adidas');
  assert.equal(old.step, 0);
  const inconsistent = restoreGuideDraft({
    ...valid,
    condition: 'new',
    _step: 4,
  });
  assert.equal(inconsistent.step, 2);
  const bucket = restoreGuideDraft({
    ...valid,
    mileageKm: 20,
    mileage: 'unused',
  });
  assert.equal(bucket.input.mileage, 'twenty_to_80');
});
