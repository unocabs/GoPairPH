'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { wishlistSchema, type WishlistFormData } from '@/lib/validations';
import { BRANDS, SIZE_CONVERSIONS } from '@/lib/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
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

export function WishlistForm({ profileId }: { profileId: string }) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

  async function onSubmit(data: WishlistFormData) {
    setSubmitting(true);
    setError(null);
    try {
      const { data: wishlist, error: insertErr } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: profileId,
          brand: data.brand,
          model: data.model,
          color: data.color || null,
          size_eu: data.size_eu ?? null,
          size_us: data.size_us ?? null,
          size_cm: data.size_cm ?? null,
          price_min_php: data.price_min_php ?? null,
          price_max_php: data.price_max_php ?? null,
          description: data.description || null,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      // Upload reference photos (if any)
      if (photos.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const imageRows: { wishlist_id: string; storage_path: string; order: number }[] = [];
        for (let i = 0; i < photos.length; i++) {
          const blob = await convertToWebP(photos[i]);
          const path = `${user.id}/wishlist/${wishlist.id}/${i}-${Date.now()}.webp`;
          const { error: upErr } = await supabase.storage
            .from('shoe-images')
            .upload(path, blob, { contentType: 'image/webp', upsert: true });
          if (upErr) throw upErr;
          imageRows.push({ wishlist_id: wishlist.id, storage_path: path, order: i });
        }
        const { error: imgErr } = await supabase.from('wishlist_images').insert(imageRows);
        if (imgErr) throw imgErr;
      }

      router.push('/wishlist');
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

      <Input label="Color" placeholder="e.g. Black/White" hint="Optional — what colorway are you after?" error={errors.color?.message} {...register('color')} />

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

      <Textarea label="Description (optional)" rows={3} placeholder="Anything else? e.g. condition preference, where you'd like to meet…" {...register('description')} />

      <WishlistPhotoPicker files={photos} onChange={setPhotos} />

      <Button type="submit" size="lg" loading={submitting} className="w-full">
        Post Wishlist Item
      </Button>
    </form>
  );
}
