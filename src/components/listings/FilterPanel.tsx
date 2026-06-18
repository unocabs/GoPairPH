'use client';

import { useCallback, useEffect, useState, useTransition, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDS, CONDITIONS, LISTING_TYPE_LABELS, US_SIZE_TYPE_OPTIONS } from '@/lib/constants';
import { SaveSearchButton } from './SaveSearchButton';

const SIZE_UNITS = [
  { value: 'eu', label: 'EU', placeholder: '42', min: 35, max: 48 },
  { value: 'us', label: 'US', placeholder: '10', min: 4, max: 14 },
  { value: 'cm', label: 'CM', placeholder: '27', min: 22, max: 31 },
];

export function FilterPanel({ listingCount = 0 }: { listingCount?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const paramsString = params.toString();
  const hasActiveControls = params.has('type') || params.has('brand') || params.has('condition') || params.has('size') || params.has('size_eu') || params.has('us_size_type') || params.has('q') || params.has('sort');
  const currentQuery = params.get('q') ?? '';
  const [isOpen, setIsOpen] = useState(hasActiveControls);
  const [query, setQuery] = useState(currentQuery);
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
      next.delete('limit');

      const query = next.toString();
      router.replace(query ? `/browse?${query}` : '/browse', { scroll: false });
    });
  }, [paramsString, router]);

  function clearAll() {
    setSize('');
    setQuery('');
    startTransition(() => {
      router.replace('/browse', { scroll: false });
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      const next = new URLSearchParams(paramsString);
      const nextQuery = query.trim();
      if (nextQuery) {
        next.set('q', nextQuery);
      } else {
        next.delete('q');
      }
      next.delete('page');
      next.delete('limit');

      const search = next.toString();
      router.replace(search ? `/browse?${search}` : '/browse', { scroll: false });
    });
  }

  function updateSizeUnit(unit: string) {
    startTransition(() => {
      const next = new URLSearchParams(paramsString);
      next.set('size_unit', unit);
      if (unit !== 'us') next.delete('us_size_type');
      if (size.trim()) {
        next.set('size', size.trim());
      }
      next.delete('size_eu');
      next.delete('page');
      next.delete('limit');

      const query = next.toString();
      router.replace(query ? `/browse?${query}` : '/browse', { scroll: false });
    });
  }

  useEffect(() => {
    setSize(currentSize);
  }, [currentSize]);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

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
          next.delete('us_size_type');
        }
        next.delete('size_eu');
        next.delete('page');
        next.delete('limit');

        const query = next.toString();
        router.replace(query ? `/browse?${query}` : '/browse', { scroll: false });
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [currentSize, currentSizeUnit, paramsString, router, size]);

  const hasFilters = hasActiveControls;
  const currentSort = params.get('sort') === 'price_asc' || params.get('sort') === 'price_desc'
    ? params.get('sort') ?? 'mixed'
    : 'mixed';
  const listingLabel = `${listingCount} listing${listingCount !== 1 ? 's' : ''} found`;
  const typeOptions = [{ value: '', label: 'All' }, ...Object.entries(LISTING_TYPE_LABELS).map(([value, label]) => ({ value, label }))];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-slate-900/72 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          id="browse-search-form"
          onSubmit={submitSearch}
          className="flex flex-col gap-2 sm:flex-row lg:flex-1"
        >
          <input
            id="browse-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search brand or model..."
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-slate-950/70 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 shadow-inner shadow-black/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="hidden rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/15 transition-colors hover:bg-teal-400 sm:inline-flex sm:w-auto sm:self-auto"
          >
            Search
          </button>
        </form>

        <div className="hidden items-center gap-3 lg:flex">
          <p className="text-xs text-gray-500">{listingLabel}</p>
          {currentQuery.trim().length >= 2 && <SaveSearchButton keyword={currentQuery} />}
          {isPending && <p className="text-[11px] text-teal-400">Updating...</p>}
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-teal-400 transition-colors hover:text-teal-300">
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(open => !open)}
            className="rounded-lg border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:border-teal-400/35 hover:text-teal-200"
            aria-expanded={isOpen}
          >
            {isOpen ? 'Hide filters' : '↓ Filter'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 lg:hidden">
        <button
          type="submit"
          form="browse-search-form"
          className="w-1/3 shrink-0 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-500/15 transition-colors hover:bg-teal-400"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          className="shrink-0 rounded-lg border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:border-teal-400/35 hover:text-teal-200"
          aria-expanded={isOpen}
        >
          {isOpen ? 'Hide filters' : '↓ Filter'}
        </button>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-xs text-gray-500">{listingLabel}</p>
          {currentQuery.trim().length >= 2 && (
            <div className="mt-1 flex justify-end">
              <SaveSearchButton keyword={currentQuery} />
            </div>
          )}
          {isPending && <p className="mt-0.5 text-[11px] text-teal-400">Updating...</p>}
        </div>
      </div>

      <div className={`${isOpen ? 'block' : 'hidden'} mt-4`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[140px_minmax(150px,1fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(260px,1.1fr)] lg:items-end lg:gap-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:mb-2 lg:text-xs">Type</p>
            <select
              value={params.get('type') ?? ''}
              onChange={e => updateParam('type', e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:px-2 lg:py-1.5 lg:text-sm"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:mb-2 lg:text-xs">Brand</p>
            <select
              value={params.get('brand') ?? ''}
              onChange={e => updateParam('brand', e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:px-2 lg:py-1.5 lg:text-sm"
            >
              <option value="" className="bg-gray-800">All brands</option>
              {BRANDS.map(b => <option key={b} value={b} className="bg-gray-800">{b}</option>)}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:mb-2 lg:text-xs">Condition</p>
            <select
              value={params.get('condition') ?? ''}
              onChange={e => updateParam('condition', e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:px-2 lg:py-1.5 lg:text-sm"
            >
              <option value="" className="bg-gray-800">Any condition</option>
              {Object.entries(CONDITIONS).map(([v, l]) => <option key={v} value={v} className="bg-gray-800">{l}</option>)}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:mb-2 lg:text-xs">Sort</p>
            <select
              value={currentSort}
              onChange={e => updateParam('sort', e.target.value === 'mixed' ? '' : e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:px-2 lg:py-1.5 lg:text-sm"
            >
              <option value="mixed" className="bg-gray-800">Default</option>
              <option value="price_asc" className="bg-gray-800">Price: Ascending</option>
              <option value="price_desc" className="bg-gray-800">Price: Descending</option>
            </select>
          </div>

          <div className="col-span-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:mb-2 lg:text-xs">Size</p>
            <div className="flex gap-2">
              <select
                value={currentSizeUnit}
                onChange={e => updateSizeUnit(e.target.value)}
                className="w-20 shrink-0 rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:px-2 lg:py-1.5 lg:text-sm"
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
                className="w-20 min-w-0 shrink-0 rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:w-auto lg:flex-1 lg:text-sm"
              />
            </div>
            {currentSizeUnit === 'us' && (
              <select
                value={params.get('us_size_type') ?? ''}
                onChange={e => updateParam('us_size_type', e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-2 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 lg:px-2 lg:py-1.5 lg:text-sm"
              >
                <option value="" className="bg-gray-800">Any US type</option>
                {US_SIZE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {hasFilters && (
          <button onClick={clearAll} className="mt-4 w-full rounded-lg border border-teal-400/25 px-3 py-2 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-500/10 lg:hidden">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
