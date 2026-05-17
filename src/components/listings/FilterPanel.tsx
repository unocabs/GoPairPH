'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDS, CONDITIONS, LISTING_TYPE_LABELS } from '@/lib/constants';

const SIZE_UNITS = [
  { value: 'eu', label: 'EU', placeholder: '42', min: 35, max: 48 },
  { value: 'us', label: 'US', placeholder: '10', min: 4, max: 14 },
  { value: 'cm', label: 'CM', placeholder: '27', min: 22, max: 31 },
];

export function FilterPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const paramsString = params.toString();
  const currentSize = params.get('size') ?? params.get('size_eu') ?? '';
  const currentSizeUnit = SIZE_UNITS.some(unit => unit.value === params.get('size_unit'))
    ? params.get('size_unit') ?? 'eu'
    : 'eu';
  const selectedSizeUnit = SIZE_UNITS.find(unit => unit.value === currentSizeUnit) ?? SIZE_UNITS[0];
  const [isPending, startTransition] = useTransition();
  const [size, setSize] = useState(currentSize);

  const updateParam = useCallback((key: string, value: string) => {
    startTransition(() => {
      const next = new URLSearchParams(paramsString);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.delete('page');

      const query = next.toString();
      router.replace(query ? `/browse?${query}` : '/browse', { scroll: false });
    });
  }, [paramsString, router]);

  function clearAll() {
    setSize('');
    startTransition(() => {
      router.replace('/browse', { scroll: false });
    });
  }

  function updateSizeUnit(unit: string) {
    startTransition(() => {
      const next = new URLSearchParams(paramsString);
      next.set('size_unit', unit);
      if (size.trim()) {
        next.set('size', size.trim());
      }
      next.delete('size_eu');
      next.delete('page');

      const query = next.toString();
      router.replace(query ? `/browse?${query}` : '/browse', { scroll: false });
    });
  }

  useEffect(() => {
    setSize(currentSize);
  }, [currentSize]);

  useEffect(() => {
    const nextSize = size.trim();
    if (nextSize === currentSize) return;

    const timeout = window.setTimeout(() => {
      startTransition(() => {
        const next = new URLSearchParams(paramsString);
        if (nextSize) {
          next.set('size', nextSize);
          next.set('size_unit', currentSizeUnit);
        } else {
          next.delete('size');
          next.delete('size_unit');
        }
        next.delete('size_eu');
        next.delete('page');

        const query = next.toString();
        router.replace(query ? `/browse?${query}` : '/browse', { scroll: false });
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [currentSize, currentSizeUnit, paramsString, router, size]);

  const hasFilters = params.has('type') || params.has('brand') || params.has('condition') || params.has('size') || params.has('size_eu') || params.has('q');

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="sticky top-20 rounded-xl border border-white/[0.08] bg-slate-900/72 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-200 text-sm">Filters</h2>
            {isPending && (
              <p className="mt-0.5 text-[11px] text-teal-400">Updating...</p>
            )}
          </div>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-5">
          {/* Listing Type */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Type</p>
            <div className="space-y-0.5">
              {[{ value: '', label: 'All' }, ...Object.entries(LISTING_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateParam('type', opt.value)}
                  className={`block w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    params.get('type') === opt.value || (!params.get('type') && opt.value === '')
                      ? 'bg-teal-500/10 text-teal-300 font-medium ring-1 ring-teal-400/15'
                      : 'text-gray-400 hover:bg-slate-800/70 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Brand</p>
            <select
              value={params.get('brand') ?? ''}
              onChange={e => updateParam('brand', e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-sm text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="" className="bg-gray-800">All brands</option>
              {BRANDS.map(b => <option key={b} value={b} className="bg-gray-800">{b}</option>)}
            </select>
          </div>

          {/* Condition */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Condition</p>
            <select
              value={params.get('condition') ?? ''}
              onChange={e => updateParam('condition', e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-sm text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="" className="bg-gray-800">Any condition</option>
              {Object.entries(CONDITIONS).map(([v, l]) => <option key={v} value={v} className="bg-gray-800">{l}</option>)}
            </select>
          </div>

          {/* Size */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Size</p>
            <div className="flex gap-2">
              <select
                value={currentSizeUnit}
                onChange={e => updateSizeUnit(e.target.value)}
                className="w-20 rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-sm text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {SIZE_UNITS.map(unit => (
                  <option key={unit.value} value={unit.value} className="bg-gray-800">
                    {unit.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder={`e.g. ${selectedSizeUnit.placeholder}`}
                value={size}
                onChange={e => setSize(e.target.value)}
                min={selectedSizeUnit.min}
                max={selectedSizeUnit.max}
                step={0.5}
                className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
