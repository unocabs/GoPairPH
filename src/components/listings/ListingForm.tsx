'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { listingSchema, type ListingFormData } from '@/lib/validations';
import { BRANDS, CONDITIONS, US_SIZE_TYPE_OPTIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { PhotoUploader, type UploadedPhoto } from './PhotoUploader';
import { VariantsEditor, type VariantRow } from './VariantsEditor';
import { findSizeConversion, formatPrice, formatSize, getListingPath } from '@/lib/utils';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { Shop } from '@/types';

const BRAND_OPTIONS = BRANDS.map(b => ({ value: b, label: b }));
const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([v, l]) => ({ value: v, label: l }));
const CONDITION_HELPERS = [
  { value: 'new', label: 'Brand New', helper: 'Unused, box or tags ready.' },
  { value: 'like_new', label: 'Like New', helper: 'Tried or lightly used.' },
  { value: 'good', label: 'Good', helper: 'Normal wear, still solid.' },
  { value: 'fair', label: 'Fair', helper: 'Visible wear, price honestly.' },
] as const;
const LISTING_TYPE_OPTIONS = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'donate', label: 'Donate (Free)' },
];
const LISTING_DRAFT_KEY = 'gopairph:new-listing-draft:v1';

function toOptionalNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

interface ListingFormProps {
  profileId?: string | null;
  shop?: Shop | null;
  hasMessengerContact?: boolean;
}

export function ListingForm({ profileId, shop = null, hasMessengerContact = false }: ListingFormProps) {
  const isShop = !!shop;
  const isGuest = !profileId;

  const [step, setStep] = useState<1 | 2>(1);
  const [shoeId, setShoeId] = useState<string | null>(null);
  const [details, setDetails] = useState<ListingFormData | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([{ id: null, size_eu: '', size_us: '', size_cm: '', us_size_type: 'mens', quantity: 1 }]);
  const [listedInMainFeed, setListedInMainFeed] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as Resolver<ListingFormData>,
    defaultValues: isShop
      ? { listing_type: 'for_sale', condition: 'new', is_negotiable: false, size_eu: 99, us_size_type: 'mens' /* placeholder; overridden to NULL on insert */ }
      : { listing_type: 'for_sale', us_size_type: 'mens' },
  });

  // Keep schema-required fields satisfied for shop submissions even though we
  // don't render the corresponding inputs. The placeholder size is overridden
  // to NULL on insert; size lives in shoe_variants instead.
  useEffect(() => {
    if (isShop) {
      setValue('size_eu', 99);
      setValue('listing_type', 'for_sale');
      setValue('is_negotiable', false);
    }
  }, [isShop, setValue]);

  useEffect(() => {
    if (!profileId || searchParams.get('resume') !== 'draft') return;

    const rawDraft = window.localStorage.getItem(LISTING_DRAFT_KEY);
    if (!rawDraft) return;

    try {
      const parsed = JSON.parse(rawDraft) as { details?: ListingFormData };
      if (!parsed.details) return;
      reset(parsed.details);
      setDetails(parsed.details);
      setShoeId(crypto.randomUUID());
      setStep(2);
      setError(null);
    } catch {
      window.localStorage.removeItem(LISTING_DRAFT_KEY);
    }
  }, [profileId, reset, searchParams]);

  useEffect(() => {
    const suggestedPrice = searchParams.get('price');
    if (!suggestedPrice) return;
    const parsed = Number(suggestedPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setValue('listing_type', 'for_sale', { shouldDirty: true, shouldValidate: true });
    setValue('price_php', parsed, { shouldDirty: true, shouldValidate: true });
  }, [searchParams, setValue]);

  const listingType = watch('listing_type');
  const condition = watch('condition');
  const brand = watch('brand') ?? '';
  const model = watch('model') ?? '';
  const color = watch('color') ?? '';
  const description = watch('description') ?? '';
  const mileageKm = toOptionalNumber(watch('mileage_km'));
  const pricePhp = toOptionalNumber(watch('price_php'));
  const sizeEu = toOptionalNumber(watch('size_eu'));
  const sizeUs = toOptionalNumber(watch('size_us'));
  const sizeCm = toOptionalNumber(watch('size_cm'));
  const usSizeType = watch('us_size_type') ?? 'mens';
  const isNew = condition === 'new';
  const hasTopPhoto = photos.some(p => p.viewType === 'top');
  const hasSolePhoto = photos.some(p => p.viewType === 'sole');
  const hasExtraPhoto = photos.some(p => p.viewType !== 'top' && p.viewType !== 'sole');
  const canPublishPhotos = hasTopPhoto && hasSolePhoto;
  const hasCoreDetails = !!brand && !!model && !!color && !!condition;
  const validVariants = variants.filter(v => typeof v.size_eu === 'number' && typeof v.quantity === 'number' && v.quantity >= 1);
  const hasSize = isShop ? validVariants.length > 0 : !!(sizeEu || sizeUs || sizeCm);
  const hasPrice = listingType === 'donate' || !!pricePhp;
  const previewTitle = brand || model
    ? `${brand}${brand && model ? ' ' : ''}${model}`.trim()
    : 'Your running shoe listing';
  const previewSize = isShop
    ? validVariants.length > 1
      ? `EU ${validVariants[0].size_eu} + ${validVariants.length - 1} more`
      : validVariants[0]?.size_eu
        ? `EU ${validVariants[0].size_eu}`
        : 'Add sizes'
    : formatSize(sizeEu, sizeUs, sizeCm, usSizeType) || 'Add size';
  const previewPrice = listingType === 'donate'
    ? 'Donation'
    : pricePhp
      ? formatPrice(pricePhp)
      : 'Add price';
  const suggestedNote = (() => {
    if (listingType === 'donate') {
      return 'Available for donation. See top and sole photos for condition.\nMeetup around Pampanga preferred.';
    }
    if (condition === 'new') {
      return 'Brand new pair. See photos for box, tags, and condition.\nMeetup around Pampanga preferred.';
    }
    const usageLine = mileageKm != null
      ? `Used for approximately ${mileageKm.toLocaleString()} km.`
      : 'Mileage not tracked.';
    return `${usageLine} See top and sole photos for condition.\nMeetup around Pampanga preferred.`;
  })();
  const readinessItems = [
    { label: 'Details', done: hasCoreDetails },
    { label: 'Size', done: hasSize },
    { label: 'Price', done: hasPrice },
    { label: 'Photos', done: false },
  ];
  const strengthItems = [
    { label: 'Shoe details added', done: !!details },
    { label: 'Top photo uploaded', done: hasTopPhoto },
    { label: 'Sole photo uploaded', done: hasSolePhoto },
    { label: 'Extra angle added', done: hasExtraPhoto, optional: true },
    { label: 'Messenger contact added', done: hasMessengerContact, optional: true },
  ];
  const requiredStrengthDone = strengthItems.filter(item => !item.optional).every(item => item.done);
  const strengthScore = strengthItems.filter(item => item.done).length;
  const strengthLabel = !requiredStrengthDone
    ? 'Basic'
    : strengthScore >= 5 ? 'Ready to share' : strengthScore >= 4 ? 'Strong' : 'Good';

  function handleSizeEuChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = findSizeConversion('eu', num, usSizeType);
    if (match) { setValue('size_us', match.us); setValue('size_cm', match.cm); }
  }

  function handleSizeUsChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = findSizeConversion('us', num, usSizeType);
    if (match) { setValue('size_eu', match.eu); setValue('size_cm', match.cm); }
  }

  function handleSizeCmChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = findSizeConversion('cm', num, usSizeType);
    if (match) { setValue('size_eu', match.eu); setValue('size_us', match.us); }
  }

  function handleUsSizeTypeChange(val: string) {
    setValue('us_size_type', val as ListingFormData['us_size_type'], { shouldDirty: true, shouldValidate: true });
    const match = sizeUs
      ? findSizeConversion('us', sizeUs, val)
      : sizeEu
        ? findSizeConversion('eu', sizeEu, val)
        : null;
    if (match) {
      setValue('size_eu', match.eu);
      setValue('size_us', match.us);
      setValue('size_cm', match.cm);
    }
  }

  function onDetailsSubmit(data: ListingFormData) {
    setError(null);
    trackMarketplaceAction('listing_create_start', {
      listing_type: isShop ? 'shop' : data.listing_type,
      is_guest: isGuest,
      surface: 'new_listing_form',
    });
    if (isGuest) {
      try {
        window.localStorage.setItem(LISTING_DRAFT_KEY, JSON.stringify({ details: data, savedAt: Date.now() }));
        trackMarketplaceAction('listing_draft_saved', {
          listing_type: data.listing_type,
          auth_required: true,
        });
        router.push(`/auth/sign-in?next=${encodeURIComponent('/listings/new?resume=draft')}`);
      } catch {
        setError('Could not save your draft in this browser. Please sign in first, then list your shoe.');
      }
      return;
    }

    if (isShop) {
      const cleaned = variants
        .map(v => ({
          ...v,
          size_eu: typeof v.size_eu === 'number' ? v.size_eu : NaN,
          quantity: typeof v.quantity === 'number' ? v.quantity : NaN,
        }))
        .filter(v => !isNaN(v.size_eu));
      if (cleaned.length === 0) {
        setError('Please add at least one size with stock.');
        return;
      }
      const seen = new Set<number>();
      for (const v of cleaned) {
        if (seen.has(v.size_eu)) {
          setError(`Duplicate size EU ${v.size_eu}. Each size should appear once.`);
          return;
        }
        seen.add(v.size_eu);
        if (isNaN(v.quantity) || v.quantity < 1) {
          setError(`Stock for EU ${v.size_eu} must be at least 1.`);
          return;
        }
      }
    }
    setDetails(data);
    if (!shoeId) setShoeId(crypto.randomUUID());
    setStep(2);
  }

  async function onPhotosSubmit() {
    if (!profileId) {
      setError('Please sign in before uploading photos and publishing your listing.');
      router.push(`/auth/sign-in?next=${encodeURIComponent('/listings/new?resume=draft')}`);
      return;
    }
    if (!shoeId || !details) return;
    const hasTop = photos.some(p => p.viewType === 'top');
    const hasSole = photos.some(p => p.viewType === 'sole');
    if (!hasTop || !hasSole) {
      setError('Top and sole photos are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: insertedShoe, error: insertError } = await supabase
        .from('shoes')
        .insert({
          id: shoeId,
          seller_id: profileId,
          brand: details.brand,
          model: details.model,
          color: details.color,
          condition: details.condition,
          mileage_km: details.condition === 'new' ? 0 : (details.mileage_km ?? null),
          listing_type: isShop ? 'for_sale' : details.listing_type,
          price_php: isShop || details.listing_type === 'for_sale' ? details.price_php : null,
          is_negotiable: isShop ? false : (details.listing_type === 'for_sale' ? !!details.is_negotiable : false),
          description: details.description,
          size_eu: isShop ? null : details.size_eu,
          size_us: isShop ? null : details.size_us,
          size_cm: isShop ? null : details.size_cm,
          us_size_type: isShop ? 'mens' : (details.us_size_type ?? 'mens'),
          status: 'active',
          shop_id: shop?.id ?? null,
          quantity: 0,
          listed_in_main_feed: isShop ? listedInMainFeed : true,
        })
        .select('id, slug')
        .single();
      if (insertError) throw insertError;

      if (isShop) {
        const variantRows = variants
          .filter(v => typeof v.size_eu === 'number' && typeof v.quantity === 'number' && v.quantity >= 1)
          .map(v => ({
            shoe_id: shoeId,
            size_eu: v.size_eu as number,
            size_us: typeof v.size_us === 'number' ? v.size_us : null,
            size_cm: typeof v.size_cm === 'number' ? v.size_cm : null,
            us_size_type: v.us_size_type ?? 'mens',
            quantity: v.quantity as number,
          }));
        if (variantRows.length > 0) {
          const { error: varError } = await supabase.from('shoe_variants').insert(variantRows);
          if (varError) throw varError;
        }
      }

      const imageRows = photos.map((p, i) => ({
        shoe_id: shoeId,
        storage_path: p.storagePath,
        view_type: p.viewType,
        order: i,
      }));
      const { error: imgError } = await supabase.from('shoe_images').insert(imageRows);
      if (imgError) throw imgError;
      trackMarketplaceAction('listing_publish', {
        listing_id: insertedShoe?.id ?? shoeId,
        listing_type: isShop ? 'shop' : details.listing_type,
        has_extra_photo: hasExtraPhoto,
        has_messenger_contact: hasMessengerContact,
      });
      await fetch('/api/admin/new-listing-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: insertedShoe?.id ?? shoeId }),
      }).catch((notificationError) => {
        console.error('[listings] admin notification email failed:', notificationError);
      });
      window.localStorage.removeItem(LISTING_DRAFT_KEY);
      router.push(`${getListingPath(insertedShoe ?? { id: shoeId })}?listed=1`);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to publish listing';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* Stepper */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-teal-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                {step > s ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              <span className={`text-sm font-medium ${step === s ? 'text-teal-400' : step > s ? 'text-gray-400' : 'text-gray-600'}`}>
                {s === 1 ? 'Shoe Details' : 'Photos'}
              </span>
            </div>
            {i < 1 && <div className={`h-px w-8 ${step > 1 ? 'bg-teal-500' : 'bg-gray-800'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onDetailsSubmit)} className="space-y-5">
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-4">
            <p className="text-sm font-semibold text-gray-100">Step 1: add the details buyers need first.</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Most sellers finish this part in under a minute. Start with the basics, then add photos.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Main details</p>
              <p className="mt-1 text-xs text-gray-500">What buyers scan first.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Brand" required options={BRAND_OPTIONS} placeholder="Select brand" error={errors.brand?.message} {...register('brand')} />
              <Input label="Model" placeholder="e.g. Pegasus 40" required hint="Use the box label or what buyers would search." error={errors.model?.message} {...register('model')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Colorway" placeholder="e.g. Black/White" required hint="A simple color is enough if you do not know the official colorway." error={errors.color?.message} {...register('color')} />
              <div className="space-y-2">
                <Select label="Condition" required options={CONDITION_OPTIONS} hint="Pick the closest match. Photos will do the rest." error={errors.condition?.message} {...register('condition')} />
                <div className="grid grid-cols-2 gap-2">
                  {CONDITION_HELPERS.map((option) => {
                    const active = condition === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValue('condition', option.value, { shouldDirty: true, shouldValidate: true })}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-teal-400/50 bg-teal-400/10 text-teal-100'
                            : 'border-white/[0.08] bg-slate-950/45 text-gray-400 hover:border-teal-400/30 hover:text-gray-200'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{option.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">{option.helper}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Size and price</p>
              <p className="mt-1 text-xs text-gray-500">The fastest buyer filters.</p>
            </div>

            {!isShop && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-1">
                  Size <span className="text-teal-400">*</span>
                  <span className="ml-1 text-xs text-gray-500 font-normal">(fill one; EU, US, or CM)</span>
                </p>
                <div className="mb-3">
                  <Select
                    label="US size type"
                    options={[...US_SIZE_TYPE_OPTIONS]}
                    hint="US men's and women's sizes convert differently. Pick the label printed on the shoe box when possible."
                    value={usSizeType}
                    onChange={e => handleUsSizeTypeChange(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="EU" type="number" step={0.5} min={35} max={48} error={errors.size_eu?.message}
                    {...register('size_eu', { onChange: e => handleSizeEuChange(e.target.value) })} />
                  <Input label={usSizeType === 'womens' ? 'US W' : usSizeType === 'mens' ? 'US M' : 'US'} type="number" step={0.5} error={errors.size_us?.message}
                    {...register('size_us', { onChange: e => handleSizeUsChange(e.target.value) })} />
                  <Input label="CM" type="number" step={0.5} error={errors.size_cm?.message}
                    {...register('size_cm', { onChange: e => handleSizeCmChange(e.target.value) })} />
                </div>
              </div>
            )}

            {!isShop && (
              <Select label="Listing Type" required options={LISTING_TYPE_OPTIONS} error={errors.listing_type?.message} {...register('listing_type')} />
            )}

            {(isShop || listingType === 'for_sale') && (
              <div className="space-y-2">
                <Input label="Price (PHP)" type="number" min={0} required placeholder="e.g. 2500" error={errors.price_php?.message} {...register('price_php')} />
                <div className="rounded-lg border border-teal-400/20 bg-teal-400/[0.06] px-3 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-gray-400">
                      Not sure what to price it? Estimate a suggested resale range before listing.
                    </p>
                    <Link
                      href="/price-guide"
                      onClick={() => trackMarketplaceAction('price_estimator_open', {
                        surface: 'new_listing_form',
                      })}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-teal-400/30 bg-slate-950/55 px-3 py-1.5 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-400/10"
                    >
                      Check Price Estimator
                    </Link>
                  </div>
                </div>
                {!isShop && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-900"
                      {...register('is_negotiable')}
                    />
                    <span>Negotiable <span className="text-gray-500">(buyers can suggest a different price)</span></span>
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Extra notes</p>
              <p className="mt-1 text-xs text-gray-500">Helpful, but do not overthink this part.</p>
            </div>
            {isNew ? (
              <div className="rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3">
                <p className="text-sm font-medium text-gray-400">Mileage (km)</p>
                <p className="text-sm text-gray-500 mt-0.5">Automatically set to <span className="text-gray-300 font-medium">0 km</span> for new shoes.</p>
              </div>
            ) : (
              <Input
                label="Mileage (km)"
                type="number"
                min={0}
                placeholder="e.g. 350"
                hint="Leave blank if you do not track mileage; buyers will see Not Tracked."
                error={errors.mileage_km?.message}
                {...register('mileage_km')}
              />
            )}
            <Textarea label="Description (optional)" rows={3} placeholder="Add any other details about the shoes..." {...register('description')} />
            <div className="rounded-lg border border-white/[0.08] bg-slate-950/45 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-200">Need a quick note?</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-5 text-gray-500">{suggestedNote}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('description', suggestedNote, { shouldDirty: true, shouldValidate: true })}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-teal-400/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-200 transition-colors hover:border-teal-400/45 hover:bg-teal-400/15"
                >
                  {description ? 'Replace note' : 'Use suggested note'}
                </button>
              </div>
            </div>
          </div>

          {isShop && shop && (
            <div className="space-y-4 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">Sizes & stock — {shop.name}</p>
                <p className="text-xs text-gray-500 mb-3">One row per size. Stock is how many pairs you have on hand right now.</p>
                <VariantsEditor value={variants} onChange={setVariants} />
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={listedInMainFeed}
                  onChange={e => setListedInMainFeed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-900"
                />
                <span>
                  Also show in the main /browse feed
                  <span className="block text-xs text-gray-500 mt-0.5">Uncheck to keep this listing visible only on your shop page.</span>
                </span>
              </label>
            </div>
          )}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {isGuest ? 'Save details and sign in →' : 'Continue to Photos →'}
          </Button>
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/55 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300">Live preview</p>
                <h2 className="mt-1 truncate text-base font-bold text-gray-100">{previewTitle}</h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">{color || 'Add colorway'}</p>
              </div>
              <div className="rounded-lg bg-teal-400/10 px-3 py-2 sm:shrink-0 sm:text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-teal-200">Price</p>
                <p className="text-sm font-bold text-teal-100">{previewPrice}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/[0.08] bg-slate-900/70 px-2.5 py-1 text-gray-300">
                {CONDITIONS[condition] ?? 'Condition'}
              </span>
              <span className="rounded-full border border-white/[0.08] bg-slate-900/70 px-2.5 py-1 text-gray-300">
                {previewSize}
              </span>
              <span className="rounded-full border border-white/[0.08] bg-slate-900/70 px-2.5 py-1 text-gray-300">
                {listingType === 'donate' ? 'Donate' : 'For Sale'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium ${
                    item.done
                      ? 'border-teal-400/25 bg-teal-400/10 text-teal-100'
                      : 'border-white/[0.08] bg-slate-950/45 text-gray-500'
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
          {isGuest && (
            <p className="-mt-2 text-center text-xs leading-5 text-gray-500">
              Your details stay in this browser. After sign-in, you&apos;ll continue with photo upload.
            </p>
          )}
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && shoeId && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Listing strength</p>
                <p className="mt-1 text-sm font-semibold text-gray-100">{strengthLabel}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                {strengthScore}/{strengthItems.length}
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {strengthItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    item.done ? 'bg-teal-400 text-slate-950' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {item.done ? '✓' : '•'}
                  </span>
                  <span className={item.done ? 'text-gray-200' : 'text-gray-500'}>
                    {item.label}
                    {item.optional && <span className="text-gray-600"> optional</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <PhotoUploader
            shoeId={shoeId}
            photos={photos}
            onChange={(nextPhotos) => {
              setPhotos(nextPhotos);
              setError(null);
            }}
          />
          {canPublishPhotos && (
            <div className="rounded-xl border border-teal-400/25 bg-teal-400/10 p-3 text-sm text-teal-100">
              <p className="font-semibold">Ready to publish.</p>
              <p className="mt-1 text-xs leading-5 text-teal-100/80">
                Your listing has the required trust photos. After publishing, share it where runners already are.
              </p>
            </div>
          )}
          <Button
            onClick={onPhotosSubmit}
            size="lg"
            loading={submitting}
            disabled={!canPublishPhotos}
            className="w-full"
          >
            {canPublishPhotos ? 'Publish Listing' : 'Add top + sole photos to publish'}
          </Button>
          {!canPublishPhotos && (
            <p className="-mt-3 text-center text-xs leading-5 text-gray-500">
              Buyers trust listings faster when they can see the pair from above and the outsole wear.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
