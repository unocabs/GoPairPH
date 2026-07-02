'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { listingSchema, type ListingFormData } from '@/lib/validations';
import { BRANDS, CONDITIONS, US_SIZE_TYPE_OPTIONS } from '@/lib/constants';
import { PRICE_GUIDE_PREFILL_KEY, buildPriceGuideDescription, type PriceGuideListingPrefill } from '@/lib/pricing/priceGuidePrefill';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { VariantsEditor, type VariantRow } from '@/components/listings/VariantsEditor';
import type { UploadedPhoto } from '@/components/listings/PhotoUploader';
import { ListingV2PhotoUploader } from './ListingV2PhotoUploader';
import { findSizeConversion } from '@/lib/utils';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { InventoryMode, Shop } from '@/types';

const DRAFT_KEY = 'gopairph:new-listing-draft:v2';
const BRAND_OPTIONS = BRANDS.map(brand => ({ value: brand, label: brand }));
const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([value, label]) => ({ value, label }));
const EMPTY_VARIANT: VariantRow = { id: null, size_eu: '', size_us: '', size_cm: '', us_size_type: 'mens', quantity: 1 };

type WizardStep = 1 | 2 | 3 | 4;

interface ListingV2Draft {
  details: Partial<ListingFormData>;
  variants: VariantRow[];
  listedInMainFeed: boolean;
  inventoryMode: InventoryMode;
  photos: UploadedPhoto[];
  shoeId: string;
  step: WizardStep;
  savedAt: number;
}

interface ListingV2FormProps {
  profileId?: string | null;
  initialLocationCity?: string | null;
  shop?: Shop | null;
}

export function ListingV2Form({ profileId, initialLocationCity = null, shop = null }: ListingV2FormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const isGuest = !profileId;
  const isShop = !!shop;
  const [step, setStep] = useState<WizardStep>(1);
  const [shoeId, setShoeId] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([{ ...EMPTY_VARIANT }]);
  const [listedInMainFeed, setListedInMainFeed] = useState(true);
  const [inventoryMode, setInventoryMode] = useState<InventoryMode>(isShop ? 'multi' : 'single');
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultValues = useMemo<Partial<ListingFormData>>(() => isShop
    ? { listing_type: 'for_sale', condition: 'new', is_negotiable: false, size_eu: 99, us_size_type: 'mens' }
    : { listing_type: 'for_sale', us_size_type: 'mens', location_city: initialLocationCity ?? '' },
  [initialLocationCity, isShop]);

  const {
    register,
    control,
    reset,
    setValue,
    getValues,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as Resolver<ListingFormData>,
    defaultValues,
  });
  const values = useWatch({ control });
  const draftSignature = JSON.stringify({ values, variants, listedInMainFeed, inventoryMode, photos, shoeId, step });
  const listingType = values.listing_type ?? 'for_sale';
  const shoeNamePreview = [values.brand, values.model].filter(Boolean).join(' ').trim();
  const cameFromPriceGuide = searchParams.get('from') === 'price-guide';
  const condition = values.condition;
  const usSizeType = values.us_size_type ?? 'mens';
  const sizeEu = numberOrNull(values.size_eu);
  const sizeUs = numberOrNull(values.size_us);
  const locationLabel = isShop ? shop?.location?.trim() ?? '' : (values.location_city ?? '').trim();
  const suggestedNote = buildSuggestedNote({
    listingType,
    condition,
    mileage: numberOrNull(values.mileage_km),
    location: locationLabel,
  });

  useEffect(() => {
    let nextShoeId = createDraftShoeId();
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as ListingV2Draft;
        if (draft.details) reset({ ...defaultValues, ...draft.details });
        if (draft.variants?.length) setVariants(draft.variants);
        if (isShop && draft.inventoryMode) setInventoryMode(draft.inventoryMode);
        if (Array.isArray(draft.photos)) setPhotos(draft.photos.slice(0, 4));
        if (draft.shoeId) nextShoeId = draft.shoeId;
        setListedInMainFeed(draft.listedInMainFeed !== false);
        const resumeAtPhotos = !!profileId && searchParams.get('resume') === 'draft';
        setStep(resumeAtPhotos ? 4 : Math.min(4, Math.max(1, draft.step ?? 1)) as WizardStep);
        if (resumeAtPhotos) {
          trackMarketplaceAction('listing_sign_in_resumed', {
            listing_type: draft.details.listing_type ?? 'for_sale',
            surface: 'new_listing_v2',
            draft_restored: true,
          });
        }
      }
    } catch {
      clearDraft();
    } finally {
      setShoeId(nextShoeId);
      setHydrated(true);
    }
  // Restore once; route/auth context is fixed for this mounted form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || !shoeId) return;
    setSaveStatus('saving');
    const timeout = window.setTimeout(() => {
      persistDraft({
        details: getValues(),
        variants,
        listedInMainFeed,
        inventoryMode,
        photos: photos.slice(0, 4),
        shoeId,
        step,
        savedAt: Date.now(),
      });
      setSaveStatus('saved');
    }, 350);
    return () => window.clearTimeout(timeout);
  // draftSignature represents every autosaved input.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSignature, hydrated, inventoryMode]);

  useEffect(() => {
    if (!hydrated) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [hydrated, step]);

  useEffect(() => {
    const suggestedPrice = searchParams.get('price');
    if (suggestedPrice) {
      const parsed = Number(suggestedPrice);
      if (Number.isFinite(parsed) && parsed > 0) setValue('price_php', parsed, { shouldDirty: true });
    }
    if (searchParams.get('from') !== 'price-guide') return;
    try {
      const raw = window.localStorage.getItem(PRICE_GUIDE_PREFILL_KEY);
      if (!raw) return;
      const prefill = JSON.parse(raw) as PriceGuideListingPrefill;
      setValue('brand', prefill.brand, { shouldDirty: true });
      setValue('model', prefill.model, { shouldDirty: true });
      setValue('condition', prefill.condition, { shouldDirty: true });
      setValue('listing_type', 'for_sale', { shouldDirty: true });
      setValue('price_php', prefill.selectedPricePhp ?? prefill.suggestedHigh, { shouldDirty: true });
      setValue('srp_php', prefill.retailPricePhp, { shouldDirty: true });
      if (prefill.mileage === 'unused') setValue('mileage_km', 0, { shouldDirty: true });
      setValue('description', buildPriceGuideDescription(prefill), { shouldDirty: true });
    } catch {
      // Keep the form usable if the handoff is malformed.
    } finally {
      window.localStorage.removeItem(PRICE_GUIDE_PREFILL_KEY);
    }
  }, [searchParams, setValue]);

  async function next() {
    setError(null);
    if (step === 1) {
      const valid = await trigger(['brand', 'model', 'color', 'listing_type', 'price_php', 'srp_php']);
      if (valid) setStep(2);
      return;
    }
    if (step === 2) {
      if (isShop) {
        const conditionValid = await trigger('condition');
        if (!conditionValid) return;
        if (inventoryMode === 'multi') {
          const variantError = validateVariants(variants);
          if (variantError) { setError(variantError); return; }
        } else {
          const sizeValid = await trigger(['size_eu', 'size_us', 'size_cm']);
          if (!sizeValid) return;
        }
      } else {
        const valid = await trigger(['size_eu', 'size_us', 'size_cm', 'condition']);
        if (!valid) return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      await handleSubmit(completeDetails)();
    }
  }

  function completeDetails(details: ListingFormData) {
    setError(null);
    trackMarketplaceAction('listing_create_start', {
      listing_type: isShop ? 'shop' : details.listing_type,
      is_guest: isGuest,
      surface: 'new_listing_v2',
    });
    if (isGuest) {
      persistDraft({ details, variants, listedInMainFeed, inventoryMode, photos, shoeId, step: 4, savedAt: Date.now() });
      trackMarketplaceAction('listing_sign_in_required', {
        listing_type: details.listing_type,
        surface: 'new_listing_v2',
        blocked_at_step: 4,
        auth_required: true,
      });
      router.push(`/auth/sign-in?next=${encodeURIComponent('/listings/new?resume=draft')}`);
      return;
    }
    setStep(4);
  }

  async function publish() {
    if (!profileId || !shoeId) return;
    const parsedDetails = listingSchema.safeParse(getValues());
    if (!parsedDetails.success) {
      setError('Some listing details need attention. Please review the previous steps.');
      setStep(3);
      return;
    }
    const details = parsedDetails.data;
    if (!photos.some(photo => photo.viewType === 'top') || !photos.some(photo => photo.viewType === 'sole')) {
      setError('Top and sole photos are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const city = !isShop ? details.location_city?.trim() : '';
      if (city) {
        const { error: locationError } = await supabase.from('profiles').update({ location: null, location_city: city }).eq('id', profileId);
        if (locationError) throw locationError;
      }

      const { data: inserted, error: insertError } = await supabase.from('shoes').insert({
        id: shoeId,
        seller_id: profileId,
        brand: details.brand,
        model: details.model,
        color: details.color,
        condition: details.condition,
        mileage_km: details.condition === 'new' ? 0 : (details.mileage_km ?? null),
        listing_type: isShop ? 'for_sale' : details.listing_type,
        price_php: isShop || details.listing_type === 'for_sale' ? details.price_php : null,
        srp_php: isShop || details.listing_type === 'for_sale' ? (details.srp_php ?? null) : null,
        is_negotiable: !isShop && details.listing_type === 'for_sale' ? !!details.is_negotiable : false,
        description: details.description,
        size_eu: isShop && inventoryMode === 'multi' ? null : positiveNumberOrNull(details.size_eu),
        size_us: isShop && inventoryMode === 'multi' ? null : positiveNumberOrNull(details.size_us),
        size_cm: isShop && inventoryMode === 'multi' ? null : positiveNumberOrNull(details.size_cm),
        us_size_type: isShop && inventoryMode === 'multi' ? 'mens' : (details.us_size_type ?? 'mens'),
        status: 'active',
        shop_id: shop?.id ?? null,
        quantity: isShop && inventoryMode === 'single' ? 1 : 0,
        listed_in_main_feed: isShop ? listedInMainFeed : true,
        inventory_mode: isShop ? inventoryMode : 'single',
        has_stock: true,
      }).select('id').single();
      if (insertError || !inserted) throw insertError ?? new Error('Could not publish listing.');

      if (isShop && inventoryMode === 'multi') {
        const rows = variants.filter(validVariant).map(variant => ({
          shoe_id: shoeId,
          size_eu: variant.size_eu as number,
          size_us: typeof variant.size_us === 'number' ? variant.size_us : null,
          size_cm: typeof variant.size_cm === 'number' ? variant.size_cm : null,
          us_size_type: variant.us_size_type ?? 'mens',
          quantity: variant.quantity as number,
        }));
        const { error: variantsError } = await supabase.from('shoe_variants').insert(rows);
        if (variantsError) throw variantsError;
      }

      const { error: imagesError } = await supabase.from('shoe_images').insert(photos.slice(0, 4).map((photo, index) => ({
        shoe_id: shoeId,
        storage_path: photo.storagePath,
        view_type: photo.viewType,
        order: index,
      })));
      if (imagesError) throw imagesError;

      trackMarketplaceAction('listing_publish', { listing_id: shoeId, listing_type: isShop ? 'shop' : details.listing_type, surface: 'new_listing_v2' });
      clearDraft();
      void supabase.rpc('gp_coin_schedule_listing_publish_award', {
        p_listing_id: shoeId,
      });
      void Promise.allSettled([
        fetch('/api/admin/new-listing-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: shoeId }),
          keepalive: true,
        }),
        fetch(`/api/listings/${encodeURIComponent(shoeId)}/published-email`, { method: 'POST', keepalive: true }),
      ]);
      router.push(`/listings/new?share=${encodeURIComponent(shoeId)}`);
    } catch (publishError) {
      setError((publishError as { message?: string })?.message ?? 'Failed to publish listing.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || !shoeId) {
    return <div className="flex min-h-[55vh] items-center justify-center text-sm text-gray-500">Restoring your draft…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <WizardHeader
        step={step}
        saveStatus={saveStatus}
        onBack={() => step > 1 ? setStep(current => Math.max(1, current - 1) as WizardStep) : router.back()}
      />

      {error && <div className="mb-3 rounded-xl border border-red-500/25 bg-red-950/70 p-3 text-sm text-red-200" role="alert">{error}</div>}

      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-3 shadow-2xl shadow-black/20 sm:p-5">
        {step === 1 && (
          <StepSection title="Shoe Details and Price" subtitle="Add what buyers search for and your asking price." accessory={<ShoePriceIcons />}>
            {!isShop && (
              <div className="grid grid-cols-2 gap-2">
                {([['for_sale', 'For Sale'], ['donate', 'Free Shoes']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('listing_type', value, { shouldDirty: true, shouldValidate: true })}
                    className={`min-h-10 rounded-lg border text-sm font-bold transition-colors ${listingType === value ? 'border-teal-400/50 bg-teal-500/15 text-teal-100' : 'border-white/[0.08] bg-slate-950/55 text-gray-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="min-w-0">
                <Select label="Brand" required options={BRAND_OPTIONS} placeholder="Brand" error={errors.brand?.message} {...register('brand')} />
              </div>
              <div className="col-span-2 min-w-0">
                <Input label="Model" required placeholder="e.g. Pegasus 40" error={errors.model?.message} {...register('model')} />
              </div>
            </div>
            <p className="-mt-1 text-[11px] leading-4 text-gray-500" aria-live="polite">
              Shoe Name: {shoeNamePreview || 'Brand + model'}
            </p>
            <Input label="Colorway" required placeholder="e.g. Black/White" error={errors.color?.message} {...register('color')} />
            {(isShop || listingType === 'for_sale') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Price (PHP)" required type="number" min={0} placeholder="2500" error={errors.price_php?.message} {...register('price_php')} />
                  <Input label="SRP (optional)" type="number" min={0} placeholder="9000" error={errors.srp_php?.message} {...register('srp_php')} />
                </div>
                {!isShop && (
                  <label className="flex min-h-10 items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-teal-500" {...register('is_negotiable')} />
                    Negotiable
                  </label>
                )}
              </>
            )}
            {!cameFromPriceGuide && (isShop || listingType === 'for_sale') && (
              <div className="rounded-xl border border-teal-400/20 bg-teal-500/[0.05] p-3">
                <p className="text-sm font-bold text-gray-100">Check Estimated Resale Price</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">Get a suggested resale range before choosing your price.</p>
                <Link
                  href="/price-guide"
                  onClick={() => trackMarketplaceAction('price_estimator_open', { surface: 'new_listing_v2' })}
                  className="mt-2 inline-flex min-h-9 items-center justify-center rounded-lg border border-teal-400/30 bg-slate-950/55 px-3 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-500/10"
                >
                  Check Price Estimator
                </Link>
              </div>
            )}
          </StepSection>
        )}

        {step === 2 && (
          <StepSection
            title={isShop ? 'Sizes, Stock, and Condition' : 'Size and Condition'}
            subtitle="Add the details buyers filter by."
            accessory={<SizeConditionIcons />}
          >
            {isShop && (
              <div className="grid grid-cols-2 gap-2">
                {([['single', 'Single shoe'], ['multi', 'Multiple stock']] as const).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => {
                    setInventoryMode(mode);
                    if (mode === 'single' && Number(getValues('size_eu')) === 99) setValue('size_eu', null, { shouldValidate: true });
                    if (mode === 'multi' && !getValues('size_eu')) setValue('size_eu', 99);
                  }} className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition-colors ${inventoryMode === mode ? 'border-teal-400/50 bg-teal-500/15 text-teal-100' : 'border-white/[0.08] bg-slate-950/55 text-gray-400'}`}>{label}</button>
                ))}
              </div>
            )}
            {isShop && inventoryMode === 'multi' ? (
              <VariantsEditor value={variants} onChange={setVariants} />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Input label="EU" type="number" step={0.5} min={35} max={48} error={errors.size_eu?.message} {...register('size_eu', { onChange: event => convertSize('eu', event.target.value, usSizeType, setValue) })} />
                  <Input label={usSizeType === 'womens' ? 'US W' : 'US M'} type="number" step={0.5} error={errors.size_us?.message} {...register('size_us', { onChange: event => convertSize('us', event.target.value, usSizeType, setValue) })} />
                  <Input label="CM" type="number" step={0.5} error={errors.size_cm?.message} {...register('size_cm', { onChange: event => convertSize('cm', event.target.value, usSizeType, setValue) })} />
                </div>
                <div className="w-1/2">
                  <Select label="US size type" options={[...US_SIZE_TYPE_OPTIONS]} value={usSizeType} onChange={event => handleSizeType(event.target.value, sizeEu, sizeUs, setValue)} />
                </div>
              </>
            )}
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-300">Condition <span className="text-teal-400">*</span></p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONDITION_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('condition', option.value as ListingFormData['condition'], { shouldDirty: true, shouldValidate: true })}
                    className={`min-h-10 rounded-lg border px-2 text-xs font-bold transition-colors ${condition === option.value ? 'border-teal-400/50 bg-teal-500/15 text-teal-100' : 'border-white/[0.08] bg-slate-950/55 text-gray-400'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.condition?.message && <p className="mt-1 text-xs text-red-400">{errors.condition.message}</p>}
            </div>
            {isShop && (
              <label className="flex items-start gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={listedInMainFeed} onChange={event => setListedInMainFeed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-teal-500" />
                Also show in the main Browse feed
              </label>
            )}
          </StepSection>
        )}

        {step === 3 && (
          <StepSection title="Location and notes" subtitle="Add anything buyers should know." accessory={<LocationStepIcon />}>
            {!isShop && <Input label="Location" placeholder="e.g. Angeles City" error={errors.location_city?.message} {...register('location_city')} />}
            {condition === 'new' ? (
              <div className="rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2 text-sm text-gray-400">Mileage is set to <strong className="text-gray-200">0 km</strong> for brand-new shoes.</div>
            ) : (
              <Input label="Mileage (km)" type="number" min={0} placeholder="Leave blank if not tracked" error={errors.mileage_km?.message} {...register('mileage_km')} />
            )}
            <Textarea
              label="Description (optional)"
              rows={4}
              className="text-base sm:text-sm"
              placeholder="Flaws, inclusions, meetup, delivery, or other details…"
              {...register('description')}
            />
            <button
              type="button"
              onClick={() => setValue('description', suggestedNote, { shouldDirty: true })}
              className="min-h-10 w-full rounded-lg border border-teal-400/25 bg-teal-500/[0.06] px-3 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10"
            >
              Use a suggested note
            </button>
          </StepSection>
        )}

        {step === 4 && (
          <StepSection title="Photos and publish" subtitle="Top and sole photos are required.">
            <ListingV2PhotoUploader shoeId={shoeId} photos={photos} onChange={next => { setPhotos(next.slice(0, 4)); setError(null); }} />
          </StepSection>
        )}
      </div>

      {step <= 4 && (
        <>
          <div className="h-24" aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-slate-950/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
            <Button
              type="button"
              size="lg"
              onClick={() => step === 4 ? void publish() : void next()}
              loading={step === 4 && submitting}
              disabled={step === 4 && (!photos.some(photo => photo.viewType === 'top') || !photos.some(photo => photo.viewType === 'sole'))}
              className={`mx-auto flex ${step === 4 ? 'w-full max-w-2xl whitespace-nowrap' : 'w-2/3 max-w-md'}`}
            >
              {step === 4
                ? 'Publish and Continue to Share'
                : step === 3 && isGuest
                  ? 'Save & Sign In'
                  : step === 3
                    ? 'Continue to Photos'
                    : 'Continue'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function WizardHeader({ step, saveStatus, onBack }: { step: WizardStep; saveStatus: 'saved' | 'saving'; onBack: () => void }) {
  const labels = ['Shoe & price', 'Size & condition', 'Notes', 'Photos', 'Share'];
  const percent = step * 20;
  return (
    <div className="sticky top-14 z-30 mb-3 rounded-xl border border-white/[0.08] bg-slate-950/95 p-3 shadow-xl shadow-black/20 backdrop-blur sm:top-20">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-100">Step {step} of 5 · {labels[step - 1]}</p>
          <p className="mt-0.5 text-[11px] text-gray-500" aria-live="polite">{saveStatus === 'saving' ? 'Saving…' : 'Draft saved'}</p>
        </div>
        <button type="button" onClick={onBack} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 font-semibold text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200">
          <span aria-hidden="true">←</span> Back
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800" aria-label={`${percent}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StepSection({ title, subtitle, accessory, children }: { title: string; subtitle: string; accessory?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-gray-100">{title}</h1>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
        {accessory}
      </div>
      {children}
    </section>
  );
}

function SizeConditionIcons() {
  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/[0.08] text-teal-200">
        <svg className="h-5 w-5 -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 8.5h16v7H4zM8 8.5v3m4-3v2m4-2v3" />
        </svg>
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/[0.08] text-sky-200">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
      </span>
    </div>
  );
}

function ShoePriceIcons() {
  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
      <ShoeStepIcon />
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/[0.08] text-base font-black text-sky-200">₱</span>
    </div>
  );
}

function ShoeStepIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/[0.08] text-teal-200" aria-hidden="true">
      <svg className="h-6 w-7" viewBox="0 0 64 40" fill="none">
        <path d="M5 24.5c6.2.2 11-2.5 14.2-8.2l3.7-6.6 9.8 7.3c4.1 3.1 8.8 5.2 13.8 6.2l8.3 1.7c3 .6 5.2 3.2 5.2 6.2 0 3.5-2.8 6.3-6.3 6.3H12.5C7.3 37.4 3 33.2 3 28v-3.5h2Z" fill="currentColor" />
        <path d="M4.5 30.5h54.7M21.5 17.3l9.7 1.5m-12.1 2.8 15.2 2.2m-17.5 2.1 20.5 2.6" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M24 10.5 20.5 18M31.7 17l3.2-3.5" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function LocationStepIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/[0.08] text-teal-200" aria-hidden="true">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.25" strokeWidth="1.8" />
      </svg>
    </span>
  );
}

function persistDraft(draft: ListingV2Draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The form remains usable when local storage is blocked.
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage can be unavailable in private or embedded browser sessions.
  }
}

function createDraftShoeId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch {
    // Fall through to an RFC 4122-compatible UUID for older/restricted browsers.
  }

  const bytes = new Uint8Array(16);
  try {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    }
  } catch {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function numberOrNull(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumberOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function convertSize(unit: 'eu' | 'us' | 'cm', raw: string, sizeType: string, setValue: ReturnType<typeof useForm<ListingFormData>>['setValue']) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return;
  const conversion = findSizeConversion(unit, parsed, sizeType);
  if (!conversion) return;
  if (unit !== 'eu') setValue('size_eu', conversion.eu, { shouldDirty: true });
  if (unit !== 'us') setValue('size_us', conversion.us, { shouldDirty: true });
  if (unit !== 'cm') setValue('size_cm', conversion.cm, { shouldDirty: true });
}

function handleSizeType(value: string, sizeEu: number | null, sizeUs: number | null, setValue: ReturnType<typeof useForm<ListingFormData>>['setValue']) {
  setValue('us_size_type', value as ListingFormData['us_size_type'], { shouldDirty: true });
  const conversion = sizeUs ? findSizeConversion('us', sizeUs, value) : sizeEu ? findSizeConversion('eu', sizeEu, value) : null;
  if (!conversion) return;
  setValue('size_eu', conversion.eu, { shouldDirty: true });
  setValue('size_us', conversion.us, { shouldDirty: true });
  setValue('size_cm', conversion.cm, { shouldDirty: true });
}

function validVariant(variant: VariantRow): boolean {
  return typeof variant.size_eu === 'number' && typeof variant.quantity === 'number' && variant.quantity >= 1;
}

function validateVariants(variants: VariantRow[]): string | null {
  const valid = variants.filter(validVariant);
  if (valid.length === 0) return 'Add at least one size with stock.';
  const seen = new Set<number>();
  for (const variant of valid) {
    if (seen.has(variant.size_eu as number)) return `EU ${variant.size_eu} is listed more than once.`;
    seen.add(variant.size_eu as number);
  }
  return null;
}

function buildSuggestedNote({ listingType, condition, mileage, location }: { listingType: string; condition?: string; mileage: number | null; location: string }) {
  const meetup = location ? `Meetup around ${location} preferred.` : 'Meetup, delivery, or shipping can be discussed.';
  if (listingType === 'donate') return `Free pair available. See photos for condition.\n${meetup}`;
  if (condition === 'new') return `Brand-new pair. See photos for box, tags, and condition.\n${meetup}`;
  return `${mileage != null ? `Used for approximately ${mileage} km.` : 'Mileage not tracked.'} See photos for condition.\n${meetup}`;
}
