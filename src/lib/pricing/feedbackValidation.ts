import { z } from 'zod';
import { estimateRunningShoePrice, PRICE_GUIDE_ENGINE_VERSION } from './runningShoePriceGuide';
import type { PriceFeedbackSnapshot } from '../feedback';

export const priceFeedbackSchema = z.object({
  submission_id: z.string().uuid(),
  engine_version: z.literal(PRICE_GUIDE_ENGINE_VERSION),
  reason: z.enum(['too_low', 'too_high'], { error: 'Choose Too low or Too high.' }),
  suggested_price_php: z.number().finite().min(1, 'Enter your suggested price.').max(1_000_000).multipleOf(0.01),
  message: z.string().trim().max(800).optional().default(''),
  price_choice: z.enum(['suggested_range', 'fast_sale']),
  reference_price_php: z.number().finite().positive().max(1_000_000),
  input: z.object({
    brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(160),
    retailPricePhp: z.number().finite().min(500).max(1_000_000),
    condition: z.enum(['new', 'like_new', 'good', 'fair']),
    mileage: z.enum(['unused', 'under_20', 'twenty_to_80', 'eighty_to_200', 'over_200', 'unknown']),
    age: z.enum(['under_3_months', 'three_to_12_months', 'one_to_two_years', 'over_two_years']),
    demand: z.enum(['popular', 'normal', 'niche']), urgency: z.enum(['best_price', 'balanced', 'sell_fast']),
    hasBox: z.boolean(), hasReceipt: z.boolean(), hasVisibleFlaws: z.boolean(),
  }),
}).superRefine((data, ctx) => {
  const estimate = estimateRunningShoePrice(data.input);
  const reference = data.reference_price_php;
  if (data.price_choice === 'fast_sale' ? reference !== estimate.fastSalePrice
    : reference < estimate.suggestedLow || reference > estimate.suggestedHigh || reference % 100 !== 0) {
    ctx.addIssue({ code: 'custom', path: ['reference_price_php'], message: 'The estimate changed. Reopen the result and try again.' });
  }
  if (data.reason === 'too_low' ? data.suggested_price_php <= reference : data.suggested_price_php >= reference) {
    ctx.addIssue({ code: 'custom', path: ['suggested_price_php'], message: `Enter a price ${data.reason === 'too_low' ? 'higher' : 'lower'} than the estimate you are reviewing.` });
  }
});

export function priceFeedbackSnapshot(data: z.infer<typeof priceFeedbackSchema>): PriceFeedbackSnapshot {
  return {
    engine_version: PRICE_GUIDE_ENGINE_VERSION, input: data.input,
    estimate: estimateRunningShoePrice(data.input), reference_price_php: data.reference_price_php,
    price_choice: data.price_choice, evidence_type: 'formula',
  };
}
