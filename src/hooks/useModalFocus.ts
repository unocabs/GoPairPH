'use client';
import { useEffect, useRef } from 'react';

export function useModalFocus(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(node.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled])')).filter(el => el.getClientRects().length > 0);
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = controls(); const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', keydown);
    return () => { node.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return ref;
}
