'use client';

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { LogoMark } from '@/components/brand/Logo';
import { CONDITIONS, LISTING_TYPE_LABELS } from '@/lib/constants';
import { trackMarketplaceAction } from '@/lib/analytics';
import { FB_GROUP_URL } from '@/lib/listingShare';
import { recordListingShareMetric, type ListingShareReward } from '@/lib/shareMetrics';
import { formatListingName, formatMileage, formatPrice, formatProfileLocation, formatSize, getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import type { Condition, ListingType, Shoe, Profile, Shop } from '@/types';

interface SharePostModalProps {
  shoe: Shoe;
  seller: Profile | null;
  open?: boolean;
  onClose: () => void;
  onDownloadRecorded?: (reward?: ListingShareReward) => void;
  facebookCompleted?: boolean;
  onFacebookGroupClick?: () => void;
  onDownloaded?: () => void;
}

const CARD_W = 1200;
const CARD_H = 675;
const MOBILE_CARD_W = 1080;
const MOBILE_CARD_H = 1350;
type ShareFormat = 'mobile' | 'desktop';
type PreparationPhase = 'idle' | 'loading_assets' | 'warming' | 'ready' | 'rendering' | 'success' | 'error';

const INITIAL_PHASES: Record<ShareFormat, PreparationPhase> = {
  mobile: 'idle',
  desktop: 'idle',
};

const INITIAL_WARMED_FORMATS: Record<ShareFormat, boolean> = {
  mobile: false,
  desktop: false,
};

function truncateText(text: string | null | undefined, maxChars: number): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function getDiscountPercent(pricePhp?: number | null, srpPhp?: number | null): number {
  if (pricePhp == null || srpPhp == null || srpPhp <= pricePhp) return 0;
  return Math.max(0, Math.round(((srpPhp - pricePhp) / srpPhp) * 100));
}

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function createAbortError(): Error {
  const error = new Error('Image loading cancelled');
  error.name = 'AbortError';
  return error;
}

function waitForImageElement(image: HTMLImageElement, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    function cleanup() {
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    }

    function finish(callback: () => void) {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    }

    function onAbort() {
      finish(() => reject(createAbortError()));
    }

    function onError() {
      finish(() => reject(new Error('An image could not be decoded.')));
    }

    async function verify() {
      try {
        if (typeof image.decode === 'function') await image.decode();
        if (signal?.aborted) throw createAbortError();
        if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
          throw new Error('An image finished loading without visible dimensions.');
        }
        finish(() => resolve());
      } catch (error) {
        finish(() => reject(error));
      }
    }

    function onLoad() {
      void verify();
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });

    if (image.complete) void verify();
  });
}

async function waitForRenderedImages(root: HTMLElement, requireHero: boolean, signal: AbortSignal): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async image => {
      if (!image.currentSrc && !image.src) return;
      await waitForImageElement(image, signal);
    }),
  );

  if (requireHero) {
    const hero = root.querySelector<HTMLImageElement>('img[data-share-hero="true"]');
    if (!hero || hero.naturalWidth <= 0 || hero.naturalHeight <= 0) {
      throw new Error('The shoe photo is not ready to render.');
    }
  }
}

async function blobToDataUrl(blob: Blob, signal: AbortSignal): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;

    function cleanup() {
      signal.removeEventListener('abort', onAbort);
    }
    function finish(callback: () => void) {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    }
    function onAbort() {
      if (reader.readyState === FileReader.LOADING) reader.abort();
      finish(() => reject(createAbortError()));
    }

    signal.addEventListener('abort', onAbort, { once: true });
    reader.onload = () => finish(() => resolve(reader.result as string));
    reader.onerror = () => finish(() => reject(reader.error ?? new Error('FileReader failed')));
    reader.onabort = () => finish(() => reject(createAbortError()));
    reader.readAsDataURL(blob);
  });
}

async function convertDataUrlToShareJpeg(dataUrl: string, signal: AbortSignal): Promise<string> {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return dataUrl;

  const image = new Image();
  image.src = dataUrl;
  await waitForImageElement(image, signal);
  if (signal.aborted) throw createAbortError();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the shoe image for Safari.');
  context.fillStyle = '#0f172a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      canvas.width = 0;
      canvas.height = 0;
      if (signal.aborted) {
        reject(createAbortError());
      } else if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Could not prepare the shoe image for sharing.'));
      }
    }, 'image/jpeg', 0.84);
  });
  const jpegDataUrl = await blobToDataUrl(jpegBlob, signal);
  if (!jpegDataUrl.startsWith('data:image/jpeg')) throw new Error('Share image conversion produced invalid data.');

  const decodedJpeg = new Image();
  decodedJpeg.src = jpegDataUrl;
  await waitForImageElement(decodedJpeg, signal);
  return jpegDataUrl;
}

async function urlToDataUrl(
  url: string,
  signal: AbortSignal,
  cache: RequestCache = 'default',
  normalizeForShare = false,
): Promise<string> {
  const res = await fetch(url, { mode: 'cors', signal, cache });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType && !contentType.toLowerCase().startsWith('image/')) {
    throw new Error('Fetched asset is not an image.');
  }
  const blob = await res.blob();
  if (!blob.size || (blob.type && !blob.type.toLowerCase().startsWith('image/'))) {
    throw new Error('Fetched image is empty or invalid.');
  }
  const dataUrl = await blobToDataUrl(blob, signal);
  if (!dataUrl.startsWith('data:image/')) throw new Error('Image conversion produced invalid data.');

  const decoded = new Image();
  decoded.src = dataUrl;
  await waitForImageElement(decoded, signal);
  return normalizeForShare ? await convertDataUrlToShareJpeg(dataUrl, signal) : dataUrl;
}

async function loadRequiredHeroDataUrl(transformedUrl: string, originalUrl: string, signal: AbortSignal): Promise<string> {
  const attempts: Array<{ url: string; cache: RequestCache }> = [
    { url: transformedUrl, cache: 'default' },
    { url: transformedUrl, cache: 'reload' },
    { url: originalUrl, cache: 'reload' },
  ];
  let lastError: unknown = new Error('Shoe photo could not be loaded.');

  for (const attempt of attempts) {
    if (signal.aborted) throw createAbortError();
    try {
      return await urlToDataUrl(attempt.url, signal, attempt.cache, true);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export function SharePostModal({ shoe, seller, open = true, onClose, onDownloadRecorded, facebookCompleted = false, onFacebookGroupClick, onDownloaded }: SharePostModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [identitySrc, setIdentitySrc] = useState<string | null>(null);
  const [gallerySrcs, setGallerySrcs] = useState<string[]>([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [pngDataUrls, setPngDataUrls] = useState<Partial<Record<ShareFormat, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<ShareFormat, string>>>({});
  const [phases, setPhases] = useState<Record<ShareFormat, PreparationPhase>>(INITIAL_PHASES);
  const [warmedFormats, setWarmedFormats] = useState<Record<ShareFormat, boolean>>(INITIAL_WARMED_FORMATS);
  const [format, setFormat] = useState<ShareFormat>('mobile');
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [showSaveHint, setShowSaveHint] = useState(true);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastImageIntentAtRef = useRef(0);
  const reloadFormatRef = useRef<ShareFormat | null>(null);
  const loadedShoeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    trackMarketplaceAction('share_post_open', {
      listing_id: shoe.id,
      listing_type: shoe.listing_type,
    });
  }, [open, shoe.id, shoe.listing_type]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
  const heroUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.shareHero) : null;
  const originalHeroUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path, 'shoe-images') : null;
  const thumbnailImageUrls = useMemo(
    () => (shoe.shoe_images ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter(image => image.id !== topImg?.id)
      .map(image => getPublicUrl(supabaseUrl, image.storage_path, 'shoe-images', IMAGE_TRANSFORM_PRESETS.shareThumb))
      .slice(0, 3),
    [shoe.shoe_images, supabaseUrl, topImg?.id],
  );
  const thumbnailImageUrlKey = thumbnailImageUrls.join('|');
  const shop = shoe.shops?.status === 'active' ? shoe.shops : null;
  const identityImageUrl = shop?.logo_storage_path
    ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos', IMAGE_TRANSFORM_PRESETS.shopLogo)
    : seller?.avatar_url ?? null;
  const cardW = format === 'mobile' ? MOBILE_CARD_W : CARD_W;
  const cardH = format === 'mobile' ? MOBILE_CARD_H : CARD_H;
  const pngDataUrl = pngDataUrls[format] ?? null;
  const error = errors[format] ?? null;

  const now = Date.now();
  const isFeatured = !!shoe.featured_until && new Date(shoe.featured_until).getTime() > now;
  const isSponsored = !!shoe.sponsored_until && new Date(shoe.sponsored_until).getTime() > now;

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  // Prefetch share-card images as data URLs so html-to-image can read them
  // without canvas tainting. If a prefetch fails (e.g. Google avatar 429,
  // CORS issue), fall back to null so the visual placeholder renders
  // instead of a broken <img>.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const reloadFormat = reloadFormatRef.current;
    const listingChanged = loadedShoeIdRef.current !== shoe.id;
    loadedShoeIdRef.current = shoe.id;
    setImagesReady(false);
    setHeroSrc(null);
    setIdentitySrc(null);
    setGallerySrcs([]);
    if (listingChanged) {
      setPngDataUrls({});
      setErrors({});
      setWarmedFormats(INITIAL_WARMED_FORMATS);
      setPhases({ mobile: 'loading_assets', desktop: 'loading_assets' });
    } else if (reloadFormat) {
      setPhases(previous => ({ ...previous, [reloadFormat]: 'loading_assets' }));
    }
    async function loadAssets() {
      try {
        const [hero, identity, gallery] = await Promise.all([
          heroUrl && originalHeroUrl
            ? loadRequiredHeroDataUrl(heroUrl, originalHeroUrl, signal)
            : Promise.resolve(null),
          identityImageUrl ? urlToDataUrl(identityImageUrl, signal).catch(() => null) : Promise.resolve(null),
          Promise.all(thumbnailImageUrls.map(url => urlToDataUrl(url, signal, 'default', true).catch(() => null))),
        ]);
        if (signal.aborted) return;
        setHeroSrc(hero);
        setIdentitySrc(identity);
        setGallerySrcs(gallery.filter((src): src is string => Boolean(src)));
        setImagesReady(true);
        setPhases(previous => reloadFormat
          ? { ...previous, [reloadFormat]: 'idle' }
          : INITIAL_PHASES);
        reloadFormatRef.current = null;
      } catch (assetError) {
        if (signal.aborted || (assetError as Error)?.name === 'AbortError') return;
        setHeroSrc(null);
        setImagesReady(false);
        if (reloadFormat) {
          setErrors(previous => ({ ...previous, [reloadFormat]: 'Shoe photo could not load. Tap Reload.' }));
          setPhases(previous => ({ ...previous, [reloadFormat]: 'error' }));
        } else {
          setErrors({
            mobile: 'Shoe photo could not load. Tap Reload.',
            desktop: 'Shoe photo could not load. Tap Reload.',
          });
          setPhases({ mobile: 'error', desktop: 'error' });
        }
        reloadFormatRef.current = null;
        trackMarketplaceAction('share_post_asset_load_failed', {
          listing_id: shoe.id,
          listing_type: shoe.listing_type,
          asset: 'hero',
          stage: 'asset_load',
        });
      }
    }

    void loadAssets();
    return () => {
      controller.abort();
    };
  }, [heroUrl, identityImageUrl, originalHeroUrl, renderAttempt, shoe.id, shoe.listing_type, thumbnailImageUrlKey, thumbnailImageUrls]);

  // Safari can rasterize the cloned SVG before nested data-URL images are
  // painted on the first html-to-image pass. Exercise that exact path once,
  // discard its canvas, then allow only the next pass to reach the preview.
  useEffect(() => {
    if (!imagesReady || warmedFormats[format] || !cardRef.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    const node = cardRef.current;
    let active = true;

    async function warmShareImageRenderer() {
      setPhases(previous => ({ ...previous, [format]: 'warming' }));
      setErrors(previous => ({ ...previous, [format]: undefined }));

      await waitForNextPaint();
      if (signal.aborted) return;
      await document.fonts.ready;
      if (signal.aborted) return;
      await waitForRenderedImages(node, Boolean(topImg), signal);
      if (signal.aborted) return;
      await waitForNextPaint();
      if (signal.aborted) return;

      const warmCanvas = await htmlToImage.toCanvas(node, {
        pixelRatio: 1,
        width: cardW,
        height: cardH,
        cacheBust: false,
      });
      warmCanvas.width = 0;
      warmCanvas.height = 0;
      if (!active || signal.aborted) return;
      await waitForNextPaint();
      if (!active || signal.aborted) return;
      setWarmedFormats(previous => ({ ...previous, [format]: true }));
      setPhases(previous => ({ ...previous, [format]: 'ready' }));
    }

    warmShareImageRenderer().catch(err => {
      console.error('SharePost: warm-up failed', err);
      if (!active || signal.aborted || (err as Error)?.name === 'AbortError') return;
      const e = err as Error;
      setErrors(previous => ({ ...previous, [format]: e?.message || e?.name || 'Could not prepare share image' }));
      setPhases(previous => ({ ...previous, [format]: 'error' }));
      trackMarketplaceAction('share_post_asset_load_failed', {
        listing_id: shoe.id,
        listing_type: shoe.listing_type,
        stage: 'warmup',
        format,
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [cardH, cardW, format, gallerySrcs, heroSrc, identitySrc, imagesReady, shoe.id, shoe.listing_type, topImg, warmedFormats]);

  // Generate the user-visible image only after the disposable warm-up pass.
  useEffect(() => {
    if (!open || !imagesReady || !warmedFormats[format] || pngDataUrls[format] || !cardRef.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    const node = cardRef.current;
    let active = true;

    async function renderShareImage() {
      setPhases(previous => ({ ...previous, [format]: 'rendering' }));
      setErrors(previous => ({ ...previous, [format]: undefined }));
      await waitForNextPaint();
      if (signal.aborted) return;
      await waitForRenderedImages(node, Boolean(topImg), signal);
      if (signal.aborted) return;

      const url = await htmlToImage.toPng(node, {
        pixelRatio: 1,
        width: cardW,
        height: cardH,
        cacheBust: false,
      });

      if (!active || signal.aborted) return;
      if (!url || !url.startsWith('data:image')) throw new Error('Could not generate share image');
      setPngDataUrls(previous => ({ ...previous, [format]: url }));
      setPhases(previous => ({ ...previous, [format]: 'success' }));
    }

    renderShareImage().catch(err => {
      console.error('SharePost: final render failed', err);
      if (!active || signal.aborted || (err as Error)?.name === 'AbortError') return;
      const e = err as Error;
      setErrors(previous => ({ ...previous, [format]: e?.message || e?.name || 'Could not generate share image' }));
      setPhases(previous => ({ ...previous, [format]: 'error' }));
      trackMarketplaceAction('share_post_asset_load_failed', {
        listing_id: shoe.id,
        listing_type: shoe.listing_type,
        stage: 'final_render',
        format,
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [cardH, cardW, format, imagesReady, open, pngDataUrls, shoe.id, shoe.listing_type, topImg, warmedFormats]);

  function buildFilename(): string {
    return `${shoe.brand}-${shoe.model}-gopairph.png`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-');
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function recordImageDownload(method: 'button' | 'long_press') {
    const now = Date.now();
    if (method === 'long_press' && now - lastImageIntentAtRef.current < 1500) return;
    lastImageIntentAtRef.current = now;
    setShowSaveHint(false);
    trackMarketplaceAction('share_post_download', {
      listing_id: shoe.id,
      listing_type: shoe.listing_type,
      format,
      method,
    });
    void recordListingShareMetric(shoe.id, 'image_download').then(reward => {
      onDownloadRecorded?.(reward);
    });
  }

  function startLongPressTracking() {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      recordImageDownload('long_press');
      longPressTimerRef.current = null;
    }, 650);
  }

  function handleDownload() {
    if (!pngDataUrl) return;
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = buildFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    recordImageDownload('button');
    onDownloaded?.();
  }

  function handleReload() {
    reloadFormatRef.current = format;
    setImagesReady(false);
    setHeroSrc(null);
    setIdentitySrc(null);
    setGallerySrcs([]);
    setPngDataUrls(previous => ({ ...previous, [format]: undefined }));
    setErrors(previous => ({ ...previous, [format]: undefined }));
    setWarmedFormats(previous => ({ ...previous, [format]: false }));
    setPhases(previous => ({ ...previous, [format]: 'loading_assets' }));
    setRenderAttempt(attempt => attempt + 1);
  }

  return (
    <>
      {/* Keep the native-size source mounted while the kit is expanded so the
          first Safari rasterization can finish before the dialog is requested. */}
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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-1.5 sm:p-4"
          onClick={onClose}
        >
          <div
            className="w-full max-w-3xl rounded-xl sm:rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh]"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-post-modal-title"
            aria-busy={phases[format] !== 'success' && !error}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3 border-b border-gray-800">
          <h2 id="share-post-modal-title" className="text-sm font-semibold text-gray-100">Post This on Facebook</h2>
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
              onClick={handleReload}
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
                alt={`${formatListingName(shoe.brand, shoe.model)} Facebook post image`}
                className="block w-full h-full object-cover select-none"
                draggable
                onContextMenu={() => recordImageDownload('long_press')}
                onTouchStart={startLongPressTracking}
                onTouchEnd={clearLongPressTimer}
                onTouchCancel={clearLongPressTimer}
                onTouchMove={clearLongPressTimer}
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
            {pngDataUrl && showSaveHint && (
              <div className="pointer-events-none absolute bottom-2 right-2 flex items-end gap-1.5 rounded-xl border border-white/15 bg-slate-950/85 px-2.5 py-2 text-white shadow-xl backdrop-blur-sm sm:hidden">
                <svg className="h-9 w-9 -rotate-12 text-sky-200 motion-safe:animate-pulse" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <path d="M17 39c-3.5-4.5-5.5-8-6-11-.4-2.2 2.4-3.3 3.8-1.6l2.2 2.8V10.5c0-2.6 4-2.6 4 0V24v-17c0-2.6 4-2.6 4 0v17V9.5c0-2.6 4-2.6 4 0V25 14c0-2.6 4-2.6 4 0v15l2.2-3.2c1.4-2 4.6-.5 3.8 1.8L35.5 39H17Z" fill="currentColor" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M17 35h19v7H17z" fill="#0ea5e9" stroke="#fff" strokeWidth="1.5" />
                </svg>
                <span className="pb-0.5 text-[11px] font-bold leading-4">Long Press<br />to Save</span>
              </div>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-4 text-gray-500 sm:mt-3 sm:text-xs">
            <strong className="text-gray-300">Tip: Use this image with your Facebook post or Marketplace listing.</strong> On mobile, long-press the image to save it. If the preview looks wrong, tap <strong className="text-gray-300">Reload</strong>.
          </p>

          <a
            href={FB_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onFacebookGroupClick}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-400/45 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/15 transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:mt-4"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/35 bg-white/10 text-xs" aria-hidden="true">
              {facebookCompleted ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m5 12 4 4L19 6" />
                </svg>
              ) : '3'}
            </span>
            Post to FB Group
          </a>

          {error && pngDataUrl && (
            <p className="mt-3 rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
      )}
    </>
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
    return formatSize(inStock[0].size_eu, inStock[0].size_us, inStock[0].size_cm, inStock[0].us_size_type);
  }
  if (inStock.length > 1) return `${inStock.length} sizes available`;
  return formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm, shoe.us_size_type);
}

function fitFontSize(text: string, base: number, compact: number, tight: number): number {
  if (text.length > 30) return tight;
  if (text.length > 20) return compact;
  return base;
}

function estimateWrappedLines(text: string | null | undefined, charsPerLine: number, maxLines: number): number {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  return Math.min(maxLines, Math.max(1, Math.ceil(normalized.length / charsPerLine)));
}

function getVerticalDescriptionLines({
  listingTitle,
  titleSize,
  shoe,
  shareSize,
  identityLocation,
  isFeatured,
  isSponsored,
}: {
  listingTitle: string;
  titleSize: number;
  shoe: Shoe;
  shareSize: string;
  identityLocation: string | null;
  isFeatured: boolean;
  isSponsored: boolean;
}): number {
  const detailsTop = 850;
  const footerReserve = 92;
  const availableHeight = MOBILE_CARD_H - detailsTop - footerReserve;
  const titleCharsPerLine = titleSize >= 60 ? 15 : titleSize >= 52 ? 18 : 22;
  const titleLines = estimateWrappedLines(listingTitle, titleCharsPerLine, 3);
  const metaItems = [shoe.color, shareSize, identityLocation].filter(Boolean);
  const metaChars = metaItems.join(' ').length;
  const metaRows = Math.min(3, Math.max(1, metaItems.length, Math.ceil(metaChars / 30)));
  const visibleBadges = 2 + (isFeatured ? 1 : 0) + (isSponsored ? 1 : 0);
  const badgeRows = visibleBadges > 3 ? 2 : 1;

  const usedHeight =
    titleLines * titleSize * 1.02
    + 20
    + metaRows * 31
    + 18
    + badgeRows * 32
    + 24;
  const descriptionChromeHeight = 22 * 2 + 13 + 8 + 2;
  const descriptionLineHeight = Math.ceil(21 * 1.34);
  const safetyBuffer = 8;
  const remainingHeight = availableHeight - usedHeight - descriptionChromeHeight - safetyBuffer;

  if (remainingHeight < descriptionLineHeight) return 0;
  return Math.min(3, Math.floor(remainingHeight / descriptionLineHeight));
}

function getHorizontalDescriptionLines({
  listingTitle,
  shoe,
  shareSize,
  identityLocation,
  isFeatured,
  isSponsored,
}: {
  listingTitle: string;
  shoe: Shoe;
  shareSize: string;
  identityLocation: string | null;
  isFeatured: boolean;
  isSponsored: boolean;
}): number {
  const panelHeight = CARD_H - 34 - 30;
  const footerReserve = 92;
  const availableHeight = panelHeight - footerReserve;
  const titleLines = estimateWrappedLines(listingTitle, 19, 3);
  const visibleBadges = 2 + (isFeatured ? 1 : 0) + (isSponsored ? 1 : 0);
  const badgeRows = visibleBadges > 3 ? 2 : 1;
  const pillRows = [shareSize, shoe.shop_id ? null : formatMileage(shoe.mileage_km), identityLocation].filter(Boolean).length > 2 ? 2 : 1;

  const usedHeight =
    badgeRows * 24
    + 18
    + titleLines * 48 * 1.02
    + 12
    + 28
    + 18
    + 48
    + 18
    + pillRows * 28
    + 18;
  const descriptionChromeHeight = 14 * 2 + 11 + 8;
  const descriptionLineHeight = 14 * 1.5;
  const remainingHeight = availableHeight - usedHeight - descriptionChromeHeight;

  if (remainingHeight < descriptionLineHeight) return 0;
  return Math.min(4, Math.floor(remainingHeight / descriptionLineHeight));
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { shoe, seller, shop, heroSrc, gallerySrcs, identitySrc, isFeatured, isSponsored, format },
  ref,
) {
  const isMobile = format === 'mobile';
  const identityName = shop?.name ?? seller?.display_name ?? 'Seller';
  const identityLocation = shop?.location ?? formatProfileLocation(seller);
  const identityLabel = shop ? 'Shop' : 'Seller';
  const shareSize = getShareSizeText(shoe);
  const hasDescription = !!shoe.description?.trim();
  const listingTitle = formatListingName(shoe.brand, shoe.model);

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

  const horizontalDescriptionLines = getHorizontalDescriptionLines({
    listingTitle,
    shoe,
    shareSize,
    identityLocation,
    isFeatured,
    isSponsored,
  });

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        display: 'flex',
        background: '#07111f',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#f3f4f6',
      }}
    >
      <div style={{ width: '58%', position: 'relative', background: '#020617', padding: 26, boxSizing: 'border-box' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 24px 70px rgba(0,0,0,0.42)', background: '#0f172a' }}>
        {heroSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroSrc}
            alt={formatListingName(shoe.brand, shoe.model)}
            data-share-hero="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
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
            <span style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
              No photo
            </span>
          </div>
        )}
        </div>
      </div>

      <div
        style={{
          width: '42%',
          padding: '34px 38px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          background: 'linear-gradient(155deg, #0f172a 0%, #07111f 58%, #0f2927 100%)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
          <BadgeRow shoe={shoe} isFeatured={isFeatured} isSponsored={isSponsored} />
          <TitleBlock shoe={shoe} shareSize={shareSize} identityLocation={identityLocation} titleSize={48} metaSize={17} maxLines={3} />
          <PriceBlock shoe={shoe} priceSize={42} />
          <ShareDetailPills shoe={shoe} shareSize={shareSize} identityLocation={identityLocation} />
          {horizontalDescriptionLines > 0 && (
            <DescriptionBlock description={shoe.description} maxLines={horizontalDescriptionLines} />
          )}
        </div>
        <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.18)' }}>
          <IdentityBlock identityName={identityName} identityLocation={identityLocation} identityLabel={identityLabel} identitySrc={identitySrc} seller={seller} compact />
          <QuietBrandFooter />
        </div>
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
  const description = hasDescription ? shoe.description : 'Send a message for the full details.';
  const listingTitle = formatListingName(shoe.brand, shoe.model);
  const titleSize = fitFontSize(listingTitle, 66, 56, 46);
  const colorSize = fitFontSize(shoe.color, 28, 24, 21);
  const sizeSize = fitFontSize(shareSize, 30, 25, 21);
  const soleDetailSrc = gallerySrcs.find(src => src && src !== heroSrc) ?? null;
  const descriptionLines = getVerticalDescriptionLines({
    listingTitle,
    titleSize,
    shoe,
    shareSize,
    identityLocation,
    isFeatured,
    isSponsored,
  });

  return (
    <div
      ref={ref}
      style={{
        width: MOBILE_CARD_W,
        height: MOBILE_CARD_H,
        position: 'relative',
        padding: '42px 42px 34px',
        background: 'linear-gradient(160deg, #020617 0%, #07111f 50%, #0f2927 100%)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#f8fafc',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(45,212,191,0.08) 0%, rgba(2,6,23,0) 32%, rgba(45,212,191,0.08) 100%)' }} />

      <div style={{ position: 'static' }}>
        <div
          style={{
            width: 790,
            height: 790,
            margin: '0 auto',
            borderRadius: 34,
            padding: 16,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.86), rgba(94,234,212,0.34), rgba(255,255,255,0.18))',
            boxShadow: '0 34px 90px rgba(0,0,0,0.42)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, #1f2937 0%, #0f172a 58%, #020617 100%)' }}>
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroSrc}
                alt={listingTitle}
                data-share-hero="true"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'linear-gradient(135deg, #0b1220 0%, #042f2e 100%)' }}>
                <div style={{ opacity: 0.26 }}><LogoMark size={110} /></div>
                <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>No photo</span>
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,6,23,0) 42%, rgba(2,6,23,0.72) 100%)' }} />
            <div style={{ position: 'absolute', left: 34, right: 34, bottom: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 24 }}>
              <PriceBlock shoe={shoe} priceSize={58} tagSize={16} alignEnd />
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: 42, top: 850, width: 420 }}>
          {soleDetailSrc && (
            <div style={{ width: 420, height: 220, marginBottom: 14, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.34)', background: '#0f172a', boxShadow: '0 18px 42px rgba(0,0,0,0.24)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={soleDetailSrc}
                alt={`${listingTitle} detail photo`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
              />
            </div>
          )}
          <SellerPanel
            identityName={identityName}
            identityLocation={identityLocation}
            identityLabel={identityLabel}
            identitySrc={identitySrc}
            seller={seller}
          />
        </div>

        <div style={{ position: 'absolute', left: 500, right: 42, top: 850, bottom: 92, overflow: 'hidden' }}>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: titleSize, lineHeight: 1.02, fontWeight: 900, letterSpacing: 0, overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: titleSize * 1.02 * 3 }}>
            {listingTitle}
          </h1>
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 16px', color: '#cbd5e1', fontWeight: 760 }}>
            {shoe.color && (
              <span style={{ fontSize: colorSize, lineHeight: 1.1, maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shoe.color}
              </span>
            )}
            {shareSize && (
              <span style={{ color: '#f8fafc', fontSize: sizeSize, lineHeight: 1.1, fontWeight: 850, whiteSpace: 'nowrap' }}>
                {shareSize}
              </span>
            )}
            {identityLocation && (
              <span style={{ color: '#a7f3d0', fontSize: 22, lineHeight: 1.1, fontWeight: 800, whiteSpace: 'nowrap' }}>
                {identityLocation}
              </span>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <BadgeRow shoe={shoe} isFeatured={isFeatured} isSponsored={isSponsored} size="lg" />
          </div>

          {descriptionLines > 0 && (
            <div style={{ marginTop: 24 }}>
              <DescriptionBlock
                description={description}
                maxLines={descriptionLines}
                labelSize={13}
                bodySize={21}
                lineHeight={1.34}
                padding={22}
                radius={18}
                singleParagraph
              />
            </div>
          )}
        </div>
      </div>

      <QuietBrandFooter absolute />
    </div>
  );
});

function SellerPanel({
  identityName,
  identityLocation,
  identityLabel,
  identitySrc,
  seller,
}: {
  identityName: string;
  identityLocation: string | null;
  identityLabel: string;
  identitySrc: string | null;
  seller: Profile | null;
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: '1px solid rgba(148,163,184,0.24)',
        background: 'rgba(15,23,42,0.66)',
        padding: '24px 22px',
        boxSizing: 'border-box',
        boxShadow: '0 18px 44px rgba(0,0,0,0.22)',
      }}
    >
      <IdentityBlock
        identityName={identityName}
        identityLocation={identityLocation}
        identityLabel={identityLabel}
        identitySrc={identitySrc}
        seller={seller}
        compact
        avatarSize={58}
        labelSize={11}
        nameSize={22}
        hostSize={14}
        verifiedSize={9}
      />
      <div style={{ marginTop: 18, color: '#94a3b8', fontSize: 15, lineHeight: 1.32, fontWeight: 650 }}>
        Send a message for photos, fit notes, and handoff details.
      </div>
    </div>
  );
}

function QuietBrandFooter({ absolute = false }: { absolute?: boolean }) {
  return (
    <div
      style={{
        ...(absolute ? { position: 'absolute', left: 42, right: 42, bottom: 24 } : { marginTop: 12 }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        borderTop: '1px solid rgba(148,163,184,0.18)',
        paddingTop: absolute ? 14 : 10,
        color: '#94a3b8',
        fontSize: absolute ? 15 : 12,
        lineHeight: 1,
        fontWeight: 750,
        zIndex: 2,
      }}
    >
      <span>Full listing details</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: absolute ? 8 : 6, color: '#cbd5e1' }}>
        <LogoMark size={absolute ? 22 : 16} />
        <span>gopairph.com</span>
      </span>
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
        {displayIdentityLocation && (
          <div style={{ marginTop: compact ? 3 : 7, maxWidth: compact ? 320 : 460, color: '#94a3b8', fontSize: resolvedHostSize, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {displayIdentityLocation}
          </div>
        )}
      </div>
    </div>
  );
}

const listingBadgeTones: Record<ListingType, { background: string; border: string; color: string }> = {
  for_sale: { background: 'rgba(88, 28, 135, 0.35)', border: 'rgba(126, 34, 206, 0.7)', color: '#c084fc' },
  donate: { background: 'rgba(20, 83, 45, 0.35)', border: 'rgba(22, 101, 52, 0.7)', color: '#86efac' },
};

const conditionBadgeTones: Record<Condition, { background: string; border: string; color: string }> = {
  new: { background: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.5)', color: '#a7f3d0' },
  like_new: { background: 'rgba(14, 165, 233, 0.16)', border: 'rgba(14, 165, 233, 0.5)', color: '#bae6fd' },
  good: { background: 'rgba(148, 163, 184, 0.16)', border: 'rgba(203, 213, 225, 0.45)', color: '#f1f5f9' },
  fair: { background: 'rgba(245, 158, 11, 0.16)', border: 'rgba(252, 211, 77, 0.45)', color: '#fef3c7' },
};

function BadgeRow({ shoe, isFeatured, isSponsored, size = 'sm' }: { shoe: Shoe; isFeatured: boolean; isSponsored: boolean; size?: 'sm' | 'lg' }) {
  const badgeFontSize = size === 'lg' ? 18 : 13;
  const badgePadding = size === 'lg' ? '7px 15px' : '4px 12px';
  const listingTone = listingBadgeTones[shoe.listing_type];
  const conditionTone = conditionBadgeTones[shoe.condition];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: size === 'lg' ? 10 : 8 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto', whiteSpace: 'nowrap', boxSizing: 'border-box', borderRadius: 9999, background: listingTone.background, border: `1px solid ${listingTone.border}`, color: listingTone.color, padding: badgePadding, fontSize: badgeFontSize, lineHeight: 1, fontWeight: 750 }}>
        {LISTING_TYPE_LABELS[shoe.listing_type]}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto', whiteSpace: 'nowrap', boxSizing: 'border-box', borderRadius: 9999, background: conditionTone.background, border: `1px solid ${conditionTone.border}`, color: conditionTone.color, padding: badgePadding, fontSize: badgeFontSize, lineHeight: 1, fontWeight: 750 }}>
        {CONDITIONS[shoe.condition]}
      </span>
      {isFeatured && (
        <span style={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto', whiteSpace: 'nowrap', boxSizing: 'border-box', gap: 6, borderRadius: 9999, background: 'rgba(20, 184, 166, 0.15)', border: '1px solid rgba(20, 184, 166, 0.4)', color: '#5eead4', padding: badgePadding, fontSize: badgeFontSize, lineHeight: 1, fontWeight: 700 }}>
          ★ Featured
        </span>
      )}
      {isSponsored && (
        <span style={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto', whiteSpace: 'nowrap', boxSizing: 'border-box', gap: 6, borderRadius: 9999, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fcd34d', padding: badgePadding, fontSize: badgeFontSize, lineHeight: 1, fontWeight: 700 }}>
          ✦ Top Pick
        </span>
      )}
    </div>
  );
}

function TitleBlock({
  shoe,
  shareSize,
  identityLocation,
  titleSize,
  metaSize,
  maxLines,
}: {
  shoe: Shoe;
  shareSize: string;
  identityLocation?: string | null;
  titleSize: number;
  metaSize: number;
  maxLines?: number;
}) {
  const displayColor = truncateText(shoe.color, 30);
  const displayShareSize = shareSize.trim();
  const displayShareSizeFont = fitFontSize(displayShareSize, metaSize, Math.max(11, metaSize - 3), Math.max(10, metaSize - 5));
  const displayLocation = truncateText(identityLocation, 28);

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
            <span style={{ color: '#d1d5db', fontSize: displayShareSizeFont, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{displayShareSize}</span>
          </>
        )}
        {displayLocation && (
          <>
            <span style={{ color: '#374151', flexShrink: 0 }}>•</span>
            <span style={{ minWidth: 0, maxWidth: 190, color: '#d1d5db', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLocation}</span>
          </>
        )}
      </p>
    </div>
  );
}

function ShareDetailPills({ shoe, shareSize, identityLocation }: { shoe: Shoe; shareSize: string; identityLocation: string | null }) {
  const items = [
    shareSize ? { label: 'Size', value: shareSize } : null,
    !shoe.shop_id ? { label: 'Mileage', value: formatMileage(shoe.mileage_km) } : null,
    identityLocation ? { label: 'Location', value: identityLocation } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <div
          key={item.label}
          style={{
            maxWidth: 230,
            borderRadius: 9999,
            border: '1px solid rgba(148, 163, 184, 0.22)',
            background: item.label === 'Location' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(15, 23, 42, 0.62)',
            padding: '7px 11px',
            color: '#cbd5e1',
            fontSize: item.label === 'Size' ? fitFontSize(item.value, 12, 10, 9) : 12,
            lineHeight: 1,
            fontWeight: 750,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ color: item.label === 'Location' ? '#5eead4' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>{item.label}: </span>
          {item.label === 'Size' ? item.value : truncateText(item.value, item.label === 'Location' ? 24 : 18)}
        </div>
      ))}
    </div>
  );
}

function PriceBlock({ shoe, priceSize, tagSize = 11, alignEnd = false }: { shoe: Shoe; priceSize: number; tagSize?: number; alignEnd?: boolean }) {
  if (shoe.listing_type === 'donate') {
    return (
      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 12, padding: '10px 14px', fontSize: Math.max(16, tagSize + 4), fontWeight: 700, color: '#86efac', width: 'fit-content' }}>
        Free Shoes
      </div>
    );
  }
  if (shoe.price_php == null) return null;
  const discountPercent = getDiscountPercent(shoe.price_php, shoe.srp_php);
  const showSrp = discountPercent > 0;
  return (
    <div style={{ display: 'flex', flexDirection: alignEnd ? 'column' : 'row', alignItems: alignEnd ? 'flex-end' : 'baseline', gap: alignEnd ? 8 : 12 }}>
      <span style={{ fontSize: priceSize, fontWeight: 850, color: '#2dd4bf', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {formatPrice(shoe.price_php)}
      </span>
      {showSrp && (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, fontSize: Math.max(10, tagSize), fontWeight: 760, lineHeight: 1, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#94a3b8', textDecoration: 'line-through', textDecorationThickness: 2, textDecorationColor: 'rgba(148,163,184,0.9)' }}>
            {formatPrice(shoe.srp_php)}
          </span>
          <span style={{ color: '#f87171' }}>
            {discountPercent}% OFF
          </span>
        </span>
      )}
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
