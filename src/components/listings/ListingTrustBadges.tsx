import type { ListingTrustSignal } from '@/lib/listingTrust';
import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<ListingTrustSignal['tone'], string> = {
  teal: 'border-teal-400/25 bg-teal-400/[0.08] text-teal-100',
  blue: 'border-blue-400/25 bg-blue-400/[0.08] text-blue-100',
  slate: 'border-white/[0.1] bg-white/[0.04] text-gray-200',
};

interface ListingTrustBadgesProps {
  signals: ListingTrustSignal[];
  compact?: boolean;
  max?: number;
  className?: string;
}

export function ListingTrustBadges({ signals, compact = false, max, className }: ListingTrustBadgesProps) {
  const visible = max ? signals.slice(0, max) : signals;
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map(signal => (
        <span
          key={signal.key}
          title={signal.description}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border font-semibold leading-none',
            compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs',
            TONE_CLASSES[signal.tone],
          )}
        >
          <TrustIcon type={signal.key} compact={compact} />
          {compact ? signal.shortLabel : signal.label}
        </span>
      ))}
    </div>
  );
}

function TrustIcon({ type, compact }: { type: ListingTrustSignal['key']; compact: boolean }) {
  const className = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  if (type === 'photos_complete') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8a2 2 0 012-2h2l1.4-2h5.2L16 6h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l2 2 4-5" />
      </svg>
    );
  }
  if (type === 'location_added') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10.5h.01" />
      </svg>
    );
  }
  if (type === 'messenger_ready') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-8 8l3.5-2H18a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3" />
      </svg>
    );
  }
  if (type === 'verified_seller') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3z" />
    </svg>
  );
}
