import { z } from 'zod';
export const estimatorInputSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(160),
  retailPricePhp: z.number().finite().min(500).max(1_000_000),
  condition: z.enum(['new', 'like_new', 'good', 'fair']),
  mileage: z.enum([
    'unused',
    'under_20',
    'twenty_to_80',
    'eighty_to_200',
    'over_200',
    'unknown',
  ]),
  mileageKm: z.number().finite().min(0).max(10000).nullable().optional(),
  age: z.enum([
    'under_3_months',
    'three_to_12_months',
    'one_to_two_years',
    'over_two_years',
    'unknown',
  ]),
  demand: z.enum(['popular', 'normal', 'niche']).default('normal'),
  urgency: z.enum(['best_price', 'balanced', 'sell_fast']).default('balanced'),
  hasBox: z.boolean(),
  hasReceipt: z.boolean(),
  hasVisibleFlaws: z.boolean(),
  askingPricePhp: z
    .number()
    .finite()
    .positive()
    .max(1_000_000)
    .nullable()
    .optional(),
});
export const estimatorRequestSchema = z.object({
  request_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  input: estimatorInputSchema,
});
