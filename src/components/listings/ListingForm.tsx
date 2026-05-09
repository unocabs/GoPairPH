'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { listingSchema, type ListingFormData } from '@/lib/validations';
import { BRANDS, CONDITIONS, SIZE_CONVERSIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { PhotoUploader, type UploadedPhoto } from './PhotoUploader';
import { VariantsEditor, type VariantRow } from './VariantsEditor';
import type { Shop } from '@/types';

const BRAND_OPTIONS = BRANDS.map(b => ({ value: b, label: b }));
const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([v, l]) => ({ value: v, label: l }));
const LISTING_TYPE_OPTIONS = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'donate', label: 'Donate (Free)' },
];

interface ListingFormProps {
  profileId: string;
  shop?: Shop | null;
}

export function ListingForm({ profileId, shop = null }: ListingFormProps) {
  const isShop = !!shop;

  const [step, setStep] = useState<1 | 2>(1);
  const [shoeId, setShoeId] = useState<string | null>(null);
  const [details, setDetails] = useState<ListingFormData | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([{ id: null, size_eu: '', size_us: '', size_cm: '', quantity: 1 }]);
  const [listedInMainFeed, setListedInMainFeed] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as Resolver<ListingFormData>,
    defaultValues: isShop
      ? { listing_type: 'for_sale', condition: 'new', is_negotiable: false, size_eu: 99 /* placeholder; overridden to NULL on insert */ }
      : { listing_type: 'for_sale' },
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

  function onDetailsSubmit(data: ListingFormData) {
    setError(null);
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
      const { error: insertError } = await supabase
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
          status: 'active',
          shop_id: shop?.id ?? null,
          quantity: 0,
          listed_in_main_feed: isShop ? listedInMainFeed : true,
        });
      if (insertError) throw insertError;

      if (isShop) {
        const variantRows = variants
          .filter(v => typeof v.size_eu === 'number' && typeof v.quantity === 'number' && v.quantity >= 1)
          .map(v => ({
            shoe_id: shoeId,
            size_eu: v.size_eu as number,
            size_us: typeof v.size_us === 'number' ? v.size_us : null,
            size_cm: typeof v.size_cm === 'number' ? v.size_cm : null,
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
      router.push(`/listings/${shoeId}`);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to publish listing';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Brand" required options={BRAND_OPTIONS} placeholder="Select brand" error={errors.brand?.message} {...register('brand')} />
            <Input label="Model" placeholder="e.g. Pegasus 40" required error={errors.model?.message} {...register('model')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Color" placeholder="e.g. Black/White" required error={errors.color?.message} {...register('color')} />
            <Select label="Condition" required options={CONDITION_OPTIONS} error={errors.condition?.message} {...register('condition')} />
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
              hint="Optional — leave blank if unknown."
              error={errors.mileage_km?.message}
              {...register('mileage_km')}
            />
          )}

          {!isShop && (
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">
                Size <span className="text-teal-400">*</span>
                <span className="ml-1 text-xs text-gray-500 font-normal">(fill any one — the others auto-fill)</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Input label="EU" type="number" step={0.5} min={35} max={48} error={errors.size_eu?.message}
                  {...register('size_eu', { onChange: e => handleSizeEuChange(e.target.value) })} />
                <Input label="US" type="number" step={0.5} error={errors.size_us?.message}
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

          <Textarea label="Description (optional)" rows={3} placeholder="Add any other details about the shoes..." {...register('description')} />

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
            Continue to Photos →
          </Button>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && shoeId && (
        <div className="space-y-6">
          <PhotoUploader shoeId={shoeId} photos={photos} onChange={setPhotos} />
          <Button onClick={onPhotosSubmit} size="lg" loading={submitting} className="w-full">
            Publish Listing
          </Button>
        </div>
      )}
    </div>
  );
}
