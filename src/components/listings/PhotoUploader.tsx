'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { type ViewType } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export interface UploadedPhoto {
  storagePath: string;
  publicUrl: string;
  viewType: ViewType;
}

interface PhotoSlotProps {
  viewType: ViewType;
  label: string;
  description?: string;
  required?: boolean;
  photo: UploadedPhoto | null;
  shoeId: string;
  onUploaded: (photo: UploadedPhoto) => void;
  onRemove: () => void;
}

async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 900;
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
      }, 'image/webp', 0.72);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function PhotoSlot({ viewType, label, description, required, photo, shoeId, onUploaded, onRemove }: PhotoSlotProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const webpBlob = await convertToWebP(file);
      const fileName = `${shoeId}/${viewType}-${Date.now()}.webp`;
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const storagePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shoe-images')
        .upload(storagePath, webpBlob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shoe-images')
        .getPublicUrl(storagePath);

      onUploaded({ storagePath, publicUrl, viewType });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [shoeId, viewType, supabase, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: 1,
    disabled: uploading || !!photo,
  });

  if (photo) {
    return (
      <div className={cn(
        'rounded-xl border bg-slate-950/45 p-2',
        required ? 'border-teal-400/40' : 'border-white/[0.08]'
      )}>
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Image src={photo.publicUrl} alt={label} fill className="object-cover" sizes="200px" />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="absolute top-1.5 right-1.5 rounded-full bg-slate-950/80 p-1 text-white transition-colors hover:bg-red-600"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-teal-500/90 py-1 text-center text-[11px] font-semibold text-slate-950">
            Uploaded
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-gray-100">{label}</p>
          <span className="shrink-0 rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-200">Done</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-center p-3',
          required ? 'border-teal-400/35 bg-teal-500/[0.04]' : 'border-white/[0.08] bg-slate-950/35 opacity-80',
          isDragActive && 'border-teal-400 bg-teal-500/10 opacity-100',
          !isDragActive && required && 'hover:border-teal-400/60 hover:bg-teal-500/[0.07]',
          !isDragActive && !required && 'hover:border-white/[0.16] hover:bg-slate-900/50 hover:opacity-100',
          uploading && 'pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Spinner />
        ) : (
          <>
            <svg className="h-7 w-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className={cn('mt-2 text-xs font-semibold', required ? 'text-gray-200' : 'text-gray-400')}>{label}</p>
            {description && <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{description}</p>}
            {required && <span className="mt-1 text-[11px] font-medium text-teal-400">Required</span>}
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface PhotoUploaderProps {
  shoeId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}

const REQUIRED_VIEWS: { viewType: ViewType; label: string; description: string }[] = [
  { viewType: 'top', label: 'Top photo', description: 'Pair from above.' },
  { viewType: 'sole', label: 'Sole photo', description: 'Outsole wear.' },
];

const OPTIONAL_VIEWS: { viewType: ViewType; label: string; description: string }[] = [
  { viewType: 'front', label: 'Front', description: 'Toe box.' },
  { viewType: 'left', label: 'Left side', description: 'Side profile.' },
  { viewType: 'right', label: 'Right side', description: 'Other side.' },
  { viewType: 'back', label: 'Heel', description: 'Back view.' },
];

const PHOTO_EXAMPLES = [
  { label: 'Top', body: 'Full pair visible from above.', src: '/guides/listing-photo-example-top.png' },
  { label: 'Sole', body: 'Show outsole wear clearly.', src: '/guides/listing-photo-example-sole.png' },
  { label: 'Extra', body: 'Front, side, heel, or flaws.', src: '/guides/listing-photo-example-extra.png' },
];

export function PhotoUploader({ shoeId, photos, onChange }: PhotoUploaderProps) {
  const hasTopPhoto = photos.some(p => p.viewType === 'top');
  const hasSolePhoto = photos.some(p => p.viewType === 'sole');
  const hasExtraPhoto = photos.some(p => p.viewType !== 'top' && p.viewType !== 'sole');
  const missionItems = [
    { label: 'Top photo', done: hasTopPhoto },
    { label: 'Sole photo', done: hasSolePhoto },
    { label: 'Optional extra', done: hasExtraPhoto, optional: true },
  ];

  function handleUploaded(photo: UploadedPhoto) {
    onChange([...photos.filter(p => p.viewType !== photo.viewType), photo]);
  }

  function handleRemove(viewType: ViewType) {
    onChange(photos.filter(p => p.viewType !== viewType));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-100">Photo mission</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Top + sole are required so buyers can trust the pair and check wear quickly.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:w-[360px]">
            {missionItems.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold',
                  item.done
                    ? 'border-teal-400/35 bg-teal-400/10 text-teal-100'
                    : item.optional
                      ? 'border-white/[0.08] bg-slate-950/35 text-gray-500'
                      : 'border-white/[0.08] bg-slate-950/55 text-gray-400'
                )}
              >
                <span className="block text-[10px] text-gray-500">{index + 1}</span>
                <span className="block truncate">{item.done ? 'Done' : item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PHOTO_EXAMPLES.map((example) => (
          <div key={example.label} className="rounded-lg border border-white/[0.08] bg-slate-950/35 p-1.5 sm:p-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-teal-400/20 bg-slate-950">
              <Image
                src={example.src}
                alt={`${example.label} photo example`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 30vw, 180px"
              />
            </div>
            <p className="mt-1 text-[10px] leading-3 text-gray-500 sm:text-[11px] sm:leading-4">{example.body}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-200 mb-2">
          Required photos <span className="text-teal-400 font-normal text-xs">(Top + Sole)</span>
        </p>
        <p className="-mt-1 mb-3 text-xs leading-5 text-gray-500">
          These two shots prove the pair and wear level. Tap each box to upload from your phone.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {REQUIRED_VIEWS.map(({ viewType, label, description }) => (
            <PhotoSlot
              key={viewType}
              viewType={viewType}
              label={label}
              description={description}
              required
              shoeId={shoeId}
              photo={photos.find(p => p.viewType === viewType) ?? null}
              onUploaded={handleUploaded}
              onRemove={() => handleRemove(viewType)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-slate-950/25 p-3">
        <p className="text-sm font-medium text-gray-400 mb-2">
          Optional extras <span className="text-gray-600 font-normal text-xs">(helps buyers decide faster)</span>
        </p>
        <p className="-mt-1 mb-3 text-xs leading-5 text-gray-500">
          Add front, side, heel, or flaw photos if they help explain the pair.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPTIONAL_VIEWS.map(({ viewType, label, description }) => (
            <PhotoSlot
              key={viewType}
              viewType={viewType}
              label={label}
              description={description}
              shoeId={shoeId}
              photo={photos.find(p => p.viewType === viewType) ?? null}
              onUploaded={handleUploaded}
              onRemove={() => handleRemove(viewType)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
