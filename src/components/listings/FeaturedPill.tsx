'use client';

import { Tooltip } from '@/components/ui/Tooltip';
import { formatShortDate } from '@/lib/utils';

interface FeaturedPillProps {
  featuredUntil: string | null;
  /** Render compactly (used inside the FeaturedListing hero card). */
  compact?: boolean;
}

export function FeaturedPill({ featuredUntil, compact }: FeaturedPillProps) {
  const tooltip = featuredUntil
    ? `★ Featured by Go Pair PH until ${formatShortDate(featuredUntil)}`
    : '★ Featured by Go Pair PH';

  if (compact) {
    // Hover-only: this pill lives inside a Link, so click should navigate.
    return (
      <Tooltip trigger="hover" content={tooltip} side="bottom">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2 py-1 backdrop-blur-md sm:px-3 sm:py-1.5">
          <svg className="h-2.5 w-2.5 shrink-0 sm:h-[11px] sm:w-[11px]" viewBox="0 0 24 24" fill="#facc15" aria-hidden>
            <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.27 5.82 21l2.36-7.15L2 9.36h7.61z" />
          </svg>
          <span className="min-w-0 truncate whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.12em] text-white sm:text-[10px] sm:tracking-widest">
            Pair of the Week
          </span>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip trigger="both" content={tooltip}>
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/40 px-2 py-0.5 text-xs font-semibold cursor-help">
        ★ Featured
      </span>
    </Tooltip>
  );
}
