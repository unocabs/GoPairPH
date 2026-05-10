'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { listingSchema, type ListingFormData } from '@/lib/validations';
import { BRANDS, CONDITIONS, SIZE_CONVERSIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { VariantsEditor, type VariantRow } from '@/components/listings/VariantsEditor';
import type { Shoe } from '@/types';

const BRAND_OPTIONS = BRANDS.map(b => ({ value: b, label: b }));
const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([v, l]) => ({ value: v, label: l }));
const LISTING_TYPE_OPTIONS = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'donate', label: 'Donate (Free)' },
];

export function EditListingForm({ shoe }: { shoe: Shoe }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [listedInMainFeed, setListedInMainFeed] = useState<boolean>(shoe.listed_in_main_feed ?? true);
  const isShopListing = !!shoe.shop_id;

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
  const isNew = condition === 'new';

  function handleSizeEuChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = SIZE_CONVERSIONS.find(s => s.eu === num);
    if (match) { setValue('size_us', match.us); setValue('size_cm', match.cm); }
  }

  function handleSizeUsChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = SIZE_CONVERSIONS.find(s => s.us === num);
    if (match) { setValue('size_eu', match.eu); setValue('size_cm', match.cm); }
  }

  function handleSizeCmChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = SIZE_CONVERSIONS.find(s => s.cm === num);
    if (match) { setValue('size_eu', match.eu); setValue('size_us', match.us); }
  }

  async function onSubmit(data: ListingFormData) {
    setSubmitting(true);
    setError(null);
    try {
      // Validate variants for shop listings up-front.
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
            quantity: typeof v.quantity === 'number' ? v.quantity : 0,
          }));
        const newRows = variants.filter(v => !v.id).map(v => ({
          shoe_id: shoe.id,
          size_eu: v.size_eu as number,
          size_us: typeof v.size_us === 'number' ? v.size_us : null,
          size_cm: typeof v.size_cm === 'number' ? v.size_cm : null,
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

      router.push(`/listings/${shoe.id}`);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Brand" required options={BRAND_OPTIONS} error={errors.brand?.message} {...register('brand')} />
        <Input label="Model" required error={errors.model?.message} {...register('model')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Color" required error={errors.color?.message} {...register('color')} />
        <Select label="Condition" required options={CONDITION_OPTIONS} error={errors.condition?.message} {...register('condition')} />
      </div>
      {isNew ? (
        <div className="rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3">
          <p className="text-sm font-medium text-gray-400">Mileage (km)</p>
          <p className="text-sm text-gray-500 mt-0.5">Automatically set to <span className="text-gray-300 font-medium">0 km</span> for new shoes.</p>
        </div>
      ) : (
        <Input label="Mileage (km)" type="number" min={0} placeholder="e.g. 350" hint="Optional — leave blank if unknown." error={errors.mileage_km?.message} {...register('mileage_km')} />
      )}
      {!isShopListing && (
        <div className="grid grid-cols-3 gap-3">
          <Input label="EU" type="number" step={0.5} error={errors.size_eu?.message}
            {...register('size_eu', { onChange: e => handleSizeEuChange(e.target.value) })} />
          <Input label="US" type="number" step={0.5} error={errors.size_us?.message}
            {...register('size_us', { onChange: e => handleSizeUsChange(e.target.value) })} />
          <Input label="CM" type="number" step={0.5} error={errors.size_cm?.message}
            {...register('size_cm', { onChange: e => handleSizeCmChange(e.target.value) })} />
        </div>
      )}
      {!isShopListing && (
        <Select label="Listing Type" required options={LISTING_TYPE_OPTIONS} error={errors.listing_type?.message} {...register('listing_type')} />
      )}
      {(isShopListing || listingType === 'for_sale') && (
        <div className="space-y-2">
          <Input label="Price (PHP)" type="number" min={0} required error={errors.price_php?.message} {...register('price_php')} />
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
      <Textarea label="Description (optional)" rows={3} {...register('description')} />

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

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={submitting}>Save Changes</Button>
      </div>
    </form>
  );
}
