'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { wishlistSchema, type WishlistFormData } from '@/lib/validations';
import { BRANDS, SIZE_CONVERSIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { WishlistPhotoPicker } from './WishlistPhotoPicker';

const BRAND_OPTIONS = BRANDS.map(b => ({ value: b, label: b }));

async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('Conversion failed'));
      }, 'image/webp', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function WishlistForm() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const router = useRouter();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<WishlistFormData>({
    resolver: zodResolver(wishlistSchema) as Resolver<WishlistFormData>,
  });

  function autoFillSize(field: 'eu' | 'us' | 'cm', val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const match = SIZE_CONVERSIONS.find(s => s[field] === num);
    if (!match) return;
    if (field !== 'eu') setValue('size_eu', match.eu);
    if (field !== 'us') setValue('size_us', match.us);
    if (field !== 'cm') setValue('size_cm', match.cm);
  }

  async function uploadPhoto(file: File, token: string): Promise<string> {
    const blob = await convertToWebP(file);
    const fd = new FormData();
    fd.append('file', blob, 'photo.webp');
    fd.append('turnstileToken', token);
    const res = await fetch('/api/wishlist/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Photo upload failed');
    }
    const { storage_path } = await res.json();
    return storage_path as string;
  }

  async function onSubmit(data: WishlistFormData) {
    if (!turnstileToken) {
      setError('Please complete the captcha to continue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const images: { storage_path: string }[] = [];
      for (const photo of photos) {
        const path = await uploadPhoto(photo, turnstileToken);
        images.push({ storage_path: path });
      }

      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, turnstileToken, images }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to save');
      }

      router.push('/find-my-pair');
      router.refresh();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to save';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      {error && <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-400">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Brand" required options={BRAND_OPTIONS} placeholder="Select brand" error={errors.brand?.message} {...register('brand')} />
        <Input label="Model" placeholder="e.g. Vaporfly 3" required error={errors.model?.message} {...register('model')} />
      </div>

      <Input label="Color" placeholder="e.g. Black/White" hint="Optional — what colorway are you looking for?" error={errors.color?.message} {...register('color')} />

      <div>
        <p className="text-sm font-medium text-gray-300 mb-1">
          Size <span className="text-gray-500 font-normal text-xs">(optional — fill any one and the others auto-fill)</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Input label="EU" type="number" step={0.5} error={errors.size_eu?.message}
            {...register('size_eu', { onChange: e => autoFillSize('eu', e.target.value) })} />
          <Input label="US" type="number" step={0.5} error={errors.size_us?.message}
            {...register('size_us', { onChange: e => autoFillSize('us', e.target.value) })} />
          <Input label="CM" type="number" step={0.5} error={errors.size_cm?.message}
            {...register('size_cm', { onChange: e => autoFillSize('cm', e.target.value) })} />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-1">
          Price Range (PHP) <span className="text-gray-500 font-normal text-xs">(optional — your budget)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Min" type="number" min={0} placeholder="e.g. 1000" error={errors.price_min_php?.message} {...register('price_min_php')} />
          <Input label="Max" type="number" min={0} placeholder="e.g. 3000" error={errors.price_max_php?.message} {...register('price_max_php')} />
        </div>
      </div>

      <Input label="Location" placeholder="e.g. Angeles Pampanga" hint="Where you'd like to receive the shoes (city or area)." error={errors.location?.message} {...register('location')} />

      <Textarea label="Description (optional)" rows={3} placeholder="Anything else? e.g. condition preference, links you've already checked, where you'd like to meet…" {...register('description')} />

      <WishlistPhotoPicker files={photos} onChange={setPhotos} />

      <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

      <Button type="submit" size="lg" loading={submitting} disabled={!turnstileToken || submitting} className="w-full">
        Post Pair Request
      </Button>
    </form>
  );
}
