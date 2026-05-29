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

function PhotoSlot({ viewType, label, required, photo, shoeId, onUploaded, onRemove }: PhotoSlotProps) {
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
        .upload(storagePath, webpBlob, { contentType: 'image/webp', upsert: true });

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
      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-teal-500">
        <Image src={photo.publicUrl} alt={label} fill className="object-cover" sizes="200px" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-500 transition-colors"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 text-center text-xs text-gray-200">{label}</div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-center p-2',
          isDragActive ? 'border-teal-400 bg-teal-500/10' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800',
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
            <p className="mt-1 text-xs text-gray-500">{label}</p>
            {required && <span className="text-xs text-teal-500 font-medium">Required</span>}
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

const REQUIRED_VIEWS: { viewType: ViewType; label: string }[] = [
  { viewType: 'top', label: 'Top View' },
  { viewType: 'sole', label: 'Sole View' },
];

const OPTIONAL_VIEWS: { viewType: ViewType; label: string }[] = [
  { viewType: 'front', label: 'Front View' },
  { viewType: 'left', label: 'Left Side' },
  { viewType: 'right', label: 'Right Side' },
  { viewType: 'back', label: 'Back View' },
];

const PHOTO_EXAMPLES = [
  { label: 'Top', body: 'Full pair visible from above.', src: '/guides/listing-photo-example-top.png' },
  { label: 'Sole', body: 'Show outsole wear clearly.', src: '/guides/listing-photo-example-sole.png' },
  { label: 'Extra', body: 'Front, side, heel, or flaws.', src: '/guides/listing-photo-example-extra.png' },
];

export function PhotoUploader({ shoeId, photos, onChange }: PhotoUploaderProps) {
  function handleUploaded(photo: UploadedPhoto) {
    onChange([...photos.filter(p => p.viewType !== photo.viewType), photo]);
  }

  function handleRemove(viewType: ViewType) {
    onChange(photos.filter(p => p.viewType !== viewType));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {PHOTO_EXAMPLES.map((example) => (
          <div key={example.label} className="rounded-lg border border-white/[0.08] bg-slate-950/45 p-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-teal-400/20 bg-slate-950">
              <Image
                src={example.src}
                alt={`${example.label} photo example`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 30vw, 180px"
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-gray-500">{example.body}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">
          Required Photos <span className="text-teal-500 font-normal text-xs">(Top + Sole)</span>
        </p>
        <p className="-mt-1 mb-3 text-xs leading-5 text-gray-500">
          These two shots prove the pair and wear level. Tap each box to upload from your phone.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {REQUIRED_VIEWS.map(({ viewType, label }) => (
            <PhotoSlot
              key={viewType}
              viewType={viewType}
              label={label}
              required
              shoeId={shoeId}
              photo={photos.find(p => p.viewType === viewType) ?? null}
              onUploaded={handleUploaded}
              onRemove={() => handleRemove(viewType)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">
          Optional Photos <span className="text-gray-500 font-normal text-xs">(more angles = faster sale)</span>
        </p>
        <p className="-mt-1 mb-3 text-xs leading-5 text-gray-500">
          Front, side, and heel photos help buyers feel confident before messaging.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPTIONAL_VIEWS.map(({ viewType, label }) => (
            <PhotoSlot
              key={viewType}
              viewType={viewType}
              label={label}
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
