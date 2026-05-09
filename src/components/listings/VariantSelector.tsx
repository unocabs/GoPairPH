'use client';

import { formatSize } from '@/lib/utils';
import type { ShoeVariant } from '@/types';

interface VariantSelectorProps {
  variants: ShoeVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  const inStock = variants
    .filter(v => v.quantity > 0)
    .sort((a, b) => a.size_eu - b.size_eu);

  if (inStock.length === 0) {
    return <p className="text-sm text-red-300">All sizes are currently out of stock.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Choose a size</p>
      <div className="grid grid-cols-2 gap-2">
        {inStock.map(v => {
          const active = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                active
                  ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                  : 'border-gray-700 bg-gray-900 text-gray-200 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <span className="text-sm font-semibold">
                {formatSize(v.size_eu, v.size_us, v.size_cm)}
              </span>
              <span className={`text-[11px] ${active ? 'text-teal-400' : 'text-gray-500'}`}>
                {v.quantity} left
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
