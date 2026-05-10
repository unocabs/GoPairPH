'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CONDITIONS } from '@/lib/constants';
import { type ShopTheme } from '@/lib/shopTheme';

interface ShopListingsFilterProps {
  basePath: string;
  theme: ShopTheme;
}

const SIZE_UNITS = [
  { value: 'eu', label: 'EU', placeholder: '42' },
  { value: 'us', label: 'US', placeholder: '10' },
  { value: 'cm', label: 'CM', placeholder: '27' },
];

export function ShopListingsFilter({ basePath, theme }: ShopListingsFilterProps) {
  const router = useRouter();
  const params = useSearchParams();
  const paramsString = params.toString();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [size, setSize] = useState(params.get('size') ?? '');
  const sizeUnit = SIZE_UNITS.some(unit => unit.value === params.get('size_unit')) ? params.get('size_unit') ?? 'eu' : 'eu';
  const selectedSizeUnit = SIZE_UNITS.find(unit => unit.value === sizeUnit) ?? SIZE_UNITS[0];

  const pushParams = useCallback((next: URLSearchParams) => {
    const queryString = next.toString();
    router.replace(queryString ? `${basePath}?${queryString}` : basePath, { scroll: false });
  }, [basePath, router]);

  const updateParam = useCallback((key: string, value: string) => {
    startTransition(() => {
      const next = new URLSearchParams(paramsString);
      if (value) next.set(key, value);
      else next.delete(key);
      pushParams(next);
    });
  }, [paramsString, pushParams]);

  useEffect(() => {
    setQuery(params.get('q') ?? '');
    setSize(params.get('size') ?? '');
  }, [params]);

  useEffect(() => {
    const nextQuery = query.trim();
    if (nextQuery === (params.get('q') ?? '')) return;

    const timeout = window.setTimeout(() => {
      startTransition(() => {
        const next = new URLSearchParams(paramsString);
        if (nextQuery) next.set('q', nextQuery);
        else next.delete('q');
        pushParams(next);
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [params, paramsString, pushParams, query]);

  useEffect(() => {
    const nextSize = size.trim();
    if (nextSize === (params.get('size') ?? '')) return;

    const timeout = window.setTimeout(() => {
      startTransition(() => {
        const next = new URLSearchParams(paramsString);
        if (nextSize) {
          next.set('size', nextSize);
          next.set('size_unit', sizeUnit);
        } else {
          next.delete('size');
          next.delete('size_unit');
        }
        pushParams(next);
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [params, paramsString, pushParams, size, sizeUnit]);

  function updateSizeUnit(unit: string) {
    startTransition(() => {
      const next = new URLSearchParams(paramsString);
      next.set('size_unit', unit);
      if (size.trim()) next.set('size', size.trim());
      pushParams(next);
    });
  }

  function clearAll() {
    setQuery('');
    setSize('');
    startTransition(() => router.replace(basePath, { scroll: false }));
  }

  const hasFilters = paramsString.length > 0;

  return (
    <aside className="w-full lg:w-60 shrink-0">
      <div className="sticky top-20 rounded-xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: theme.text }}>Filters</h2>
            {isPending && <p className="mt-0.5 text-[11px]" style={{ color: theme.accent }}>Updating...</p>}
          </div>
          {hasFilters && (
            <button type="button" onClick={clearAll} className="text-xs font-medium hover:opacity-80" style={{ color: theme.accent }}>
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.mutedText }}>Search</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Brand or model"
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{ backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.accent } as React.CSSProperties}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.mutedText }}>Condition</span>
            <select
              value={params.get('condition') ?? ''}
              onChange={event => updateParam('condition', event.target.value)}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{ backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.accent } as React.CSSProperties}
            >
              <option value="">Any condition</option>
              {Object.entries(CONDITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.mutedText }}>Size</span>
            <div className="mt-2 flex gap-2">
              <select value={sizeUnit} onChange={event => updateSizeUnit(event.target.value)} className="w-20 rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-1" style={{ backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.accent } as React.CSSProperties}>
                {SIZE_UNITS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
              <input type="number" step={0.5} value={size} onChange={event => setSize(event.target.value)} placeholder={selectedSizeUnit.placeholder} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.accent } as React.CSSProperties} />
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.mutedText }}>Availability</span>
            <select value={params.get('stock') ?? 'available'} onChange={event => updateParam('stock', event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.accent } as React.CSSProperties}>
              <option value="available">Available only</option>
              <option value="all">Show all active</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.mutedText }}>Sort</span>
            <select value={params.get('sort') ?? 'latest'} onChange={event => updateParam('sort', event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, '--tw-ring-color': theme.accent } as React.CSSProperties}>
              <option value="latest">Latest</option>
              <option value="price_asc">Price low to high</option>
              <option value="price_desc">Price high to low</option>
            </select>
          </label>
        </div>
      </div>
    </aside>
  );
}
