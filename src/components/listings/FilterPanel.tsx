'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDS, CONDITIONS, LISTING_TYPE_LABELS } from '@/lib/constants';

export function FilterPanel() {
  const router = useRouter();
  const params = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page');
    router.push(`/browse?${next.toString()}`);
  }

  function clearAll() {
    router.push('/browse');
  }

  const hasFilters = params.has('type') || params.has('brand') || params.has('condition') || params.has('size_eu') || params.has('q');

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="sticky top-20 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200 text-sm">Filters</h2>
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
                      ? 'bg-teal-500/10 text-teal-400 font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
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
              className="w-full text-sm border border-gray-700 rounded-lg px-2 py-1.5 bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
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
              className="w-full text-sm border border-gray-700 rounded-lg px-2 py-1.5 bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="" className="bg-gray-800">Any condition</option>
              {Object.entries(CONDITIONS).map(([v, l]) => <option key={v} value={v} className="bg-gray-800">{l}</option>)}
            </select>
          </div>

          {/* Size EU */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Size (EU)</p>
            <input
              type="number"
              placeholder="e.g. 42"
              value={params.get('size_eu') ?? ''}
              onChange={e => updateParam('size_eu', e.target.value)}
              min={35}
              max={48}
              step={0.5}
              className="w-full text-sm border border-gray-700 rounded-lg px-2 py-1.5 bg-gray-800 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
