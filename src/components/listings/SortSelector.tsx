'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type SortKey = 'mixed' | 'newest' | 'price_asc' | 'price_desc';

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'mixed', label: 'Mixed (default)' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
];

export function SortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('sort') as SortKey) ?? 'mixed';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === 'mixed') params.delete('sort');
    else params.set('sort', e.target.value);
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : '/browse');
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-500">
      Sort by
      <select
        value={current}
        onChange={handleChange}
        className="rounded-md border border-white/[0.08] bg-slate-950/70 px-2 py-1 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        {OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
