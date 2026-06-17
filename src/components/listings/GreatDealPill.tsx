'use client';

import { Tooltip } from '@/components/ui/Tooltip';
import { GREAT_DEAL_TOOLTIP } from '@/lib/pricing/greatDeal';

export function GreatDealPill({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const classes = size === 'sm'
    ? 'px-2 py-1 text-[10px]'
    : 'px-2.5 py-1.5 text-xs';

  return (
    <Tooltip trigger="both" content={GREAT_DEAL_TOOLTIP}>
      <span
        className={`inline-flex cursor-help items-center gap-1 rounded-full border border-teal-200/50 bg-slate-950/85 font-bold uppercase tracking-[0.08em] text-teal-100 shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_20px_rgba(20,184,166,0.18)] backdrop-blur-md ${classes}`}
        aria-label="Great Deal"
      >
        <span aria-hidden="true" className="text-amber-300">⚡</span>
        Great Deal
      </span>
    </Tooltip>
  );
}
