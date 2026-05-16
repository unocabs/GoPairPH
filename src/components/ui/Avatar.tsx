'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string | null | undefined;
  alt: string;
  /** Pixel size — width = height. */
  size: number;
  /** Single letter to show on fallback. Defaults to first letter of alt. */
  fallbackLetter?: string;
  /** Override the fallback background (default: teal-600). */
  fallbackClassName?: string;
  /** Extra classes applied to the rendered <img> or fallback div. */
  className?: string;
}

// Resilient avatar that handles two recurring failure modes:
// 1. Google avatar URLs (lh3.googleusercontent.com) refuse to load without
//    referrerPolicy="no-referrer".
// 2. When the URL is dead/expired/rate-limited, plain <Image> leaks the alt
//    text. We fall back to a coloured-letter circle on error.
export function Avatar({ src, alt, size, fallbackLetter, fallbackClassName, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const letter = (fallbackLetter ?? alt?.[0] ?? 'U').toUpperCase();
  const showImage = !!src && !failed;

  if (!showImage) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-teal-600 text-white font-semibold',
          fallbackClassName,
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
        aria-label={alt}
      >
        {letter}
      </div>
    );
  }

  return (
    <Image
      src={src!}
      alt={alt}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('rounded-full object-cover', className)}
      unoptimized
    />
  );
}
