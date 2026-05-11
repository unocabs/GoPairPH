'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { LogoMark } from '@/components/brand/Logo';
import { CONDITIONS, LISTING_TYPE_LABELS } from '@/lib/constants';
import { formatListingName, formatPrice, formatSize, getPublicUrl } from '@/lib/utils';
import type { Condition, ListingType, Shoe, Profile, Shop } from '@/types';

interface SharePostModalProps {
  shoe: Shoe;
  seller: Profile | null;
  onClose: () => void;
}

const CARD_W = 1200;
const CARD_H = 675;
const MOBILE_CARD_W = 1080;
const MOBILE_CARD_H = 1350;
type ShareFormat = 'mobile' | 'desktop';

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

export function SharePostModal({ shoe, seller, onClose }: SharePostModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [identitySrc, setIdentitySrc] = useState<string | null>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ShareFormat>('mobile');
  const [renderAttempt, setRenderAttempt] = useState(0);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const heroUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;
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

  // Prefetch hero + avatar as data URLs so html-to-image can read them
  // without canvas tainting. If a prefetch fails (e.g. Google avatar 429,
  // CORS issue), fall back to null so the visual placeholder renders
  // instead of a broken <img>.
  useEffect(() => {
    let cancelled = false;
    setImagesReady(false);
    setHeroSrc(null);
    setIdentitySrc(null);
    setPngDataUrl(null);
    setError(null);
    Promise.all([
      heroUrl ? urlToDataUrl(heroUrl).catch(() => null) : Promise.resolve(null),
      identityImageUrl ? urlToDataUrl(identityImageUrl).catch(() => null) : Promise.resolve(null),
    ]).then(([hero, identity]) => {
      if (cancelled) return;
      setHeroSrc(hero);
      setIdentitySrc(identity);
      setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [heroUrl, identityImageUrl]);

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
  }, [cardH, cardW, format, heroSrc, identitySrc, imagesReady, renderAttempt]);

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
  { shoe, seller, shop, heroSrc, identitySrc, isFeatured, isSponsored, format },
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
      <div
        ref={ref}
        style={{
          width: MOBILE_CARD_W,
          height: MOBILE_CARD_H,
          display: 'flex',
          flexDirection: 'column',
          padding: '34px 44px 32px',
          background: 'linear-gradient(180deg, #020617 0%, #07111f 58%, #042f2e 100%)',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: '#f3f4f6',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <IdentityBlock
            identityName={identityName}
            identityLocation={identityLocation}
            identityLabel={identityLabel}
            identitySrc={identitySrc}
            seller={seller}
            avatarSize={62}
            labelSize={13}
            nameSize={34}
            hostSize={18}
            verifiedSize={13}
          />
          <BadgeRow shoe={shoe} isFeatured={isFeatured} isSponsored={isSponsored} size="lg" />
          <TitleBlock shoe={shoe} shareSize={shareSize} titleSize={68} metaSize={28} maxLines={2} />
          <PriceBlock shoe={shoe} priceSize={66} tagSize={16} />
        </div>

        <ProductImageBlock shoe={shoe} heroSrc={heroSrc} size={hasDescription ? 650 : 730} />

        {hasDescription && (
          <div style={{ marginTop: 16 }}>
            <DescriptionBlock
              description={shoe.description}
              maxLines={3}
              labelSize={17}
              bodySize={24}
              lineHeight={1.35}
              padding={20}
              radius={16}
            />
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, color: '#94a3b8', fontSize: 24, fontWeight: 750 }}>
          <span>{shoe.listing_type === 'donate' ? 'Available for donation' : 'Available on Go Pair PH'}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={40} />
            <span><span style={{ color: '#f8fafc' }}>GoPair</span><span style={{ color: '#2dd4bf' }}>PH</span><span style={{ color: '#f8fafc' }}>.com</span></span>
          </span>
        </div>
      </div>
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
        }}
      >
        <IdentityBlock identityName={identityName} identityLocation={identityLocation} identityLabel={identityLabel} identitySrc={identitySrc} seller={seller} compact />
        <BadgeRow shoe={shoe} isFeatured={isFeatured} isSponsored={isSponsored} />
        <TitleBlock shoe={shoe} shareSize={shareSize} titleSize={52} metaSize={18} />
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

function ProductImageBlock({
  shoe,
  heroSrc,
  size,
}: {
  shoe: Shoe;
  heroSrc: string | null;
  size: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        margin: '26px auto 0',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 34,
        background: 'linear-gradient(135deg, #0b1220 0%, #042f2e 100%)',
        border: '1px solid rgba(45, 212, 191, 0.26)',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.35)',
      }}
    >
      {heroSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroSrc}
          alt={formatListingName(shoe.brand, shoe.model)}
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ opacity: 0.3 }}><LogoMark size={150} /></div>
          <span style={{ fontSize: 16, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>No photo</span>
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,6,23,0) 60%, rgba(2,6,23,0.22) 100%)' }} />
    </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: resolvedNameSize, fontWeight: 850, color: '#f8fafc', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          <span>{identityName}</span>
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
              }}
            >
              Verified
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: compact ? 3 : 7, color: '#94a3b8', fontSize: resolvedHostSize, fontWeight: 700 }}>
          <span>
            on <span style={{ color: '#f8fafc' }}>GoPair</span><span style={{ color: '#2dd4bf' }}>PH</span><span style={{ color: '#f8fafc' }}>.com</span>
          </span>
          {identityLocation && (
            <>
              <span style={{ color: '#334155' }}>•</span>
              <span>{identityLocation}</span>
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
  return (
    <div>
      <h1 style={{ fontSize: titleSize, lineHeight: 1.02, fontWeight: 850, letterSpacing: '-0.03em', color: '#f9fafb', margin: 0, display: maxLines ? '-webkit-box' : undefined, WebkitLineClamp: maxLines, WebkitBoxOrient: maxLines ? 'vertical' : undefined, overflow: maxLines ? 'hidden' : undefined }}>
        {formatListingName(shoe.brand, shoe.model)}
      </h1>
      <p style={{ marginTop: 12, fontSize: metaSize, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>{shoe.color}</span>
        {shareSize && (
          <>
            <span style={{ color: '#374151' }}>•</span>
            <span style={{ color: '#d1d5db', fontWeight: 700 }}>{shareSize}</span>
          </>
        )}
      </p>
    </div>
  );
}

function PriceBlock({ shoe, priceSize, tagSize = 11 }: { shoe: Shoe; priceSize: number; tagSize?: number }) {
  if (shoe.listing_type === 'donate') {
    return (
      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 12, padding: '10px 14px', fontSize: Math.max(16, tagSize + 4), fontWeight: 700, color: '#86efac', width: 'fit-content' }}>
        Free Donation
      </div>
    );
  }
  if (shoe.price_php == null) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: priceSize, fontWeight: 850, color: '#2dd4bf', letterSpacing: '-0.03em' }}>
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
}: {
  description: string | null;
  maxLines: number;
  labelSize?: number;
  bodySize?: number;
  lineHeight?: number;
  padding?: number;
  radius?: number;
}) {
  if (!description) return null;
  return (
    <div style={{ borderRadius: radius, border: '1px solid #1f2937', background: 'rgba(17, 24, 39, 0.6)', padding }}>
      <div style={{ fontSize: labelSize, fontWeight: 750, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Description
      </div>
      <div style={{ fontSize: bodySize, lineHeight, color: '#d1d5db', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {description}
      </div>
    </div>
  );
}
