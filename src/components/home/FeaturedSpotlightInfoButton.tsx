'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { trackMarketplaceAction } from '@/lib/analytics';

type Branch = 'none' | 'one' | 'multiple' | 'unverified';

interface SpotlightCta {
  branch: Branch;
  href: string;
  label: string;
  message: string;
}

const FALLBACK: SpotlightCta = {
  branch: 'none',
  href: '/listings/new',
  label: 'Add Listing',
  message: 'Add your shoes to Go Pair PH. Selected listings may also be promoted for free.',
};

interface FeaturedSpotlightInfoButtonProps {
  className?: string;
}

export function FeaturedSpotlightInfoButton({ className }: FeaturedSpotlightInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [cta, setCta] = useState<SpotlightCta>(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/promotions/featured/spotlight-cta')
      .then(response => response.ok ? response.json() : FALLBACK)
      .then(json => {
        if (!cancelled) {
          setCta(json as SpotlightCta);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function toggle() {
    setOpen(value => {
      const next = !value;
      if (next) {
        trackMarketplaceAction('featured_spotlight_tooltip_open', { branch: cta.branch, loaded });
      }
      return next;
    });
  }

  return (
    <div ref={wrapperRef} className={className ?? 'absolute right-2 top-11 z-40 sm:right-4 sm:top-14'}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Featured listing information"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-orange-400/70 bg-black/55 text-sm font-black text-orange-400 shadow-lg backdrop-blur-md transition-colors hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-orange-300 sm:h-8 sm:w-8 sm:text-base"
      >
        i
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Promote your listing"
          className="absolute right-0 mt-1 w-[min(68vw,220px)] rounded-xl border border-white/15 bg-gray-950/95 p-3 text-left shadow-2xl backdrop-blur-md"
        >
          <p className="text-xs font-semibold leading-4 text-gray-100">{cta.message}</p>
          <Link
            href={cta.href}
            onClick={() => {
              trackMarketplaceAction('featured_spotlight_tooltip_cta_click', { branch: cta.branch });
              setOpen(false);
            }}
            className="mt-2 inline-flex rounded-lg bg-teal-500 px-2.5 py-1.5 text-xs font-bold text-gray-950 transition-colors hover:bg-teal-400"
          >
            {cta.label}
          </Link>
        </div>
      )}
    </div>
  );
}
