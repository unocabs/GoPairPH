'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 5;

interface WishlistPhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function WishlistPhotoPicker({ files, onChange }: WishlistPhotoPickerProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const onDrop = useCallback((accepted: File[]) => {
    const next = [...files, ...accepted].slice(0, MAX_PHOTOS);
    onChange(next);
  }, [files, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: MAX_PHOTOS - files.length,
    disabled: files.length >= MAX_PHOTOS,
  });

  function removeAt(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-300">
        Reference photos <span className="text-gray-500 font-normal text-xs">(optional, up to {MAX_PHOTOS})</span>
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {previews.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700">
            <Image src={url} alt={`Reference ${i + 1}`} fill className="object-cover" sizes="120px" unoptimized />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-500 transition-colors"
              aria-label="Remove photo"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <div
            {...getRootProps()}
            className={cn(
              'aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-center p-2',
              isDragActive ? 'border-teal-400 bg-teal-500/10' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800',
            )}
          >
            <input {...getInputProps()} />
            <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="mt-1 text-xs text-gray-500">Add</p>
          </div>
        )}
      </div>
    </div>
  );
}
