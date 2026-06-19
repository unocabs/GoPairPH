'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { BRANDS, CONDITIONS, US_SIZE_TYPE_OPTIONS } from '@/lib/constants';
import { formatCondition, formatPrice, formatSize } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { SavedSearch } from '@/types';

type SavedSearchDraft = {
  keyword: string;
  brand: string;
  size_eu: string;
  size_us: string;
  size_cm: string;
  us_size_type: string;
  condition: string;
  max_price_php: string;
  email_enabled: boolean;
};

const EMPTY_DRAFT: SavedSearchDraft = {
  keyword: '',
  brand: '',
  size_eu: '',
  size_us: '',
  size_cm: '',
  us_size_type: 'mens',
  condition: '',
  max_price_php: '',
  email_enabled: true,
};

const BRAND_OPTIONS = BRANDS.map(brand => ({ value: brand, label: brand }));
const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([value, label]) => ({ value, label }));

function draftFromSearch(search: SavedSearch): SavedSearchDraft {
  return {
    keyword: search.keyword,
    brand: search.brand ?? '',
    size_eu: search.size_eu?.toString() ?? '',
    size_us: search.size_us?.toString() ?? '',
    size_cm: search.size_cm?.toString() ?? '',
    us_size_type: search.us_size_type === 'womens' || search.us_size_type === 'unisex' ? search.us_size_type : 'mens',
    condition: search.condition ?? '',
    max_price_php: search.max_price_php?.toString() ?? '',
    email_enabled: search.email_enabled,
  };
}

function payloadFromDraft(draft: SavedSearchDraft) {
  const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value);
  return {
    keyword: draft.keyword.trim(),
    brand: draft.brand || null,
    size_eu: numberOrNull(draft.size_eu),
    size_us: numberOrNull(draft.size_us),
    size_cm: numberOrNull(draft.size_cm),
    us_size_type: draft.us_size_type || 'mens',
    condition: draft.condition || null,
    max_price_php: numberOrNull(draft.max_price_php),
    email_enabled: draft.email_enabled,
  };
}

function SearchSummary({ search }: { search: SavedSearch }) {
  const filters = [
    search.brand,
    formatSize(search.size_eu, search.size_us, search.size_cm, search.us_size_type),
    search.condition ? formatCondition(search.condition) : null,
    search.max_price_php != null ? `Up to ${formatPrice(search.max_price_php)}` : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-gray-100">{search.keyword}</h3>
        <span className={[
          'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          search.email_enabled
            ? 'border-teal-400/30 bg-teal-400/10 text-teal-200'
            : 'border-gray-700 bg-gray-900 text-gray-400',
        ].join(' ')}>
          {search.email_enabled ? 'Daily email on' : 'Paused'}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {filters.length > 0 ? filters.join(' · ') : 'Any brand, size, condition, or price'}
      </p>
    </div>
  );
}

interface SavedSearchesPanelProps {
  initialSearches: SavedSearch[];
}

export function SavedSearchesPanel({ initialSearches }: SavedSearchesPanelProps) {
  const [searches, setSearches] = useState(initialSearches);
  const [draft, setDraft] = useState<SavedSearchDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingSearch = useMemo(
    () => searches.find(search => search.id === editingId) ?? null,
    [editingId, searches],
  );

  function updateDraft<K extends keyof SavedSearchDraft>(key: K, value: SavedSearchDraft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError(null);
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/saved-searches/${editingId}` : '/api/saved-searches', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payloadFromDraft(draft)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save search');
      const savedSearch = json.savedSearch as SavedSearch;
      setSearches(prev => editingId
        ? prev.map(search => search.id === savedSearch.id ? savedSearch : search)
        : [savedSearch, ...prev]
      );
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSearch(search: SavedSearch) {
    setError(null);
    try {
      const res = await fetch(`/api/saved-searches/${search.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email_enabled: !search.email_enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not update search');
      const savedSearch = json.savedSearch as SavedSearch;
      setSearches(prev => prev.map(item => item.id === savedSearch.id ? savedSearch : item));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteSearch(search: SavedSearch) {
    if (!confirm(`Delete saved search "${search.keyword}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/saved-searches/${search.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not delete search');
      setSearches(prev => prev.filter(item => item.id !== search.id));
      if (editingId === search.id) resetForm();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Saved Searches</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Get a daily email when new pairs match this search.
          </p>
        </div>

        {error && (
          <SurfaceCard className="border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </SurfaceCard>
        )}

        {searches.length === 0 ? (
          <SurfaceCard className="border-dashed p-8 text-center">
            <p className="font-semibold text-gray-200">No saved searches yet.</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Add a keyword like &quot;Alphafly&quot;, &quot;Boston 13&quot;, or &quot;carbon plate&quot; and Go Pair PH can email you when new matching pairs are posted.
            </p>
          </SurfaceCard>
        ) : (
          <div className="space-y-3">
            {searches.map(search => (
              <SurfaceCard key={search.id} className="p-4 transition-colors hover:border-teal-400/25">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <SearchSummary search={search} />
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(search.id);
                        setDraft(draftFromSearch(search));
                        setError(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => toggleSearch(search)}>
                      {search.email_enabled ? 'Pause' : 'Resume'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => deleteSearch(search)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>

      <SurfaceCard glow className="p-5 lg:sticky lg:top-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          {editingSearch ? 'Edit search' : 'New search'}
        </p>
        <h3 className="mt-2 text-lg font-bold text-gray-100">
          {editingSearch ? editingSearch.keyword : 'What pair are you waiting for?'}
        </h3>

        <form onSubmit={submitSearch} className="mt-5 space-y-4">
          <Input
            label="Keyword"
            value={draft.keyword}
            onChange={(event) => updateDraft('keyword', event.target.value)}
            placeholder="e.g. Alphafly, Boston 13, carbon plate"
            required
          />
          <Select
            label="Brand"
            placeholder="Any brand"
            value={draft.brand}
            onChange={(event) => updateDraft('brand', event.target.value)}
            options={BRAND_OPTIONS}
          />
          <Select
            label="US size type"
            value={draft.us_size_type}
            onChange={(event) => updateDraft('us_size_type', event.target.value)}
            options={[...US_SIZE_TYPE_OPTIONS]}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="EU"
              inputMode="decimal"
              value={draft.size_eu}
              onChange={(event) => updateDraft('size_eu', event.target.value)}
              placeholder="42"
            />
            <Input
              label={draft.us_size_type === 'womens' ? 'US W' : draft.us_size_type === 'mens' ? 'US M' : 'US'}
              inputMode="decimal"
              value={draft.size_us}
              onChange={(event) => updateDraft('size_us', event.target.value)}
              placeholder="10"
            />
            <Input
              label="CM"
              inputMode="decimal"
              value={draft.size_cm}
              onChange={(event) => updateDraft('size_cm', event.target.value)}
              placeholder="27"
            />
          </div>
          <Select
            label="Condition"
            placeholder="Any condition"
            value={draft.condition}
            onChange={(event) => updateDraft('condition', event.target.value)}
            options={CONDITION_OPTIONS}
          />
          <Input
            label="Max price"
            inputMode="numeric"
            value={draft.max_price_php}
            onChange={(event) => updateDraft('max_price_php', event.target.value)}
            placeholder="e.g. 8000"
          />
          <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-slate-950/50 p-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={draft.email_enabled}
              onChange={(event) => updateDraft('email_enabled', event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-900 text-teal-500 focus:ring-teal-500"
            />
            <span>
              <span className="block font-semibold text-gray-100">Email me daily matches</span>
              <span className="mt-0.5 block text-xs leading-5 text-gray-500">Only sends when new matching pairs are found.</span>
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" loading={submitting} className="w-full">
              {editingSearch ? 'Save Changes' : 'Save Search'}
            </Button>
            {editingSearch && (
              <Button type="button" variant="neutral" onClick={resetForm} className="w-full sm:w-auto">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
