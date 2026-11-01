'use client';
import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import type { SavedEstimate } from '@/lib/pricing/estimatorServer';
export function EstimateComparison({ history }: { history: SavedEstimate[] }) {
  const [first, setFirst] = useState(''),
    [second, setSecond] = useState('');
  if (history.length < 2) return null;
  return (
    <details className="rounded-xl border border-white/10 p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Compare two saved estimates
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[first, second].map((id, index) => {
          const estimate = history.find((row) => row.id === id);
          return (
            <div key={index} className="min-w-0">
              <label className="text-xs text-gray-400">
                Estimate {index + 1}
                <select
                  value={id}
                  onChange={(event) =>
                    (index ? setSecond : setFirst)(event.target.value)
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-700 bg-slate-900 p-2 text-sm"
                >
                  <option value="">Choose a saved estimate</option>
                  {history.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.input.brand} {row.input.model} ·{' '}
                      {new Date(row.created_at).toLocaleDateString('en-PH')}
                    </option>
                  ))}
                </select>
              </label>
              {estimate && (
                <dl className="mt-3 space-y-3 rounded-lg bg-slate-900 p-3 text-xs leading-5">
                  <div>
                    <dt className="text-gray-500">Suggested asking range</dt>
                    <dd className="break-words font-bold text-teal-200">
                      {formatPrice(estimate.result.suggestedLow)}–
                      {formatPrice(estimate.result.suggestedHigh)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Entered SRP</dt>
                    <dd>{formatPrice(estimate.input.retailPricePhp)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Wear</dt>
                    <dd>
                      {estimate.input.condition.replace('_', ' ')} ·{' '}
                      {estimate.input.mileageKm != null
                        ? `${estimate.input.mileageKm} km`
                        : 'unknown km'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Evidence</dt>
                    <dd>
                      {estimate.result.evidenceType.replaceAll('_', ' ')} ·{' '}
                      {estimate.result.confidence} confidence
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Calculated</dt>
                    <dd>
                      {new Date(estimate.created_at).toLocaleDateString(
                        'en-PH',
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        These are dated saved results. Different wear and reference dates can
        explain price differences.
      </p>
    </details>
  );
}
