'use client';

import Image from 'next/image';
import { useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';
import type { ViewType } from '@/types';
import type { UploadedPhoto } from '@/components/listings/PhotoUploader';

const SLOTS: ReadonlyArray<{ viewType: ViewType; label: string; required: boolean }> = [
  { viewType: 'top', label: 'Top photo', required: true },
  { viewType: 'sole', label: 'Sole photo', required: true },
  { viewType: 'front', label: 'Other proof 1', required: false },
  { viewType: 'left', label: 'Other proof 2', required: false },
];

async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDimension = 800;
      let width = image.width;
      let height = image.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('Could not prepare this photo.'));
      }, 'image/webp', 0.68);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This photo format could not be read.'));
    };
    image.src = url;
  });
}

interface ListingV2PhotoUploaderProps {
  shoeId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}

export function ListingV2PhotoUploader({ shoeId, photos, onChange }: ListingV2PhotoUploaderProps) {
  const [showOptional, setShowOptional] = useState(photos.some(photo => photo.viewType === 'front' || photo.viewType === 'left'));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-5 text-gray-500">Top and sole are required. You can upload up to four photos total.</p>
        <span className="shrink-0 rounded-full border border-white/[0.08] bg-slate-950/60 px-2.5 py-1 text-xs font-bold text-gray-300">{photos.length}/4</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SLOTS.filter(slot => slot.required).map(slot => (
          <PhotoSlot key={slot.viewType} {...slot} shoeId={shoeId} photos={photos} onChange={onChange} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowOptional(open => !open)}
        aria-expanded={showOptional}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-left text-sm font-semibold text-gray-200 transition-colors hover:border-teal-400/25"
      >
        <span>
          Other angles, box, or receipt
          <span className="ml-1 text-xs font-normal text-gray-500">optional</span>
        </span>
        <span className={`text-gray-500 transition-transform ${showOptional ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
      </button>

      {showOptional && (
        <div className="grid grid-cols-2 gap-3">
          {SLOTS.filter(slot => !slot.required).map(slot => (
            <PhotoSlot key={slot.viewType} {...slot} shoeId={shoeId} photos={photos} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoSlot({
  viewType,
  label,
  required,
  shoeId,
  photos,
  onChange,
}: {
  viewType: ViewType;
  label: string;
  required: boolean;
  shoeId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  const photo = photos.find(item => item.viewType === viewType) ?? null;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function upload(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const webp = await convertToWebP(file);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in before uploading photos.');
      const storagePath = `${authData.user.id}/${shoeId}/${viewType}-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('shoe-images')
        .upload(storagePath, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('shoe-images').getPublicUrl(storagePath);
      onChange([
        ...photos.filter(item => item.viewType !== viewType),
        { storagePath, publicUrl: publicData.publicUrl, viewType },
      ].slice(0, 4));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    void upload(event.target.files?.[0]);
    event.target.value = '';
  }

  const removePhoto = async () => {
    if (!photo) return;
    onChange(photos.filter(item => item.viewType !== viewType));
    const { error: removeError } = await supabase.storage.from('shoe-images').remove([photo.storagePath]);
    if (removeError) setError('Photo removed here, but storage cleanup will retry later.');
  };

  if (photo) {
    return (
      <div className={`rounded-xl border p-2 ${required ? 'border-teal-400/35 bg-teal-500/[0.04]' : 'border-white/[0.08] bg-slate-950/45'}`}>
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Image src={photo.publicUrl} alt={label} fill className="object-cover" sizes="(max-width: 640px) 46vw, 260px" />
          <button
            type="button"
            onClick={() => void removePhoto()}
            aria-label={`Remove ${label}`}
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/85 text-white shadow-lg"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-xs font-bold text-gray-100">{label} <span className="font-normal text-teal-300">✓</span></p>
      </div>
    );
  }

  const inputBase = `listing-v2-${viewType}`;
  return (
    <div className={`rounded-xl border p-2.5 ${required ? 'border-teal-400/30 bg-teal-500/[0.04]' : 'border-white/[0.08] bg-slate-950/35'}`}>
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-slate-950/45">
        {uploading ? <Spinner /> : (
          <div className="text-center">
            <svg className="mx-auto h-7 w-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 5v14m7-7H5" />
            </svg>
            <p className="mt-1 text-xs font-bold text-gray-200">{label}</p>
            <p className="text-[10px] text-gray-600">{required ? 'Required' : 'Optional proof'}</p>
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <label htmlFor={`${inputBase}-camera`} className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg bg-teal-500 px-2 text-center text-[11px] font-bold text-white sm:hidden">
          Take Photo
        </label>
        <input id={`${inputBase}-camera`} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" />
        <label htmlFor={`${inputBase}-picker`} className="col-span-1 inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 text-center text-[11px] font-bold text-sky-100 sm:col-span-2">
          Choose Photo
        </label>
        <input id={`${inputBase}-picker`} type="file" accept="image/*" onChange={handleFile} className="sr-only" />
      </div>
      {error && <p className="mt-1.5 text-[11px] leading-4 text-red-300" role="alert">{error}</p>}
    </div>
  );
}
