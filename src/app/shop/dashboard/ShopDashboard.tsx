'use client';

import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatListingName, getPublicUrl } from '@/lib/utils';
import { getShopTheme, SHOP_THEME_PRESETS } from '@/lib/shopTheme';
import { SafeShopImage } from '@/components/shop/SafeShopImage';
import type { Shoe, Shop, ShopCarouselItem } from '@/types';

type ListingOption = Pick<Shoe, 'id' | 'brand' | 'model' | 'status' | 'shoe_images'>;

interface ImageDraft {
  file: File | null;
  previewUrl: string | null;
  storagePath: string | null;
}

interface CarouselDraft extends ImageDraft {
  listingId: string;
}

interface ShopDashboardProps {
  shop: Shop;
  listings: ListingOption[];
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DEFAULT_BACKGROUND = '#030712';
const DEFAULT_ACCENT = '#14b8a6';

async function convertToWebP(file: File, maxDim = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Could not prepare this image.'));
        },
        'image/webp',
        0.86
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image format is not supported by your browser.'));
    };

    img.src = url;
  });
}

function emptyImageDraft(storagePath: string | null = null): ImageDraft {
  return { file: null, previewUrl: null, storagePath };
}

function carouselDraftsFromShop(shop: Shop): CarouselDraft[] {
  const items = Array.isArray(shop.carousel_items) ? shop.carousel_items : [];
  return items.slice(0, 4).map(item => ({
    file: null,
    previewUrl: null,
    storagePath: item.image_storage_path,
    listingId: item.listing_id ?? '',
  }));
}

function revokeDraftUrl(draft: ImageDraft) {
  if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
}

function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/') || (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type))) {
    return 'Please choose a JPG, PNG, WebP, or HEIC image.';
  }
  if (file.size > 8 * 1024 * 1024) {
    return 'Please choose an image under 8 MB.';
  }
  return null;
}

export function ShopDashboard({ shop, listings }: ShopDashboardProps) {
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const [name, setName] = useState(shop.name);
  const [location, setLocation] = useState(shop.location ?? '');
  const [fbPageUrl, setFbPageUrl] = useState(shop.fb_page_url ?? '');
  const [about, setAbout] = useState(shop.about ?? '');
  const [backgroundColor, setBackgroundColor] = useState(shop.background_color ?? DEFAULT_BACKGROUND);
  const [accentColor, setAccentColor] = useState(shop.accent_color ?? DEFAULT_ACCENT);
  const [logo, setLogo] = useState<ImageDraft>(() => emptyImageDraft(shop.logo_storage_path));
  const [header, setHeader] = useState<ImageDraft>(() => emptyImageDraft(shop.header_image_storage_path));
  const [carousel, setCarousel] = useState<CarouselDraft[]>(() => carouselDraftsFromShop(shop));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewTheme = getShopTheme(backgroundColor, accentColor);

  function imageUrl(draft: ImageDraft): string | null {
    if (draft.previewUrl) return draft.previewUrl;
    return draft.storagePath ? getPublicUrl(supabaseUrl, draft.storagePath, 'shop-logos') : null;
  }

  function setImage(kind: 'logo' | 'header', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const imageError = validateImage(file);
    if (imageError) {
      setError(imageError);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (kind === 'logo') {
      revokeDraftUrl(logo);
      setLogo(current => ({ ...current, file, previewUrl }));
    } else {
      revokeDraftUrl(header);
      setHeader(current => ({ ...current, file, previewUrl }));
    }
    setError(null);
  }

  function clearImage(kind: 'logo' | 'header') {
    if (kind === 'logo') {
      revokeDraftUrl(logo);
      setLogo(emptyImageDraft(null));
    } else {
      revokeDraftUrl(header);
      setHeader(emptyImageDraft(null));
    }
  }

  function addCarouselSlot() {
    if (carousel.length >= 4) return;
    setCarousel(current => [...current, { file: null, previewUrl: null, storagePath: null, listingId: '' }]);
  }

  function removeCarouselSlot(index: number) {
    setCarousel(current => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed) revokeDraftUrl(removed);
      return next;
    });
  }

  function setCarouselImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const imageError = validateImage(file);
    if (imageError) {
      setError(imageError);
      return;
    }

    setCarousel(current => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      revokeDraftUrl(item);
      return { ...item, file, previewUrl: URL.createObjectURL(file) };
    }));
    setError(null);
  }

  function setCarouselLink(index: number, listingId: string) {
    setCarousel(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, listingId } : item));
  }

  function applyPreset(background: string, accent: string) {
    setBackgroundColor(background);
    setAccentColor(accent);
  }

  async function uploadDraft(draft: ImageDraft, folder: string, uploadedPaths: string[]): Promise<string | null> {
    if (!draft.file) return draft.storagePath;

    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in before uploading images.');

    const blob = await convertToWebP(draft.file, folder === 'header' ? 1800 : 1200);
    const storagePath = `${userId}/${shop.id}/${folder}-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('shop-logos')
      .upload(storagePath, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
    if (uploadError) throw uploadError;

    uploadedPaths.push(storagePath);
    return storagePath;
  }

  async function removeOwnedPaths(paths: string[]) {
    if (paths.length === 0) return;
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const ownedPaths = paths.filter(path => path.startsWith(`${userId}/`));
    if (ownedPaths.length > 0) {
      await supabase.storage.from('shop-logos').remove(ownedPaths);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirm('Save your shop dashboard changes and upload any selected images?')) return;

    setSaving(true);
    setError(null);
    const uploadedPaths: string[] = [];

    try {
      const nextLogoPath = await uploadDraft(logo, 'logo', uploadedPaths);
      const nextHeaderPath = await uploadDraft(header, 'header', uploadedPaths);
      const nextCarouselItems: ShopCarouselItem[] = [];

      for (let index = 0; index < carousel.length; index += 1) {
        const item = carousel[index];
        const nextPath = await uploadDraft(item, `carousel-${index + 1}`, uploadedPaths);
        if (nextPath) {
          nextCarouselItems.push({
            image_storage_path: nextPath,
            listing_id: item.listingId || null,
          });
        }
      }

      const { error: updateError } = await createClient().rpc('owner_update_shop_profile', {
        p_shop_id: shop.id,
        p_name: name,
        p_logo_storage_path: nextLogoPath,
        p_header_image_storage_path: nextHeaderPath,
        p_about: about || null,
        p_location: location || null,
        p_fb_page_url: fbPageUrl || null,
        p_background_color: backgroundColor,
        p_accent_color: accentColor,
        p_carousel_items: nextCarouselItems,
      });
      if (updateError) throw updateError;

      const nextPaths = new Set([
        nextLogoPath,
        nextHeaderPath,
        ...nextCarouselItems.map(item => item.image_storage_path),
      ].filter(Boolean) as string[]);
      const previousPaths = [
        shop.logo_storage_path,
        shop.header_image_storage_path,
        ...((shop.carousel_items ?? []).map(item => item.image_storage_path)),
      ].filter(Boolean) as string[];
      await removeOwnedPaths(previousPaths.filter(path => !nextPaths.has(path)));

      router.refresh();
      alert('Shop dashboard saved.');
    } catch (err) {
      await removeOwnedPaths(uploadedPaths);
      const message = err instanceof Error ? err.message : 'Could not save your shop dashboard.';
      setError(
        message.toLowerCase().includes('bucket not found')
          ? 'Logo storage is not set up yet. Apply the shop-logo Supabase migration first.'
          : message
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Shop Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-100">{shop.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Customize the storefront your buyers see at /shop/{shop.slug}.</p>
        </div>
        <Link href={`/shop/${shop.slug}`} className="text-sm font-semibold text-teal-400 hover:text-teal-300">
          View shop
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,430px)_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-base font-semibold text-gray-100">Shop details</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shop name</span>
                <input required value={name} onChange={event => setName(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</span>
                <input value={location} onChange={event => setLocation(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Facebook page URL</span>
                <input type="url" value={fbPageUrl} onChange={event => setFbPageUrl(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">About</span>
                <textarea rows={5} value={about} onChange={event => setAbout(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-100">Theme</h2>
                <p className="mt-1 text-xs text-gray-500">Start from a preset, then adjust the colors.</p>
              </div>
              <button
                type="button"
                onClick={() => applyPreset(DEFAULT_BACKGROUND, DEFAULT_ACCENT)}
                className="shrink-0 text-xs font-semibold text-teal-400 hover:text-teal-300"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {SHOP_THEME_PRESETS.map(preset => {
                const active = preset.background === backgroundColor && preset.accent === accentColor;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset.background, preset.accent)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${active ? 'border-teal-500 bg-teal-500/10' : 'border-gray-800 bg-gray-950/50 hover:bg-gray-800/60'}`}
                  >
                    <span className="flex shrink-0 overflow-hidden rounded-full border border-white/10">
                      <span className="h-8 w-8" style={{ backgroundColor: preset.background }} />
                      <span className="h-8 w-8" style={{ backgroundColor: preset.accent }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-100">{preset.name}</span>
                      <span className="block text-xs text-gray-500">{preset.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Page background</span>
                <input type="color" value={backgroundColor} onChange={event => setBackgroundColor(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-gray-700 bg-gray-800 p-1" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brand accent</span>
                <input type="color" value={accentColor} onChange={event => setAccentColor(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-gray-700 bg-gray-800 p-1" />
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-base font-semibold text-gray-100">Images</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ImagePicker title="Logo" draft={logo} url={imageUrl(logo)} onChange={event => setImage('logo', event)} onClear={() => clearImage('logo')} saving={saving} />
              <ImagePicker title="Header photo" draft={header} url={imageUrl(header)} onChange={event => setImage('header', event)} onClear={() => clearImage('header')} saving={saving} wide />
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-100">Carousel</h2>
                <p className="mt-1 text-xs text-gray-500">Optional, up to 4 images. Each image can link to a listing.</p>
              </div>
              <button type="button" onClick={addCarouselSlot} disabled={carousel.length >= 4 || saving} className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                Add image
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {carousel.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-800 py-8 text-center text-sm text-gray-500">No carousel images yet.</div>
              ) : carousel.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3 md:grid-cols-[180px_1fr_auto]">
                  <ImagePicker title={`Image ${index + 1}`} draft={item} url={imageUrl(item)} onChange={event => setCarouselImage(index, event)} saving={saving} compact />
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optional listing link</span>
                    <select value={item.listingId} onChange={event => setCarouselLink(index, event.target.value)} disabled={saving} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500">
                      <option value="">No link</option>
                      {listings.map(listing => (
                        <option key={listing.id} value={listing.id}>
                          {formatListingName(listing.brand, listing.model)}{listing.status !== 'active' ? ` (${listing.status})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => removeCarouselSlot(index)} disabled={saving} className="self-end rounded-lg border border-red-900/70 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950 disabled:opacity-50">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: previewTheme.background, borderColor: previewTheme.border }}>
            <div className="aspect-[16/7] min-h-[180px]">
              <SafeShopImage src={imageUrl(header)} alt="" className="h-full w-full object-cover opacity-70" logoSize={96} />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10">
                  <SafeShopImage src={imageUrl(logo)} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: previewTheme.accent }}>Live preview</p>
                  <h3 className="text-lg font-bold" style={{ color: previewTheme.text }}>{name || shop.name}</h3>
                  {location && <p className="text-sm" style={{ color: previewTheme.mutedText }}>{location}</p>}
                </div>
              </div>
            </div>
          </section>

          {error && <p className="rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save shop dashboard'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ImagePicker({
  title,
  draft,
  url,
  onChange,
  onClear,
  saving,
  wide = false,
  compact = false,
}: {
  title: string;
  draft: ImageDraft;
  url: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  saving: boolean;
  wide?: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</span>
      <div className={`mt-1 overflow-hidden rounded-lg border border-gray-800 bg-gray-950 ${wide ? 'aspect-[16/7]' : compact ? 'aspect-[4/3]' : 'aspect-square'}`}>
        <SafeShopImage src={url} alt="" className="h-full w-full object-cover" logoSize={compact ? 48 : 64} />
      </div>
      <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={onChange} disabled={saving} className="mt-2 block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-teal-500 disabled:opacity-50" />
      {draft.file && <p className="mt-1 truncate text-xs text-gray-500">{draft.file.name}</p>}
      {onClear && (draft.storagePath || draft.file) && (
        <button type="button" onClick={onClear} disabled={saving} className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-200 disabled:opacity-50">
          Remove image
        </button>
      )}
    </div>
  );
}
