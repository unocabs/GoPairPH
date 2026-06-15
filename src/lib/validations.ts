import { z } from 'zod';
import { normalizeFacebookUsername } from '@/lib/facebook';

const usSizeTypeSchema = z.enum(['mens', 'womens', 'unisex', 'unknown']).optional().default('mens');
const optionalPriceNumber = z.preprocess(
  val => (val === '' || val == null ? null : Number(val)),
  z.number().min(0).nullable().optional()
);

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
  srp_php: optionalPriceNumber,
  is_negotiable: z.coerce.boolean().optional().default(false),
  description: z.string().optional().nullable(),
  size_eu: z.coerce.number().optional().nullable(),
  size_us: z.coerce.number().optional().nullable(),
  size_cm: z.coerce.number().optional().nullable(),
  us_size_type: usSizeTypeSchema,
}).superRefine((data, ctx) => {
  if (data.listing_type === 'for_sale' && !data.price_php) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Price is required for sale listings',
      path: ['price_php'],
    });
  }
  if (
    data.listing_type === 'for_sale'
    && data.srp_php != null
    && data.price_php != null
    && data.srp_php < data.price_php
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'SRP should be equal to or higher than the listing price',
      path: ['srp_php'],
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
  us_size_type: usSizeTypeSchema,
  price_min_php: z.coerce.number().min(0).optional().nullable(),
  price_max_php: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.string().max(80).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.price_min_php != null && data.price_max_php != null && data.price_min_php > data.price_max_php) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Min price cannot be greater than max',
      path: ['price_min_php'],
    });
  }
});

export const offerSchema = z.object({
  url: z.string().url('Please paste a valid URL').max(500),
  price_php: z.coerce.number().min(0).optional().nullable(),
  note: z.string().max(140).optional().nullable(),
  shoe_id: z.string().uuid().optional().nullable(),
});

const optionalNumber = z.preprocess(
  val => (val === '' || val == null ? null : Number(val)),
  z.number().min(0).nullable().optional()
);

const optionalString = z.preprocess(
  val => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().trim().min(1).nullable().optional()
);

export const savedSearchSchema = z.object({
  keyword: z.string().trim().min(2, 'Keyword must be at least 2 characters').max(80, 'Keyword is too long'),
  brand: optionalString,
  size_eu: optionalNumber,
  size_us: optionalNumber,
  size_cm: optionalNumber,
  us_size_type: usSizeTypeSchema,
  condition: z.preprocess(
    val => (val === '' || val == null ? null : val),
    z.enum(['new', 'like_new', 'good', 'fair']).nullable().optional()
  ),
  max_price_php: optionalNumber,
  email_enabled: z.boolean().optional().default(true),
});

export const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50),
  location: z.string().max(120).optional().nullable(),
  location_city: z.string().max(80).optional().nullable(),
  location_province: z.string().max(80).optional().nullable(),
  location_region: z.string().max(80).optional().nullable(),
  fb_username: z.string()
    .min(1, 'Facebook username is required')
    .max(120)
    .superRefine((value, ctx) => {
      const normalized = normalizeFacebookUsername(value);
      if (normalized.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: normalized.error,
        });
      }
    }),
  preferred_size_eu: optionalNumber,
  preferred_size_us: optionalNumber,
  preferred_size_cm: optionalNumber,
  preferred_us_size_type: usSizeTypeSchema,
  personalized_browse_enabled: z.boolean().optional().default(true),
  profile_match_email_enabled: z.boolean().optional().default(true),
});

export const feedbackSchema = z.object({
  category: z.enum(['confusing', 'missing_feature', 'bug', 'suggestion']).optional().default('suggestion'),
  message: z.string().trim().min(1, 'Feedback is required').max(800, 'Feedback must be 800 characters or less'),
  contact_email: z.preprocess(
    val => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().email('Enter a valid email or leave it blank').max(160).nullable().optional()
  ),
  listing_id: z.string().uuid().nullable().optional(),
  page_path: z.string().trim().min(1).max(500).optional().default('/'),
});

export type ListingFormData = z.infer<typeof listingSchema>;
export type WishlistFormData = z.infer<typeof wishlistSchema>;
export type OfferFormData = z.infer<typeof offerSchema>;
export type SavedSearchFormData = z.infer<typeof savedSearchSchema>;
export type ProfileFormInput = z.input<typeof profileSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
