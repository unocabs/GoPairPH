'use client';

import { Tooltip } from '@/components/ui/Tooltip';

export function SponsoredPill({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <Tooltip
      trigger="both"
      content="Top Pick is paid placement."
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/95 font-semibold text-slate-950 shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-md cursor-help ${padding}`}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
        </span>
        Top Pick
      </span>
    </Tooltip>
  );
}
