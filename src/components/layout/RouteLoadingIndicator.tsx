'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';

const SHOW_DELAY_MS = 300;
const MAX_VISIBLE_MS = 8000;

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldTrackLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;

  const nextUrl = new URL(href, window.location.href);
  if (nextUrl.origin !== window.location.origin) return false;
  if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return false;

  return true;
}

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current != null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    clearTimers();
    showTimer.current = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      clearTimers();
    }, MAX_VISIBLE_MS);
  }, [clearTimers]);

  const stopLoading = useCallback(() => {
    clearTimers();
    setVisible(false);
  }, [clearTimers]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (isModifiedClick(event)) return;
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (!shouldTrackLink(target)) return;
      startLoading();
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const action = form.getAttribute('action') || window.location.href;
      const nextUrl = new URL(action, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      startLoading();
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    window.addEventListener('pageshow', stopLoading);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      window.removeEventListener('pageshow', stopLoading);
      clearTimers();
    };
  }, [startLoading, stopLoading, clearTimers]);

  useEffect(() => {
    stopLoading();
  }, [pathname, stopLoading]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={`go-pair-route-loader pointer-events-none fixed right-4 z-[90] transition-all duration-200 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <span className="sr-only">Loading page</span>
      <span className="go-pair-route-loader__track">
        <span className="go-pair-route-loader__mark">
          <LogoMark size={30} />
        </span>
      </span>
    </div>
  );
}
