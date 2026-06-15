import type { ListingCompletenessItem } from '@/lib/listingTrust';
import { cn } from '@/lib/utils';

interface ListingCompletenessCardProps {
  items: ListingCompletenessItem[];
  percent: number;
  className?: string;
}

export function ListingCompletenessCard({ items, percent, className }: ListingCompletenessCardProps) {
  const missing = items.filter(item => !item.complete);

  return (
    <div className={cn('rounded-xl border border-white/[0.08] bg-slate-950/45 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Listing trust checklist</p>
          <h3 className="mt-2 text-sm font-semibold text-gray-100">
            {percent >= 100 ? 'This listing looks complete.' : 'Complete listings get more confident buyers.'}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-teal-400/25 bg-teal-400/[0.08] px-2.5 py-1 text-xs font-bold text-teal-100">
          {percent}%
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                item.complete
                  ? 'border-teal-400/30 bg-teal-400/10 text-teal-200'
                  : 'border-amber-300/30 bg-amber-300/10 text-amber-200',
              )}
              aria-hidden
            >
              {item.complete ? (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className={item.complete ? 'text-gray-300' : 'text-amber-100/90'}>{item.label}</span>
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-gray-400">
          Add {missing.slice(0, 2).map(item => item.label.toLowerCase()).join(' and ')}
          {missing.length > 2 ? ' plus a few more details' : ''} to help runners trust the pair faster.
        </p>
      )}
    </div>
  );
}
