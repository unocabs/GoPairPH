'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackMarketplaceAction } from '@/lib/analytics';

function shouldHide(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === '/listings/new') return true;
  if (pathname.startsWith('/auth/')) return true;
  return /^\/listings\/[^/]+\/edit$/.test(pathname);
}

function BuyShoeBagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className="h-7 w-7"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M7.5 10.5h13l1.1 11.2a2.4 2.4 0 0 1-2.4 2.6H8.8a2.4 2.4 0 0 1-2.4-2.6l1.1-11.2Z"
        className="stroke-teal-200"
        strokeWidth="1.8"
      />
      <path
        d="M10.8 10.5V8.7a3.2 3.2 0 0 1 6.4 0v1.8"
        className="stroke-teal-300"
        strokeWidth="1.8"
      />
      <path
        d="M10 18.8c1.8.7 3.8.8 6 .4 1.9-.4 3.1-.1 3.8.8.2.3.1.8-.3 1H10.7c-.8 0-1.3-.5-1.3-1.1 0-.5.2-.9.6-1.1Z"
        className="stroke-white"
        strokeWidth="1.45"
      />
      <path
        d="M12 17.2c.7.8 1.4 1.4 2.4 1.9"
        className="stroke-teal-300"
        strokeWidth="1.45"
      />
    </svg>
  );
}

function SellShoeTagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className="h-7 w-7"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M15.4 4.8h5.1a2.2 2.2 0 0 1 2.2 2.2v5.1L13.4 21.4a2.4 2.4 0 0 1-3.4 0l-3.4-3.4a2.4 2.4 0 0 1 0-3.4l8.8-9.8Z"
        className="stroke-teal-200"
        strokeWidth="1.8"
      />
      <path
        d="M19.5 8.4h.1"
        className="stroke-teal-300"
        strokeWidth="2.8"
      />
      <path
        d="M9.6 16.3c1.6.6 3.4.7 5.4.3 1.6-.3 2.7 0 3.2.8.2.3.1.7-.3.9h-7.7c-.7 0-1.2-.4-1.2-1 0-.4.2-.8.6-1Z"
        className="stroke-white"
        strokeWidth="1.45"
      />
      <path
        d="M11.5 14.9c.6.7 1.3 1.2 2.1 1.6"
        className="stroke-teal-300"
        strokeWidth="1.45"
      />
    </svg>
  );
}

export function BuySellFloatingAction() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function updateVisibility() {
      if (typeof window === 'undefined') return;
      const shouldShow = window.scrollY > 80;
      setVisible(shouldShow);
      if (!shouldShow) {
        setOpen(false);
      }
    }

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  function trackClick(action: 'buy' | 'sell', destination: string) {
    trackMarketplaceAction(`sticky_cta_${action}_click`, {
      surface: 'floating_cta',
      pathname: pathname ?? '',
      destination,
    });
  }

  if (!mounted || shouldHide(pathname)) return null;

  return createPortal(
    <div
      ref={wrapperRef}
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[80] w-[min(calc(100vw-2rem),18rem)] transition-all duration-200 sm:right-5 md:bottom-6 md:right-6 ${
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {open && (
        <div
          role="menu"
          aria-label="Buy or sell running shoes"
          className="absolute bottom-full right-0 mb-2 w-full overflow-hidden rounded-2xl border border-teal-300/15 bg-slate-950/95 p-2 shadow-2xl shadow-black/60 ring-1 ring-white/[0.03] backdrop-blur-xl"
        >
          <Link
            href="/browse"
            role="menuitem"
            onClick={() => trackClick('buy', '/browse')}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-teal-300/25 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50"
          >
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-teal-300/20 bg-teal-300/10"
            >
              <BuyShoeBagIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-100">Buy Running Shoes</span>
            </span>
          </Link>
          <Link
            href="/listings/new"
            role="menuitem"
            onClick={() => trackClick('sell', '/listings/new')}
            className="mt-2 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-teal-300/25 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50"
          >
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-teal-300/20 bg-teal-300/10"
            >
              <SellShoeTagIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-100">Sell Running Shoes</span>
            </span>
          </Link>
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex min-h-12 items-center rounded-full border border-teal-200/30 bg-gradient-to-r from-teal-300 to-teal-500 px-4 py-2 text-sm font-black text-slate-950 shadow-2xl shadow-teal-950/40 transition duration-200 hover:from-teal-200 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        Buy or Sell?
      </button>
    </div>,
    document.body
  );
}
