'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, TransitionEvent } from 'react';

type HomeCarouselSlide = {
  id: string;
  label: string;
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  ctaHref: string;
};

const slides: ReadonlyArray<HomeCarouselSlide> = [
  {
    id: 'central-luzon-ncr',
    label: 'Focused marketplace',
    title: 'Buy and sell running shoes nearby',
    body: 'A running-shoe marketplace for Pampanga, Central Luzon, and NCR runners.',
    imageSrc: '/home-carousel/central-luzon-ncr.jpg',
    imageAlt: 'Go Pair PH running shoe marketplace for sellers and buyers in Pampanga, Central Luzon, and NCR',
    ctaHref: '/browse',
  },
  {
    id: 'post-once-share-link',
    label: 'For sellers',
    title: 'Post once. Share the link.',
    body: 'Create one clean pair page, then share it to Facebook groups, Messenger, Marketplace, or friends.',
    imageSrc: '/home-carousel/post-once-share-link.jpg',
    imageAlt: 'Go Pair PH seller guide showing one running shoe listing link shared to Facebook groups and Messenger',
    ctaHref: '/listings/new',
  },
  {
    id: 'shoe-details-one-place',
    label: 'Better buyer trust',
    title: 'Shoe details should be easy to check',
    body: 'Show photos, size, condition, mileage, price, and location in one place.',
    imageSrc: '/home-carousel/shoe-details-one-place.jpg',
    imageAlt: 'Clean Go Pair PH running shoe listing page with photos, size, condition, mileage, price, and location',
    ctaHref: '/help/how-to-sell',
  },
  {
    id: 'post-share-win',
    label: 'Seller campaign',
    title: 'Post. Share. Win ₱500 GCash.',
    body: 'List your running shoes on Go Pair PH, share your listing link on Facebook, then submit your entry.',
    imageSrc: '/home-carousel/post-share-win.jpg',
    imageAlt: 'Go Pair PH Post Share Win campaign for running shoe sellers listing and sharing pairs online',
    ctaHref: '/listings/new',
  },
];

export function HomeCarousel() {
  const baseIndex = slides.length;
  const trackSlides = [...slides, ...slides, ...slides];
  const [position, setPosition] = useState(baseIndex);
  const [slideOffset, setSlideOffset] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const activeIndex = normalizeSlideIndex(position);

  useEffect(() => {
    const updateOffset = () => {
      const viewportWidth = viewportRef.current?.clientWidth ?? 0;
      const gap = 16;
      const showsTwoSlides = window.matchMedia('(min-width: 640px)').matches;
      setSlideOffset(showsTwoSlides ? (viewportWidth + gap) / 2 : viewportWidth + gap);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    const observer = new ResizeObserver(updateOffset);
    if (viewportRef.current) observer.observe(viewportRef.current);

    return () => {
      window.removeEventListener('resize', updateOffset);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const goToNext = useCallback(() => {
    if (prefersReducedMotion) {
      setPosition((current) => baseIndex + normalizeSlideIndex(current + 1));
      return;
    }

    setTransitionEnabled(true);
    setPosition((current) => current + 1);
  }, [baseIndex, prefersReducedMotion]);

  const goToPrevious = useCallback(() => {
    if (prefersReducedMotion) {
      setPosition((current) => baseIndex + normalizeSlideIndex(current - 1));
      return;
    }

    setTransitionEnabled(true);
    setPosition((current) => current - 1);
  }, [baseIndex, prefersReducedMotion]);

  const handleTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;

    let resetPosition: number | null = null;
    if (position >= baseIndex * 2) resetPosition = baseIndex;
    if (position < baseIndex) resetPosition = position + baseIndex;
    if (resetPosition === null) return;

    setTransitionEnabled(false);
    setPosition(resetPosition);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTransitionEnabled(true));
    });
  }, [baseIndex, position]);

  const trackStyle = {
    transform: `translate3d(-${position * slideOffset}px, 0, 0)`,
  } satisfies CSSProperties;

  return (
    <section
      className="border-b border-white/[0.08] bg-slate-950"
      aria-label="Go Pair PH highlights"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX === null) return;

        const endX = event.changedTouches[0]?.clientX ?? startX;
        const delta = endX - startX;
        if (Math.abs(delta) < 44) return;
        if (delta > 0) goToPrevious();
        else goToNext();
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative">
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-slate-950/72 text-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:bg-slate-900 hover:text-white"
            aria-label="Previous homepage highlight"
          >
            <ArrowLeftIcon />
          </button>

          <div ref={viewportRef} className="overflow-hidden">
            <div
              className={`flex gap-4 will-change-transform ${
                transitionEnabled && !prefersReducedMotion
                  ? 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : ''
              }`}
              style={trackStyle}
              onTransitionEnd={handleTransitionEnd}
            >
            {trackSlides.map((slide, index) => (
              <article
                key={`${slide.id}-${index}`}
                className="min-w-0 shrink-0 basis-full overflow-hidden rounded-xl border border-white/[0.08] bg-slate-950 shadow-[0_16px_50px_rgba(0,0,0,0.28)] sm:basis-[calc((100%_-_1rem)/2)]"
              >
                <Link
                  href={slide.ctaHref}
                  className="block"
                  aria-label={`${slide.title}. ${slide.body}`}
                >
                  <div className="relative aspect-[2.45/1] overflow-hidden bg-slate-950 sm:aspect-[2.5/1]">
                    <Image
                      src={slide.imageSrc}
                      alt={slide.imageAlt}
                      fill
                      priority={activeIndex === 0 && index === baseIndex}
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover object-top transition-transform duration-300 hover:scale-[1.015]"
                    />
                  </div>
                  <div className="sr-only">
                    <p>{slide.label}</p>
                    <h2>{slide.title}</h2>
                    <p>{slide.body}</p>
                  </div>
                </Link>
              </article>
            ))}
            </div>
          </div>

          <button
            type="button"
            onClick={goToNext}
            className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-slate-950/72 text-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:bg-slate-900 hover:text-white"
            aria-label="Next homepage highlight"
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

function normalizeSlideIndex(index: number) {
  return ((index % slides.length) + slides.length) % slides.length;
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
