'use client';

import { type ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ShopLogoUploaderProps {
  shopId: string;
  currentLogoPath: string | null;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 900;
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
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image format is not supported by your browser.'));
    };

    img.src = url;
  });
}

export function ShopLogoUploader({ shopId, currentLogoPath }: ShopLogoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') || (file.type && !ACCEPTED_TYPES.includes(file.type))) {
      setError('Please choose a JPG, PNG, WebP, or HEIC image.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Please sign in before uploading a logo.');

      const webpBlob = await convertToWebP(file);
      const storagePath = `${userId}/${shopId}/logo-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(storagePath, webpBlob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('shops')
        .update({ logo_storage_path: storagePath })
        .eq('id', shopId);
      if (updateError) throw updateError;

      if (currentLogoPath?.startsWith(`${userId}/`) && currentLogoPath !== storagePath) {
        await supabase.storage.from('shop-logos').remove([currentLogoPath]);
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logo upload failed.';
      setError(
        message.toLowerCase().includes('bucket not found')
          ? 'Logo storage is not set up yet. Apply the shop-logo Supabase migration first.'
          : message
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2 w-20 sm:w-28">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex w-full items-center justify-center rounded-lg border border-teal-500/50 bg-teal-500/10 px-2 py-1.5 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-500/20 disabled:pointer-events-none disabled:opacity-60"
      >
        {uploading ? 'Uploading...' : 'Change logo'}
      </button>
      {error && <p className="mt-1 text-xs leading-snug text-red-300">{error}</p>}
    </div>
  );
}
