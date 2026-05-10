'use client';

import { useState } from 'react';
import { LogoMark } from '@/components/brand/Logo';

interface SafeShopImageProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  logoSize?: number;
}

export function SafeShopImage({ src, alt, className = '', fallbackClassName = '', logoSize = 64 }: SafeShopImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/40 ${fallbackClassName}`}>
        <div className="opacity-25">
          <LogoMark size={logoSize} />
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
