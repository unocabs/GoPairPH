'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { LogoMark } from '@/components/brand/Logo';
import { ListingTypeBadge } from './ListingTypeBadge';
import { Badge } from '@/components/ui/Badge';
import { CONDITION_COLORS, CONDITIONS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize, getPublicUrl } from '@/lib/utils';
import type { Shoe, Profile } from '@/types';

interface SharePostModalProps {
  shoe: Shoe;
  seller: Profile | null;
  onClose: () => void;
}

const CARD_W = 1200;
const CARD_H = 675;

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export function SharePostModal({ shoe, seller, onClose }: SharePostModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const heroUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;
  const avatarUrl = seller?.avatar_url ?? null;

  const now = Date.now();
  const isFeatured = !!shoe.featured_until && new Date(shoe.featured_until).getTime() > now;
  const isSponsored = !!shoe.sponsored_until && new Date(shoe.sponsored_until).getTime() > now;

  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prefetch hero + avatar as data URLs so html-to-image can read them
  // without canvas tainting. If a prefetch fails (e.g. Google avatar 429,
  // CORS issue), fall back to null so the visual placeholder renders
  // instead of a broken <img>.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      heroUrl ? urlToDataUrl(heroUrl).catch(() => null) : Promise.resolve(null),
      avatarUrl ? urlToDataUrl(avatarUrl).catch(() => null) : Promise.resolve(null),
    ]).then(([hero, avatar]) => {
      if (cancelled) return;
      setHeroSrc(hero);
      setAvatarSrc(avatar);
      setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [heroUrl, avatarUrl]);

  // Render the card to PNG once images are ready. A short delay lets the
  // browser decode the just-mounted data-URL <img>s and apply computed
  // styles — without it, the first capture often misses the hero photo.
  useEffect(() => {
    if (!imagesReady) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || !cardRef.current) return;
      htmlToImage
        .toPng(cardRef.current, { pixelRatio: 1, width: CARD_W, height: CARD_H })
        .then(url => {
          if (cancelled) return;
          if (!url || !url.startsWith('data:image')) {
            setError('Could not generate share image');
            return;
          }
          setPngDataUrl(url);
        })
        .catch(err => {
          console.error('SharePost: render failed', err);
          if (cancelled) return;
          const e = err as Error;
          setError(e?.message || e?.name || 'Could not generate share image');
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [imagesReady]);

  function buildFilename(): string {
    return `${shoe.brand}-${shoe.model}-gopairph.png`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-');
  }

  function handleDownload() {
    if (!pngDataUrl) return;
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = buildFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Share Post</h2>
          <div className="flex items-center gap-1">
            {/* Download button — desktop only. Mobile users long-press the image. */}
            <button
              onClick={handleDownload}
              disabled={!pngDataUrl}
              aria-label="Download image"
              title="Download image"
              className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-teal-400 transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {/* Rendered PNG. Mobile: long-press to save. Desktop: use the download button. */}
          <div
            className="relative w-full overflow-hidden rounded-xl bg-gray-950"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          >
            {pngDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={pngDataUrl}
                alt={`${formatListingName(shoe.brand, shoe.model)} — Go Pair PH share post`}
                className="block w-full h-full object-cover select-none"
                draggable
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {error ? (
                  <p className="px-4 text-center text-xs text-red-300">{error}</p>
                ) : (
                  <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                  </svg>
                )}
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            <strong className="text-gray-300">Tip:</strong> Share it to your Facebook post or Marketplace listing. On mobile, <strong className="text-gray-300">long-press the image</strong> to save it. If the image did not load properly, please close the pop-up and open it again.
          </p>

          {/* Hidden source for html-to-image — rendered offscreen at native size. */}
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: -100000,
              left: 0,
              width: CARD_W,
              height: CARD_H,
              pointerEvents: 'none',
            }}
          >
            <ShareCard
              ref={cardRef}
              shoe={shoe}
              seller={seller}
              heroSrc={heroSrc}
              avatarSrc={avatarSrc}
              isFeatured={isFeatured}
              isSponsored={isSponsored}
            />
          </div>

          {error && pngDataUrl && (
            <p className="mt-3 rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ShareCardProps {
  shoe: Shoe;
  seller: Profile | null;
  heroSrc: string | null;
  avatarSrc: string | null;
  isFeatured: boolean;
  isSponsored: boolean;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { shoe, seller, heroSrc, avatarSrc, isFeatured, isSponsored },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        display: 'flex',
        background: '#020617',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#f3f4f6',
      }}
    >
      {/* Left panel */}
      <div
        style={{
          width: '46%',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          background: 'linear-gradient(135deg, #020617 0%, #0b1220 50%, #042f2e 100%)',
          borderRight: '1px solid rgba(20, 184, 166, 0.25)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark size={56} />
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: '#f3f4f6' }}>GoPair</span>
            <span style={{ color: '#2dd4bf' }}>PH</span>
            <span style={{ color: '#f3f4f6' }}>.com</span>
          </span>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ListingTypeBadge type={shoe.listing_type} />
          <Badge className={CONDITION_COLORS[shoe.condition]}>{CONDITIONS[shoe.condition]}</Badge>
          {isFeatured && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 9999,
                background: 'rgba(20, 184, 166, 0.15)',
                border: '1px solid rgba(20, 184, 166, 0.4)',
                color: '#5eead4',
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ★ Featured
            </span>
          )}
          {isSponsored && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 9999,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fcd34d',
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✦ Sponsored
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h1
            style={{
              fontSize: 52,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#f9fafb',
              margin: 0,
            }}
          >
            {formatListingName(shoe.brand, shoe.model)}
          </h1>
          <p style={{ marginTop: 10, fontSize: 18, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{shoe.color}</span>
            <span style={{ color: '#374151' }}>•</span>
            <span style={{ color: '#d1d5db', fontWeight: 600 }}>{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</span>
          </p>
        </div>

        {/* Price */}
        {shoe.listing_type === 'for_sale' && shoe.price_php != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: '#2dd4bf', letterSpacing: '-0.02em' }}>
              {formatPrice(shoe.price_php)}
            </span>
            {shoe.is_negotiable && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#fcd34d',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: 9999,
                  padding: '3px 10px',
                }}
              >
                Negotiable
              </span>
            )}
          </div>
        )}
        {shoe.listing_type === 'donate' && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 16,
              fontWeight: 700,
              color: '#86efac',
              width: 'fit-content',
            }}
          >
            Free Donation
          </div>
        )}

        {/* Description */}
        {shoe.description && (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid #1f2937',
              background: 'rgba(17, 24, 39, 0.6)',
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Description
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: '#d1d5db',
                whiteSpace: 'pre-wrap',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {shoe.description}
            </div>
          </div>
        )}

        {/* Seller — pinned to bottom */}
        {seller && (
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, border: '1px solid #1f2937', background: 'rgba(17, 24, 39, 0.6)', padding: 12 }}>
            {avatarSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarSrc}
                alt={seller.display_name}
                width={48}
                height={48}
                crossOrigin="anonymous"
                style={{ width: 48, height: 48, borderRadius: 9999, objectFit: 'cover', border: '1px solid #374151' }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  background: '#0d9488',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                {seller.display_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Seller</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
                <span>{seller.display_name}</span>
                {seller.is_verified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      borderRadius: 9999,
                      background: 'rgba(20, 184, 166, 0.1)',
                      border: '1px solid rgba(20, 184, 166, 0.4)',
                      color: '#2dd4bf',
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              {seller.location && (
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{seller.location}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel — hero photo */}
      <div style={{ width: '54%', position: 'relative', background: '#020617' }}>
        {heroSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroSrc}
            alt={formatListingName(shoe.brand, shoe.model)}
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #0b1220 0%, #042f2e 100%)',
            }}
          >
            <div style={{ opacity: 0.3 }}>
              <LogoMark size={120} />
            </div>
            <span style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
              No photo
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
