'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { listingSchema, type ListingFormData } from '@/lib/validations';
import { BRANDS, CONDITIONS, US_SIZE_TYPE_OPTIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { VariantsEditor, type VariantRow } from '@/components/listings/VariantsEditor';
import { PhotoUploader, type UploadedPhoto } from '@/components/listings/PhotoUploader';
import { findSizeConversion, getListingPath, getPublicUrl } from '@/lib/utils';
import type { Shoe, ViewType } from '@/types';

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
const VIEW_ORDER: ViewType[] = ['top', 'sole', 'front', 'left', 'right', 'back'];

function toOptionalNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

type EditablePhoto = UploadedPhoto & {
  id?: string;
};

export function EditListingForm({ shoe }: { shoe: Shoe }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [listedInMainFeed, setListedInMainFeed] = useState<boolean>(shoe.listed_in_main_feed ?? true);
  const isShopListing = !!shoe.shop_id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const [photos, setPhotos] = useState<EditablePhoto[]>(() =>
    (shoe.shoe_images ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((image) => ({
        id: image.id,
        storagePath: image.storage_path,
        publicUrl: getPublicUrl(supabaseUrl, image.storage_path),
        viewType: image.view_type,
      }))
  );

  const [variants, setVariants] = useState<VariantRow[]>(() =>
    isShopListing
      ? (shoe.shoe_variants ?? [])
          .slice()
          .sort((a, b) => a.size_eu - b.size_eu)
          .map(v => ({
            id: v.id,
            size_eu: v.size_eu,
            size_us: v.size_us ?? '',
            size_cm: v.size_cm ?? '',
            us_size_type: v.us_size_type ?? 'mens',
            quantity: v.quantity,
          }))
      : []
  );

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as Resolver<ListingFormData>,
    defaultValues: {
      brand: shoe.brand,
      model: shoe.model,
      color: shoe.color,
      condition: shoe.condition,
      mileage_km: shoe.mileage_km,
      listing_type: shoe.listing_type,
      price_php: shoe.price_php ?? undefined,
      is_negotiable: shoe.is_negotiable,
      description: shoe.description ?? undefined,
      // For shop listings, satisfy the schema's "at least one size" check with a
      // placeholder; the value isn't persisted (size lives on shoe_variants).
      size_eu: isShopListing ? 99 : (shoe.size_eu ?? undefined),
      size_us: shoe.size_us ?? undefined,
      size_cm: shoe.size_cm ?? undefined,
      us_size_type: shoe.us_size_type ?? 'mens',
    },
  });

  useEffect(() => {
    if (isShopListing) {
      setValue('size_eu', 99);
      setValue('listing_type', 'for_sale');
      setValue('is_negotiable', false);
    }
  }, [isShopListing, setValue]);

  const listingType = watch('listing_type');
  const condition = watch('condition');
  const description = watch('description') ?? '';
  const mileageKm = toOptionalNumber(watch('mileage_km'));
  const sizeEu = toOptionalNumber(watch('size_eu'));
  const sizeUs = toOptionalNumber(watch('size_us'));
  const usSizeType = watch('us_size_type') ?? 'mens';
  const isNew = condition === 'new';
  const hasTopPhoto = photos.some(photo => photo.viewType === 'top');
  const hasSolePhoto = photos.some(photo => photo.viewType === 'sole');
  const suggestedNote = (() => {
    if (listingType === 'donate') {
      return 'Available for donation. See top and sole photos for condition.\nMeetup around Pampanga preferred.';
    }
    if (condition === 'new') {
      return 'Brand new pair. See photos for box, tags, and condition.\nMeetup around Pampanga preferred.';
    }
    const usageLine = mileageKm
      ? `Used for approximately ${mileageKm.toLocaleString()} km.`
      : 'Used for running.';
    return `${usageLine} See top and sole photos for condition.\nMeetup around Pampanga preferred.`;
  })();

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

  async function onSubmit(data: ListingFormData) {
    setSubmitting(true);
    setError(null);
    try {
      // Validate variants for shop listings up-front.
      if (!hasTopPhoto || !hasSolePhoto) {
        throw new Error('Top and sole photos are required before saving.');
      }

      const originalImageIds = new Set((shoe.shoe_images ?? []).map(image => image.id));
      const currentImageIds = new Set(photos.map(photo => photo.id).filter(Boolean) as string[]);
      const removedImages = (shoe.shoe_images ?? []).filter(image => !currentImageIds.has(image.id));
      const imageRows = photos.map((photo, index) => ({
        id: photo.id,
        shoe_id: shoe.id,
        storage_path: photo.storagePath,
        view_type: photo.viewType,
        order: VIEW_ORDER.indexOf(photo.viewType) >= 0 ? VIEW_ORDER.indexOf(photo.viewType) : index,
      }));
      const existingImageRows = imageRows
        .filter(row => row.id && originalImageIds.has(row.id))
        .map(row => ({
          id: row.id as string,
          shoe_id: row.shoe_id,
          storage_path: row.storage_path,
          view_type: row.view_type,
          order: row.order,
        }));
      const newImageRows = imageRows
        .filter(row => !row.id || !originalImageIds.has(row.id))
        .map(row => ({
          shoe_id: row.shoe_id,
          storage_path: row.storage_path,
          view_type: row.view_type,
          order: row.order,
        }));

      if (isShopListing) {
        const seen = new Set<number>();
        for (const v of variants) {
          if (typeof v.size_eu !== 'number' || isNaN(v.size_eu)) {
            throw new Error('Each size row needs an EU size.');
          }
          if (seen.has(v.size_eu)) {
            throw new Error(`Duplicate size EU ${v.size_eu}. Each size should appear once.`);
          }
          seen.add(v.size_eu);
          if (typeof v.quantity !== 'number' || v.quantity < 0) {
            throw new Error(`Stock for EU ${v.size_eu} must be 0 or more.`);
          }
        }
      }

      const { error: err } = await supabase
        .from('shoes')
        .update({
          brand: data.brand, model: data.model, color: data.color,
          condition: data.condition, mileage_km: data.condition === 'new' ? 0 : (data.mileage_km ?? null),
          listing_type: isShopListing ? 'for_sale' : data.listing_type,
          price_php: isShopListing || data.listing_type === 'for_sale' ? data.price_php : null,
          is_negotiable: isShopListing ? false : (data.listing_type === 'for_sale' ? !!data.is_negotiable : false),
          description: data.description,
          size_eu: isShopListing ? null : data.size_eu,
          size_us: isShopListing ? null : data.size_us,
          size_cm: isShopListing ? null : data.size_cm,
          us_size_type: isShopListing ? 'mens' : (data.us_size_type ?? 'mens'),
          ...(isShopListing ? { listed_in_main_feed: listedInMainFeed } : {}),
        })
        .eq('id', shoe.id);
      if (err) throw err;

      if (isShopListing) {
        // Save variants in separate batches. A mixed bulk upsert can send
        // id=null for new rows, which violates shoe_variants.id NOT NULL.
        const existingRows = variants
          .filter(v => v.id)
          .map(v => ({
            id: v.id as string,
            shoe_id: shoe.id,
            size_eu: v.size_eu as number,
            size_us: typeof v.size_us === 'number' ? v.size_us : null,
            size_cm: typeof v.size_cm === 'number' ? v.size_cm : null,
            us_size_type: v.us_size_type ?? 'mens',
            quantity: typeof v.quantity === 'number' ? v.quantity : 0,
          }));
        const newRows = variants.filter(v => !v.id).map(v => ({
          shoe_id: shoe.id,
          size_eu: v.size_eu as number,
          size_us: typeof v.size_us === 'number' ? v.size_us : null,
          size_cm: typeof v.size_cm === 'number' ? v.size_cm : null,
          us_size_type: v.us_size_type ?? 'mens',
          quantity: typeof v.quantity === 'number' ? v.quantity : 0,
        }));

        if (existingRows.length > 0) {
          const { error: varErr } = await supabase.from('shoe_variants').upsert(existingRows, {
            onConflict: 'shoe_id,size_eu',
          });
          if (varErr) throw varErr;
        }

        if (newRows.length > 0) {
          const { error: varErr } = await supabase.from('shoe_variants').insert(newRows);
          if (varErr) throw varErr;
        }
      }

      if (removedImages.length > 0) {
        const { error: imgDeleteErr } = await supabase
          .from('shoe_images')
          .delete()
          .in('id', removedImages.map(image => image.id));
        if (imgDeleteErr) throw imgDeleteErr;
      }

      if (existingImageRows.length > 0) {
        const { error: imgUpdateErr } = await supabase.from('shoe_images').upsert(existingImageRows);
        if (imgUpdateErr) throw imgUpdateErr;
      }

      if (newImageRows.length > 0) {
        const { error: imgInsertErr } = await supabase.from('shoe_images').insert(newImageRows);
        if (imgInsertErr) throw imgInsertErr;
      }

      if (removedImages.length > 0) {
        await supabase.storage
          .from('shoe-images')
          .remove(removedImages.map(image => image.storage_path));
      }

      router.push(`${getListingPath(shoe)}?updated=1`);
      router.refresh();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to update';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      {error && <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-400">{error}</div>}

      <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-4">
        <p className="text-sm font-semibold text-gray-100">Update the details buyers scan first.</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Keep price, condition, sizes, and notes accurate. If you changed something important, share the listing again after saving.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Main details</p>
          <p className="mt-1 text-xs text-gray-500">Keep the listing easy to scan.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Brand" required options={BRAND_OPTIONS} error={errors.brand?.message} {...register('brand')} />
          <Input label="Model" required error={errors.model?.message} {...register('model')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Color" required error={errors.color?.message} {...register('color')} />
          <div className="space-y-2">
            <Select label="Condition" required options={CONDITION_OPTIONS} error={errors.condition?.message} {...register('condition')} />
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
          <p className="mt-1 text-xs text-gray-500">Update what buyers filter and compare.</p>
        </div>

        {!isShopListing && (
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
              <Input label="EU" type="number" step={0.5} error={errors.size_eu?.message}
                {...register('size_eu', { onChange: e => handleSizeEuChange(e.target.value) })} />
              <Input label={usSizeType === 'womens' ? 'US W' : usSizeType === 'mens' ? 'US M' : 'US'} type="number" step={0.5} error={errors.size_us?.message}
                {...register('size_us', { onChange: e => handleSizeUsChange(e.target.value) })} />
              <Input label="CM" type="number" step={0.5} error={errors.size_cm?.message}
                {...register('size_cm', { onChange: e => handleSizeCmChange(e.target.value) })} />
            </div>
          </div>
        )}
        {!isShopListing && (
          <Select label="Listing Type" required options={LISTING_TYPE_OPTIONS} error={errors.listing_type?.message} {...register('listing_type')} />
        )}
        {(isShopListing || listingType === 'for_sale') && (
          <div className="space-y-2">
            <Input label="Price (PHP)" type="number" min={0} required error={errors.price_php?.message} {...register('price_php')} />
            <div className="rounded-lg border border-white/[0.08] bg-slate-950/40 px-3 py-2 text-xs leading-5 text-gray-500">
              If you lowered the price or clarified condition, share the listing again so buyers see the update.
              <a
                href="/official-running-shoe-brand-links-ph"
                className="ml-1 font-medium text-teal-300 hover:text-teal-200"
              >
                Check retail links
              </a>
            </div>
            {!isShopListing && (
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
          <p className="mt-1 text-xs text-gray-500">Keep notes honest and short.</p>
        </div>
        {isNew ? (
          <div className="rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3">
            <p className="text-sm font-medium text-gray-400">Mileage (km)</p>
            <p className="text-sm text-gray-500 mt-0.5">Automatically set to <span className="text-gray-300 font-medium">0 km</span> for new shoes.</p>
          </div>
        ) : (
          <Input label="Mileage (km)" type="number" min={0} placeholder="e.g. 350" hint="Optional — leave blank if unknown." error={errors.mileage_km?.message} {...register('mileage_km')} />
        )}
        <Textarea label="Description (optional)" rows={3} {...register('description')} />
        <div className="rounded-lg border border-white/[0.08] bg-slate-950/45 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200">Need a cleaner note?</p>
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

      {isShopListing && (
        <div id="variants" className="space-y-4 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 scroll-mt-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">Sizes & stock</p>
            <p className="text-xs text-gray-500 mb-3">Set stock to 0 to hide a size from buyers (it stays in your records). Add new sizes any time.</p>
            <VariantsEditor value={variants} onChange={setVariants} preserveRowsOnRemove />
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

      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-slate-950/45 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Photos</p>
          <p className="mt-1 text-xs text-gray-500">
            Replace weak photos or add extra angles. Top + sole stay required so buyers can check condition quickly.
          </p>
        </div>
        <PhotoUploader
          shoeId={shoe.id}
          photos={photos}
          onChange={(nextPhotos) => {
            setPhotos(nextPhotos as EditablePhoto[]);
            setError(null);
          }}
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={submitting}>Save Changes</Button>
      </div>
    </form>
  );
}
