'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /**
   * - `hover` — shows on mouse hover (desktop). Won't fire on touch devices.
   * - `click` — toggles open on click. Useful for mobile-friendly tooltips.
   * - `both`  — hover on desktop, click on mobile.
   */
  trigger?: 'hover' | 'click' | 'both';
  side?: 'top' | 'bottom';
}

export function Tooltip({ content, children, trigger = 'hover', side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOnHover = trigger === 'hover' || trigger === 'both';
  const showOnClick = trigger === 'click' || trigger === 'both';

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function showFromHover() {
    clearCloseTimer();
    setOpen(true);
  }

  function hideFromHover() {
    clearCloseTimer();
    setOpen(false);
  }

  function toggleFromClick() {
    clearCloseTimer();
    setOpen((current) => {
      const next = !current;
      if (next) {
        closeTimerRef.current = setTimeout(() => setOpen(false), 3000);
      }
      return next;
    });
  }

  useEffect(() => clearCloseTimer, []);

  // Compute viewport-relative position whenever the tooltip opens. Uses the
  // trigger's bounding rect so the portal-rendered tooltip lines up regardless
  // of which ancestor would have clipped it.
  useEffect(() => {
    if (!open) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function update() {
      if (!wrapper) return;
      const r = wrapper.getBoundingClientRect();
      const tip = tooltipRef.current;
      const tipW = tip?.offsetWidth ?? 0;
      const tipH = tip?.offsetHeight ?? 0;
      const triggerCenterX = r.left + r.width / 2;
      const top = side === 'top' ? r.top - tipH - 6 : r.bottom + 6;
      // Keep the tooltip within ~8px of the viewport edges.
      const margin = 8;
      const maxLeft = window.innerWidth - tipW - margin;
      const left = Math.min(maxLeft, Math.max(margin, triggerCenterX - tipW / 2));
      setPos({ top, left });
    }

    update();
    // Re-position on scroll/resize so the tooltip stays glued to its trigger.
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, side]);

  // Close click-triggered tooltips when the user clicks anywhere else.
  useEffect(() => {
    if (!open || !showOnClick) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, showOnClick]);

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={showOnHover ? showFromHover : undefined}
      onMouseLeave={showOnHover ? hideFromHover : undefined}
      onClick={showOnClick ? toggleFromClick : undefined}
    >
      {children}
      {open && typeof document !== 'undefined' && createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            opacity: pos ? 1 : 0,
          }}
          className="pointer-events-none z-[100] max-w-[calc(100vw-1rem)] whitespace-normal rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-center text-[11px] font-medium text-gray-200 shadow-lg sm:max-w-xs"
        >
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}
