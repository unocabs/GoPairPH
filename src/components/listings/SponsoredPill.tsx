'use client';

import { Tooltip } from '@/components/ui/Tooltip';

export function SponsoredPill({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <Tooltip
      trigger="both"
      content="Sponsored by the seller — paid placement, not endorsed by Go Pair PH."
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 font-semibold text-amber-300 cursor-help ${padding}`}
      >
        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M3 11l18-7-7 18-2.5-7.5L3 11z" />
        </svg>
        Sponsored
      </span>
    </Tooltip>
  );
}
