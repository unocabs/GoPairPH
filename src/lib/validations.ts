import { z } from 'zod';

export const listingSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  color: z.string().min(1, 'Color is required'),
  condition: z.enum(['new', 'like_new', 'good', 'fair']),
  mileage_km: z.preprocess(
    val => (val === '' || val == null ? null : Number(val)),
    z.number().min(0, 'Mileage cannot be negative').int('Mileage must be a whole number').nullable().optional()
  ),
  listing_type: z.enum(['for_sale', 'donate']),
  price_php: z.coerce.number().min(0).optional().nullable(),
  is_negotiable: z.coerce.boolean().optional().default(false),
  description: z.string().optional().nullable(),
  size_eu: z.coerce.number().optional().nullable(),
  size_us: z.coerce.number().optional().nullable(),
  size_cm: z.coerce.number().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.listing_type === 'for_sale' && !data.price_php) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Price is required for sale listings',
      path: ['price_php'],
    });
  }
  if (!data.size_eu && !data.size_us && !data.size_cm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one size (EU, US, or CM) is required',
      path: ['size_eu'],
    });
  }
});

export const wishlistSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  color: z.string().optional().nullable(),
  size_eu: z.coerce.number().optional().nullable(),
  size_us: z.coerce.number().optional().nullable(),
  size_cm: z.coerce.number().optional().nullable(),
  price_min_php: z.coerce.number().min(0).optional().nullable(),
  price_max_php: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.price_min_php != null && data.price_max_php != null && data.price_min_php > data.price_max_php) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Min price cannot be greater than max',
      path: ['price_min_php'],
    });
  }
});

export const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50),
  location: z.string().optional().nullable(),
  fb_username: z.string()
    .min(1, 'Facebook username is required')
    .regex(/^[a-zA-Z0-9.]+$/, 'Username can only contain letters, numbers, and dots')
    .max(50),
});

export type ListingFormData = z.infer<typeof listingSchema>;
export type WishlistFormData = z.infer<typeof wishlistSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
