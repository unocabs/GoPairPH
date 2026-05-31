'use client';

import { US_SIZE_TYPE_OPTIONS, type UsSizeType } from '@/lib/constants';
import { findSizeConversion } from '@/lib/utils';

export interface VariantRow {
  /** Existing variant id, or null for new (unsaved) rows. */
  id: string | null;
  size_eu: number | '';
  size_us: number | '';
  size_cm: number | '';
  us_size_type: UsSizeType;
  quantity: number | '';
}

interface VariantsEditorProps {
  value: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  /** When true, a row's "Remove" button sets quantity to 0 instead of removing,
   *  preserving order history. Used in the edit form. */
  preserveRowsOnRemove?: boolean;
}

function emptyRow(): VariantRow {
  return { id: null, size_eu: '', size_us: '', size_cm: '', us_size_type: 'mens', quantity: 1 };
}

export function VariantsEditor({ value, onChange, preserveRowsOnRemove = false }: VariantsEditorProps) {
  const rows = value.length === 0 ? [emptyRow()] : value;
  const fieldClassName = 'min-w-0 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60';

  function update(idx: number, patch: Partial<VariantRow>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  }

  function autofillFromEu(idx: number, val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) {
      update(idx, { size_eu: '' });
      return;
    }
    const match = findSizeConversion('eu', num, rows[idx].us_size_type);
    update(idx, {
      size_eu: num,
      size_us: match?.us ?? rows[idx].size_us,
      size_cm: match?.cm ?? rows[idx].size_cm,
    });
  }

  function autofillFromUs(idx: number, val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) {
      update(idx, { size_us: '' });
      return;
    }
    const match = findSizeConversion('us', num, rows[idx].us_size_type);
    update(idx, {
      size_us: num,
      size_eu: match?.eu ?? rows[idx].size_eu,
      size_cm: match?.cm ?? rows[idx].size_cm,
    });
  }

  function autofillFromCm(idx: number, val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) {
      update(idx, { size_cm: '' });
      return;
    }
    const match = findSizeConversion('cm', num, rows[idx].us_size_type);
    update(idx, {
      size_cm: num,
      size_eu: match?.eu ?? rows[idx].size_eu,
      size_us: match?.us ?? rows[idx].size_us,
    });
  }

  function addRow() {
    onChange([...rows, emptyRow()]);
  }

  function updateUsSizeType(idx: number, usSizeType: UsSizeType) {
    const row = rows[idx];
    const match = typeof row.size_us === 'number'
      ? findSizeConversion('us', row.size_us, usSizeType)
      : typeof row.size_eu === 'number'
        ? findSizeConversion('eu', row.size_eu, usSizeType)
        : null;
    update(idx, {
      us_size_type: usSizeType,
      ...(match ? { size_eu: match.eu, size_us: match.us, size_cm: match.cm } : {}),
    });
  }

  function removeRow(idx: number) {
    if (preserveRowsOnRemove) {
      // Keep the row, set quantity to 0.
      update(idx, { quantity: 0 });
    } else {
      const next = rows.filter((_, i) => i !== idx);
      onChange(next.length === 0 ? [emptyRow()] : next);
    }
  }

  return (
    <div className="space-y-2 overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-[72px_minmax(128px,0.95fr)_72px_72px_76px_44px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <span>EU</span>
        <span>US type</span>
        <span>US</span>
        <span>CM</span>
        <span>Qty</span>
        <span />
      </div>

      {rows.map((row, idx) => (
        <div key={row.id ?? `new-${idx}`} className="grid grid-cols-2 gap-2 items-start sm:grid-cols-[72px_minmax(128px,0.95fr)_72px_72px_76px_44px]">
          <input
            type="number"
            step={0.5}
            min={35}
            max={48}
            placeholder="EU"
            value={row.size_eu}
            onChange={e => autofillFromEu(idx, e.target.value)}
            disabled={!!row.id /* lock size on existing rows to preserve unique key */}
            className={fieldClassName}
          />
          <select
            value={row.us_size_type}
            onChange={e => updateUsSizeType(idx, e.target.value as UsSizeType)}
            disabled={!!row.id}
            className={fieldClassName}
          >
            {US_SIZE_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-800">
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step={0.5}
            placeholder={row.us_size_type === 'womens' ? 'US W' : row.us_size_type === 'mens' ? 'US M' : 'US'}
            value={row.size_us}
            onChange={e => autofillFromUs(idx, e.target.value)}
            disabled={!!row.id}
            className={fieldClassName}
          />
          <input
            type="number"
            step={0.5}
            placeholder="CM"
            value={row.size_cm}
            onChange={e => autofillFromCm(idx, e.target.value)}
            disabled={!!row.id}
            className={fieldClassName}
          />
          <input
            type="number"
            min={0}
            step={1}
            placeholder="Stock"
            value={row.quantity}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              update(idx, { quantity: isNaN(n) ? '' : n });
            }}
            className={fieldClassName}
          />
          <button
            type="button"
            onClick={() => removeRow(idx)}
            aria-label={preserveRowsOnRemove ? 'Set quantity to zero' : 'Remove row'}
            title={preserveRowsOnRemove ? 'Set stock to 0' : 'Remove'}
            className="col-span-2 inline-flex min-w-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400 sm:col-span-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-teal-500 hover:text-teal-400 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add size
      </button>
    </div>
  );
}
