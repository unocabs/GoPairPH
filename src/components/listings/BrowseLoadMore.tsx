'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { captureBrowsePosition, restoreBrowsePosition, type BrowsePosition } from '@/lib/browseScroll';

export function BrowseLoadMore({ href, visibleCount, total, label = 'Load more', countLabel = 'shoes' }: {
  href: string | null;
  visibleCount: number;
  total: number;
  label?: string;
  countLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, startTransition] = useTransition();
  const button = useRef<HTMLAnchorElement>(null);
  const saved = useRef<{ target: string; position: BrowsePosition; keyboard: boolean; stop: () => void } | null>(null);

  useLayoutEffect(() => {
    const snapshot = saved.current;
    if (!snapshot) return;
    const current = `${pathname}${search ? `?${search}` : ''}`;
    if (current !== snapshot.target && pending) return;
    snapshot.stop();
    saved.current = null;
    // A filter change or another navigation should keep its normal scroll behavior.
    if (current === snapshot.target) {
      restoreBrowsePosition(snapshot.position, document, window);
      if (snapshot.keyboard) button.current?.focus({ preventScroll: true });
    }
  }, [pathname, search, pending]);

  useEffect(() => () => { saved.current?.stop(); }, []);

  if (total === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2" aria-busy={pending}>
      {href && <Link
        ref={button}
        href={href}
        scroll={false}
        prefetch={false}
        data-inline-navigation
        aria-disabled={pending}
        onClick={event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          if (pending || saved.current) return;
          const snapshot = {
            target: href, position: captureBrowsePosition(document, window), keyboard: event.detail === 0,
            stop: () => window.removeEventListener('scroll', updatePosition),
          };
          function updatePosition() {
            snapshot.position = captureBrowsePosition(document, window);
          }
          saved.current = snapshot;
          window.addEventListener('scroll', updatePosition, { passive: true });
          event.currentTarget.blur();
          startTransition(() => router.push(href, { scroll: false }));
        }}
        className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-teal-400/30 bg-teal-500/10 px-5 py-2.5 text-sm font-semibold text-teal-100 transition-colors hover:border-teal-300/60 hover:bg-teal-500/15 sm:w-auto ${pending ? 'cursor-wait opacity-70' : ''}`}
      >
        {pending ? 'Loading…' : label}
      </Link>}
      <p className="text-xs text-gray-500" role="status" aria-live="polite">
        Showing {visibleCount} of {total} {countLabel}
      </p>
    </div>
  );
}
