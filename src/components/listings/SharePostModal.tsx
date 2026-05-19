'use client';

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { LogoMark } from '@/components/brand/Logo';
import { CONDITIONS, LISTING_TYPE_LABELS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize, getPublicUrl } from '@/lib/utils';
import type { Condition, ListingType, Shoe, Profile, Shop } from '@/types';

interface SharePostModalProps {
  shoe: Shoe;
  seller: Profile | null;
  onClose: () => void;
  onDownloaded?: () => void;
}

const CARD_W = 1200;
const CARD_H = 675;
const MOBILE_CARD_W = 1080;
const MOBILE_CARD_H = 1350;
type ShareFormat = 'mobile' | 'desktop';

function truncateText(text: string | null | undefined, maxChars: number): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function appendEllipsis(text: string, maxChars: number): string {
  const base = text.replace(/\s+/g, ' ').trim();
  if (base.endsWith('...')) return truncateText(base, maxChars);
  return truncateText(`${base}...`, maxChars);
}

function buildTruncatedDescriptionLines(description: string | null | undefined, maxLines: number, maxChars: number): string[] {
  const normalized = (description ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return ['Message the seller for full details.'];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  let usedWords = 0;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      usedWords += 1;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length === maxLines) break;
      current = word;
      usedWords += 1;
    } else {
      lines.push(truncateText(word, maxChars));
      usedWords += 1;
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const hasMore = usedWords < words.length || lines.some(line => line.length > maxChars);
  if (hasMore && lines.length > 0) {
    lines[lines.length - 1] = appendEllipsis(lines[lines.length - 1], maxChars);
  }

  return lines.slice(0, maxLines).map(line => truncateText(line, maxChars));
}

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForRenderedImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async image => {
      if (!image.currentSrc && !image.src) return;
      if (!image.complete) {
        await new Promise<void>(resolve => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }
      if (typeof image.decode === 'function') {
        await image.decode().catch(() => undefined);
      }
    }),
  );
}

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

export function SharePostModal({ shoe, seller, onClose, onDownloaded }: SharePostModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [identitySrc, setIdentitySrc] = useState<string | null>(null);
  const [gallerySrcs, setGallerySrcs] = useState<string[]>([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ShareFormat>('mobile');
  const [renderAttempt, setRenderAttempt] = useState(0);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const heroUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;
  const thumbnailImageUrls = useMemo(
    () => (shoe.shoe_images ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter(image => image.id !== topImg?.id)
      .map(image => getPublicUrl(supabaseUrl, image.storage_path))
      .slice(0, 3),
    [shoe.shoe_images, supabaseUrl, topImg?.id],
  );
  const thumbnailImageUrlKey = thumbnailImageUrls.join('|');
  const shop = shoe.shops?.status === 'active' ? shoe.shops : null;
  const identityImageUrl = shop?.logo_storage_path
    ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos')
    : seller?.avatar_url ?? null;
  const cardW = format === 'mobile' ? MOBILE_CARD_W : CARD_W;
  const cardH = format === 'mobile' ? MOBILE_CARD_H : CARD_H;

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

  // Prefetch share-card images as data URLs so html-to-image can read them
  // without canvas tainting. If a prefetch fails (e.g. Google avatar 429,
  // CORS issue), fall back to null so the visual placeholder renders
  // instead of a broken <img>.
  useEffect(() => {
    let cancelled = false;
    setImagesReady(false);
    setHeroSrc(null);
    setIdentitySrc(null);
    setGallerySrcs([]);
    setPngDataUrl(null);
    setError(null);
    Promise.all([
      heroUrl ? urlToDataUrl(heroUrl).catch(() => null) : Promise.resolve(null),
      identityImageUrl ? urlToDataUrl(identityImageUrl).catch(() => null) : Promise.resolve(null),
      Promise.all(thumbnailImageUrls.map(url => urlToDataUrl(url).catch(() => null))),
    ]).then(([hero, identity, gallery]) => {
      if (cancelled) return;
      setHeroSrc(hero);
      setIdentitySrc(identity);
      setGallerySrcs(gallery.filter((src): src is string => Boolean(src)));
      setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [heroUrl, identityImageUrl, thumbnailImageUrlKey, thumbnailImageUrls]);

  // Render the card to PNG once images are ready.
  useEffect(() => {
    if (!imagesReady || !cardRef.current) return;
    let cancelled = false;
    const node = cardRef.current;

    async function renderShareImage() {
      setPngDataUrl(null);
      setError(null);

      await waitForNextPaint();
      if (cancelled) return;
      await waitForRenderedImages(node);
      if (cancelled) return;
      await waitForNextPaint();
      if (cancelled) return;

      const url = await htmlToImage.toPng(node, {
        pixelRatio: 1,
        width: cardW,
        height: cardH,
        cacheBust: true,
      });

      if (cancelled) return;
      if (!url || !url.startsWith('data:image')) {
        setError('Could not generate share image');
        return;
      }
      setPngDataUrl(url);
    }

    renderShareImage().catch(err => {
      console.error('SharePost: render failed', err);
      if (cancelled) return;
      const e = err as Error;
      setError(e?.message || e?.name || 'Could not generate share image');
    });

    return () => {
      cancelled = true;
    };
  }, [cardH, cardW, format, gallerySrcs, heroSrc, identitySrc, imagesReady, renderAttempt]);

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
    onDownloaded?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-1.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl sm:rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3 border-b border-gray-800">
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
        <div className="overflow-y-auto p-2 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Format</span>
            <button
              type="button"
              onClick={() => setFormat('mobile')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${format === 'mobile' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              Vertical
            </button>
            <button
              type="button"
              onClick={() => setFormat('desktop')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${format === 'desktop' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              Horizontal
            </button>
            <button
              type="button"
              onClick={() => setRenderAttempt(attempt => attempt + 1)}
              className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 sm:px-3"
            >
              Reload
            </button>
          </div>

          {/* Rendered PNG. Mobile: long-press to save. Desktop: use the download button. */}
          <div
            className="relative w-full overflow-hidden rounded-lg bg-gray-950 sm:rounded-xl"
            style={{ aspectRatio: `${cardW} / ${cardH}` }}
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

          <p className="mt-2 text-[11px] leading-4 text-gray-500 sm:mt-3 sm:text-xs">
            <strong className="text-gray-300">Tip: Share it to your Facebook post or Marketplace listing.</strong> On mobile, long-press the image to save it. If the preview looks wrong, tap <strong className="text-gray-300">Reload</strong>.
          </p>

          {/* Hidden source for html-to-image — rendered offscreen at native size. */}
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: -100000,
              left: 0,
              width: cardW,
              height: cardH,
              pointerEvents: 'none',
            }}
          >
            <ShareCard
              ref={cardRef}
              shoe={shoe}
              seller={seller}
              shop={shop}
              heroSrc={heroSrc}
              gallerySrcs={gallerySrcs}
              identitySrc={identitySrc}
              isFeatured={isFeatured}
              isSponsored={isSponsored}
              format={format}
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
  shop: Shop | null;
  heroSrc: string | null;
  gallerySrcs: string[];
  identitySrc: string | null;
  isFeatured: boolean;
  isSponsored: boolean;
  format: ShareFormat;
}

function getShareSizeText(shoe: Shoe): string {
  const inStock = (shoe.shoe_variants ?? []).filter(v => v.quantity > 0);
  if (inStock.length === 1) {
    return formatSize(inStock[0].size_eu, inStock[0].size_us, inStock[0].size_cm);
  }
  if (inStock.length > 1) return `${inStock.length} sizes available`;
  return formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm);
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { shoe, seller, shop, heroSrc, gallerySrcs, identitySrc, isFeatured, isSponsored, format },
  ref,
) {
  const isMobile = format === 'mobile';
  const identityName = shop?.name ?? seller?.display_name ?? 'Go Pair PH seller';
  const identityLocation = shop?.location ?? seller?.location ?? null;
  const identityLabel = shop ? 'Shop' : 'Seller';
  const shareSize = getShareSizeText(shoe);
  const hasDescription = !!shoe.description?.trim();

  if (isMobile) {
    return (
      <VerticalShareCard
        ref={ref}
        shoe={shoe}
        seller={seller}
        identityName={identityName}
        identityLocation={identityLocation}
        identityLabel={identityLabel}
        identitySrc={identitySrc}
        heroSrc={heroSrc}
        gallerySrcs={gallerySrcs}
        isFeatured={isFeatured}
        isSponsored={isSponsored}
        shareSize={shareSize}
        hasDescription={hasDescription}
      />
    );
  }

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
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <IdentityBlock identityName={identityName} identityLocation={identityLocation} identityLabel={identityLabel} identitySrc={identitySrc} seller={seller} compact />
        <BadgeRow shoe={shoe} isFeatured={isFeatured} isSponsored={isSponsored} />
        <TitleBlock shoe={shoe} shareSize={shareSize} titleSize={52} metaSize={18} maxLines={3} />
        <PriceBlock shoe={shoe} priceSize={40} />
        <DescriptionBlock description={shoe.description} maxLines={5} />
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>
          <LogoMark size={24} />
          <span>Listed on <span style={{ color: '#f8fafc' }}>GoPair</span><span style={{ color: '#2dd4bf' }}>PH</span><span style={{ color: '#f8fafc' }}>.com</span></span>
        </div>
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

interface VerticalShareCardProps {
  shoe: Shoe;
  seller: Profile | null;
  identityName: string;
  identityLocation: string | null;
  identityLabel: string;
  identitySrc: string | null;
  heroSrc: string | null;
  gallerySrcs: string[];
  isFeatured: boolean;
  isSponsored: boolean;
  shareSize: string;
  hasDescription: boolean;
}

const VerticalShareCard = forwardRef<HTMLDivElement, VerticalShareCardProps>(function VerticalShareCard(
  {
    shoe,
    seller,
    identityName,
    identityLocation,
    identityLabel,
    identitySrc,
    heroSrc,
    gallerySrcs,
    isFeatured,
    isSponsored,
    shareSize,
    hasDescription,
  },
  ref,
) {
  const thumbnailSrcs = gallerySrcs.slice(0, 3);
  const description = hasDescription ? shoe.description : 'Message the seller for full details.';
  const hideBrand = shoe.brand.trim().toLowerCase() === 'other';
  const displayBrand = truncateText(shoe.brand, 18);
  const displayModel = truncateText(shoe.model, 46);
  const displayColor = truncateText(shoe.color, 28);
  const displaySize = truncateText(shareSize, 24);
  const modelTitleSize = hideBrand
    ? displayModel.length > 13 ? 66 : 78
    : displayModel.length > 13 ? 58 : 72;

  return (
    <div
      ref={ref}
      style={{
        width: MOBILE_CARD_W,
        height: MOBILE_CARD_H,
        position: 'relative',
        padding: '54px 42px 34px',
        background: 'radial-gradient(circle at 38% 46%, rgba(20,184,166,0.26) 0, rgba(20,184,166,0.08) 28%, rgba(2,6,23,0) 50%), linear-gradient(145deg, #031b22 0%, #020617 44%, #033f3d 100%)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#f8fafc',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(45,212,191,0.12) 0%, rgba(2,6,23,0) 32%, rgba(45,212,191,0.13) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '386px 1fr', columnGap: 36 }}>
        <div style={{ minWidth: 0 }}>
          <IdentityBlock
            identityName={identityName}
            identityLocation={identityLocation}
            identityLabel={identityLabel}
            identitySrc={identitySrc}
            seller={seller}
            avatarSize={68}
            labelSize={14}
            nameSize={25}
            hostSize={18}
            verifiedSize={11}
          />

          <div style={{ marginTop: 26 }}>
            <BadgeRow shoe={shoe} isFeatured={isFeatured} isSponsored={isSponsored} size="lg" />
          </div>

          <div style={{ marginTop: hideBrand ? 72 : 64, height: 410, overflow: 'hidden' }}>
            {!hideBrand && (
              <div style={{ color: '#f8fafc', fontSize: 80, lineHeight: 0.96, fontWeight: 900, letterSpacing: 0, maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayBrand}
              </div>
            )}
            <div style={{ color: '#22d3c5', fontSize: modelTitleSize, lineHeight: 1.02, fontWeight: 900, letterSpacing: 0, marginTop: hideBrand ? 0 : 8, maxWidth: 360, overflow: 'hidden', overflowWrap: 'break-word' }}>
              {displayModel}
            </div>
            <div style={{ width: 130, height: 4, background: '#22d3c5', marginTop: 28 }} />
            <div style={{ marginTop: 28, color: '#a9b6c5', fontSize: 27, lineHeight: 1.22, fontWeight: 500, width: 340, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayColor}
            </div>
            {displaySize && (
              <div style={{ marginTop: 8, color: '#f8fafc', fontSize: 29, lineHeight: 1.22, fontWeight: 850, width: 340, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displaySize}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <VerticalDescriptionBlock description={description} />
          </div>

          <VerticalPriceRibbon shoe={shoe} />

          <div style={{ marginTop: 14, width: 274, borderRadius: 14, border: '1px solid rgba(148,163,184,0.34)', background: 'rgba(2, 6, 23, 0.2)', padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxSizing: 'border-box' }}>
            <FeatureIcon kind="shield" size={36} color="#22d3c5" />
            <div>
              <div style={{ color: '#22d3c5', fontSize: 16, lineHeight: 1.08, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
                Buy with confidence
              </div>
              <div style={{ marginTop: 10, color: '#d1d5db', fontSize: 18, lineHeight: 1.26 }}>
                Quality shoes from our running community.
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 16 }}>
          <VerticalImageFrame
            src={heroSrc}
            alt={formatListingName(shoe.brand, shoe.model)}
            width={554}
            height={680}
            radius={22}
            overlay={
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 9999, background: 'rgba(15,23,42,0.72)', color: '#f8fafc', fontSize: 20, fontWeight: 850 }}>
                <LogoMark size={32} />
                <span><span>GoPair</span><span style={{ color: '#2dd4bf' }}>PH</span><span>.com</span></span>
              </div>
            }
          />

          {thumbnailSrcs.length > 0 && (
          <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
            {thumbnailSrcs.map((src, index) => (
              <VerticalImageFrame
                key={index}
                src={src}
                alt={`${formatListingName(shoe.brand, shoe.model)} photo ${index + 1}`}
                width={178}
                height={198}
                radius={16}
              />
            ))}
          </div>
          )}

          <ConditionInfoStrip condition={shoe.condition} />
        </div>
      </div>

      <VerticalFooter />
    </div>
  );
});

function VerticalImageFrame({
  src,
  alt,
  width,
  height,
  radius,
  overlay,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  radius: number;
  overlay?: React.ReactNode;
}) {
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        border: '2px solid rgba(255,255,255,0.82)',
        background: 'linear-gradient(135deg, #0b1220 0%, #042f2e 100%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.26)',
        boxSizing: 'border-box',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ opacity: 0.28 }}><LogoMark size={76} /></div>
          <span style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0, fontWeight: 700 }}>No photo</span>
        </div>
      )}
      {overlay && <div style={{ position: 'absolute', top: 18, left: 18 }}>{overlay}</div>}
    </div>
  );
}

function VerticalDescriptionBlock({ description }: { description: string | null }) {
  const resolvedLines = buildTruncatedDescriptionLines(description, 4, 30);

  return (
    <div style={{ width: 340, height: 216, borderRadius: 14, border: '1px solid rgba(248,250,252,0.62)', background: 'rgba(2, 6, 23, 0.18)', padding: '26px 28px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#22d3c5', fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
        <FeatureIcon kind="details" size={34} color="#22d3c5" />
        Description
      </div>
      <div style={{ marginTop: 26, color: '#e5e7eb', fontSize: 21, lineHeight: 1.42, overflow: 'hidden' }}>
        {resolvedLines.map(line => (
          <div key={line} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function VerticalPriceRibbon({ shoe }: { shoe: Shoe }) {
  const label = shoe.listing_type === 'donate'
    ? 'Free'
    : shoe.price_php != null
      ? formatPrice(shoe.price_php)
      : 'Message';
  const displayLabel = truncateText(label, 12);

  return (
    <div style={{ marginTop: 24, marginLeft: -42, width: 395, height: 110, borderRadius: '0 22px 22px 0', background: 'linear-gradient(90deg, rgba(13,148,136,0.96) 0%, rgba(15,118,110,0.92) 72%, rgba(13,148,136,0.62) 100%)', boxShadow: '0 18px 34px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', paddingLeft: 56, paddingRight: 24, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ maxWidth: 310, color: '#f8fafc', fontSize: displayLabel.length > 9 ? 52 : 74, lineHeight: 1, fontWeight: 950, letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {displayLabel}
      </div>
    </div>
  );
}

const conditionStripDetails: Record<Condition, { body: string; color: string }> = {
  new: { body: 'Brand-new pair, ready for first run.', color: '#16a34a' },
  like_new: { body: 'Excellent condition, well cared for.', color: '#0f766e' },
  good: { body: 'Solid pair with normal running wear.', color: '#a16207' },
  fair: { body: 'Budget pair with visible wear.', color: '#c2410c' },
};

function ConditionInfoStrip({ condition }: { condition: Condition }) {
  const details = conditionStripDetails[condition];
  const items = [
    {
      title: CONDITIONS[condition],
      body: details.body,
      icon: 'shield',
      color: details.color,
    },
    {
      title: 'Clear Details',
      body: 'Photos and notes ready.',
      icon: 'details',
      color: '#0f766e',
    },
    {
      title: 'Easy Handoff',
      body: 'Chat, ship, or meet up.',
      icon: 'truck',
      color: '#0f766e',
    },
    {
      title: 'Runners Helping Runners',
      body: 'Trusted sellers. Real community.',
      icon: 'community',
      color: '#0f766e',
    },
  ] as const;

  return (
    <div style={{ marginTop: 24, width: 554, height: 188, borderRadius: 20, background: '#f8fafc', color: '#111827', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', boxShadow: '0 18px 42px rgba(0,0,0,0.22)', border: '1px solid rgba(148,163,184,0.45)', overflow: 'hidden' }}>
      {items.map((item, index) => (
        <div key={item.title} style={{ position: 'relative', padding: '20px 8px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {index > 0 && <div style={{ position: 'absolute', left: 0, top: 26, bottom: 26, width: 1, background: '#cbd5e1' }} />}
          <FeatureIcon kind={item.icon} size={38} color={item.color} />
          <div style={{ marginTop: 10, color: item.color, fontSize: item.title.length > 16 ? 11 : 14, lineHeight: 1.04, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 0 }}>
            {item.title}
          </div>
          <div style={{ marginTop: 8, color: '#334155', fontSize: 13, lineHeight: 1.14, fontWeight: 500 }}>
            {item.body}
          </div>
        </div>
      ))}
    </div>
  );
}

function VerticalFooter() {
  return (
    <div style={{ position: 'absolute', left: 42, right: 42, bottom: 22, height: 118, borderRadius: 18, border: '1px solid rgba(148,163,184,0.32)', background: 'rgba(2, 6, 23, 0.64)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px 0 34px', boxSizing: 'border-box', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <LogoMark size={86} />
        <div>
          <div style={{ fontSize: 48, lineHeight: 1, fontWeight: 950, fontStyle: 'italic', letterSpacing: 0 }}>
            <span style={{ color: '#f8fafc' }}>GO </span>
            <span style={{ color: '#0f9488' }}>PAIR </span>
            <span style={{ color: '#f8fafc' }}>PH</span>
          </div>
          <div style={{ marginTop: 12, color: '#f8fafc', fontSize: 13, lineHeight: 1, fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0 }}>
            Runners Helping Runners
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#f8fafc', fontSize: 20, lineHeight: 1.28, fontStyle: 'italic', fontWeight: 600 }}>
        <div style={{ width: 4, height: 46, background: '#22d3c5', transform: 'skew(-12deg)' }} />
        <div>
          <div>Find your next pair.</div>
          <div>Run better <span style={{ color: '#22d3c5', fontWeight: 900 }}>together.</span></div>
        </div>
      </div>
    </div>
  );
}

function FeatureIcon({ kind, size, color }: { kind: 'shield' | 'details' | 'truck' | 'community'; size: number; color: string }) {
  if (kind === 'details') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="10" y="7" width="25" height="34" rx="3" stroke={color} strokeWidth="3" />
        <path d="M18 17H29M18 24H29M18 31H25" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M33 31h6v10h-6z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'truck') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M7 14h23v18H7zM30 20h8l4 6v6H30z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
        <path d="M4 22h12M2 28h10" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="36" r="4" stroke={color} strokeWidth="3" />
        <circle cx="36" cy="36" r="4" stroke={color} strokeWidth="3" />
      </svg>
    );
  }

  if (kind === 'community') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="16" cy="18" r="5" stroke={color} strokeWidth="3" />
        <circle cx="32" cy="18" r="5" stroke={color} strokeWidth="3" />
        <path d="M6 39c1-8 6-12 13-12M42 39c-1-8-6-12-13-12" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M18 34c2-4 10-4 12 0" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M20 9h8c5 0 9 3 9 8s-4 8-9 8h-1l-5 5v-5h-2c-5 0-9-3-9-8s4-8 9-8z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M24 5l15 6v12c0 10-6 17-15 21C15 40 9 33 9 23V11l15-6z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 24l5 5 10-12" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IdentityBlock({
  identityName,
  identityLocation,
  identityLabel,
  identitySrc,
  seller,
  compact = false,
  avatarSize,
  labelSize,
  nameSize,
  hostSize,
  verifiedSize,
}: {
  identityName: string;
  identityLocation: string | null;
  identityLabel: string;
  identitySrc: string | null;
  seller: Profile | null;
  compact?: boolean;
  avatarSize?: number;
  labelSize?: number;
  nameSize?: number;
  hostSize?: number;
  verifiedSize?: number;
}) {
  const resolvedAvatarSize = avatarSize ?? (compact ? 52 : 74);
  const resolvedLabelSize = labelSize ?? (compact ? 10 : 13);
  const resolvedNameSize = nameSize ?? (compact ? 24 : 36);
  const resolvedHostSize = hostSize ?? (compact ? 13 : 18);
  const resolvedVerifiedSize = verifiedSize ?? (compact ? 10 : 12);
  const displayIdentityName = truncateText(identityName, 24);
  const displayIdentityLocation = truncateText(identityLocation, 22);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 12 : 18 }}>
      {identitySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identitySrc}
          alt={identityName}
          width={resolvedAvatarSize}
          height={resolvedAvatarSize}
          crossOrigin="anonymous"
          style={{ width: resolvedAvatarSize, height: resolvedAvatarSize, borderRadius: compact ? 14 : 20, objectFit: 'cover', border: '1px solid #374151', background: '#020617' }}
        />
      ) : (
        <div
          style={{
            width: resolvedAvatarSize,
            height: resolvedAvatarSize,
            borderRadius: compact ? 14 : 20,
            background: '#0d9488',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: compact ? 22 : 30,
          }}
        >
          {identityName[0]?.toUpperCase() ?? 'S'}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: resolvedLabelSize, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>{identityLabel}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: compact ? 320 : 460, fontSize: resolvedNameSize, fontWeight: 850, color: '#f8fafc', lineHeight: 1.05, letterSpacing: '-0.02em', overflow: 'hidden' }}>
          <span style={{ minWidth: 0, maxWidth: identityLabel === 'Seller' && seller?.is_verified ? (compact ? 230 : 330) : '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayIdentityName}</span>
          {identityLabel === 'Seller' && seller?.is_verified && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 9999,
                background: 'rgba(20, 184, 166, 0.1)',
                border: '1px solid rgba(20, 184, 166, 0.4)',
                color: '#2dd4bf',
                padding: compact ? '2px 8px' : '4px 10px',
                fontSize: resolvedVerifiedSize,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              Verified
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: compact ? 3 : 7, maxWidth: compact ? 320 : 460, color: '#94a3b8', fontSize: resolvedHostSize, fontWeight: 700, overflow: 'hidden' }}>
          <span style={{ flexShrink: 0 }}>
            on <span style={{ color: '#f8fafc' }}>GoPair</span><span style={{ color: '#2dd4bf' }}>PH</span><span style={{ color: '#f8fafc' }}>.com</span>
          </span>
          {displayIdentityLocation && (
            <>
              <span style={{ color: '#334155', flexShrink: 0 }}>•</span>
              <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayIdentityLocation}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const listingBadgeTones: Record<ListingType, { background: string; border: string; color: string }> = {
  for_sale: { background: 'rgba(88, 28, 135, 0.35)', border: 'rgba(126, 34, 206, 0.7)', color: '#c084fc' },
  donate: { background: 'rgba(20, 83, 45, 0.35)', border: 'rgba(22, 101, 52, 0.7)', color: '#86efac' },
};

const conditionBadgeTones: Record<Condition, { background: string; border: string; color: string }> = {
  new: { background: 'rgba(20, 83, 45, 0.35)', border: 'rgba(22, 101, 52, 0.7)', color: '#86efac' },
  like_new: { background: 'rgba(30, 58, 138, 0.35)', border: 'rgba(30, 64, 175, 0.75)', color: '#93c5fd' },
  good: { background: 'rgba(113, 63, 18, 0.35)', border: 'rgba(161, 98, 7, 0.75)', color: '#fde047' },
  fair: { background: 'rgba(124, 45, 18, 0.35)', border: 'rgba(194, 65, 12, 0.75)', color: '#fdba74' },
};

function BadgeRow({ shoe, isFeatured, isSponsored, size = 'sm' }: { shoe: Shoe; isFeatured: boolean; isSponsored: boolean; size?: 'sm' | 'lg' }) {
  const badgeFontSize = size === 'lg' ? 18 : 13;
  const badgePadding = size === 'lg' ? '7px 15px' : '4px 12px';
  const listingTone = listingBadgeTones[shoe.listing_type];
  const conditionTone = conditionBadgeTones[shoe.condition];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: size === 'lg' ? 10 : 8 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999, background: listingTone.background, border: `1px solid ${listingTone.border}`, color: listingTone.color, padding: badgePadding, fontSize: badgeFontSize, lineHeight: 1, fontWeight: 750 }}>
        {LISTING_TYPE_LABELS[shoe.listing_type]}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999, background: conditionTone.background, border: `1px solid ${conditionTone.border}`, color: conditionTone.color, padding: badgePadding, fontSize: badgeFontSize, lineHeight: 1, fontWeight: 750 }}>
        {CONDITIONS[shoe.condition]}
      </span>
      {isFeatured && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 9999, background: 'rgba(20, 184, 166, 0.15)', border: '1px solid rgba(20, 184, 166, 0.4)', color: '#5eead4', padding: badgePadding, fontSize: badgeFontSize, fontWeight: 700 }}>
          ★ Featured
        </span>
      )}
      {isSponsored && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 9999, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fcd34d', padding: badgePadding, fontSize: badgeFontSize, fontWeight: 700 }}>
          ✦ Sponsored
        </span>
      )}
    </div>
  );
}

function TitleBlock({ shoe, shareSize, titleSize, metaSize, maxLines }: { shoe: Shoe; shareSize: string; titleSize: number; metaSize: number; maxLines?: number }) {
  const displayColor = truncateText(shoe.color, 30);
  const displayShareSize = truncateText(shareSize, 28);

  return (
    <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <h1 style={{ fontSize: titleSize, lineHeight: 1.02, fontWeight: 850, letterSpacing: '-0.03em', color: '#f9fafb', margin: 0, display: maxLines ? '-webkit-box' : undefined, WebkitLineClamp: maxLines, WebkitBoxOrient: maxLines ? 'vertical' : undefined, overflow: maxLines ? 'hidden' : undefined, textOverflow: maxLines ? 'ellipsis' : undefined, maxHeight: maxLines ? titleSize * 1.02 * maxLines : undefined, overflowWrap: 'break-word' }}>
        {formatListingName(shoe.brand, shoe.model)}
      </h1>
      <p style={{ marginTop: 12, fontSize: metaSize, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', maxWidth: '100%', overflow: 'hidden' }}>
        <span style={{ minWidth: 0, maxWidth: 210, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayColor}</span>
        {displayShareSize && (
          <>
            <span style={{ color: '#374151', flexShrink: 0 }}>•</span>
            <span style={{ minWidth: 0, maxWidth: 190, color: '#d1d5db', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayShareSize}</span>
          </>
        )}
      </p>
    </div>
  );
}

function PriceBlock({ shoe, priceSize, tagSize = 11, alignEnd = false }: { shoe: Shoe; priceSize: number; tagSize?: number; alignEnd?: boolean }) {
  if (shoe.listing_type === 'donate') {
    return (
      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 12, padding: '10px 14px', fontSize: Math.max(16, tagSize + 4), fontWeight: 700, color: '#86efac', width: 'fit-content' }}>
        Free Donation
      </div>
    );
  }
  if (shoe.price_php == null) return null;
  return (
    <div style={{ display: 'flex', flexDirection: alignEnd ? 'column' : 'row', alignItems: alignEnd ? 'flex-end' : 'baseline', gap: alignEnd ? 8 : 12 }}>
      <span style={{ fontSize: priceSize, fontWeight: 850, color: '#2dd4bf', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {formatPrice(shoe.price_php)}
      </span>
      {shoe.is_negotiable && (
        <span style={{ fontSize: tagSize, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 9999, padding: '3px 10px' }}>
          Negotiable
        </span>
      )}
    </div>
  );
}

function DescriptionBlock({
  description,
  maxLines,
  labelSize = 11,
  bodySize = 14,
  lineHeight = 1.5,
  padding = 14,
  radius = 12,
  singleParagraph = false,
}: {
  description: string | null;
  maxLines: number;
  labelSize?: number;
  bodySize?: number;
  lineHeight?: number;
  padding?: number;
  radius?: number;
  /** When true, line breaks in the source collapse to spaces so the text flows as one paragraph. */
  singleParagraph?: boolean;
}) {
  if (!description) return null;
  const body = singleParagraph ? description.replace(/\s+/g, ' ').trim() : description;
  return (
    <div style={{ borderRadius: radius, border: '1px solid #1f2937', background: 'rgba(17, 24, 39, 0.6)', padding }}>
      <div style={{ fontSize: labelSize, fontWeight: 750, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Description
      </div>
      <div style={{ fontSize: bodySize, lineHeight, color: '#d1d5db', whiteSpace: singleParagraph ? 'normal' : 'pre-wrap', display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', overflowWrap: 'break-word' }}>
        {body}
      </div>
    </div>
  );
}
