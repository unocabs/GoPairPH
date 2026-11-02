'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { trackMarketplaceAction } from '@/lib/analytics';

export function MobileHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');


  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    const destination = trimmedQuery
      ? `/browse?q=${encodeURIComponent(trimmedQuery)}`
      : '/browse';

    trackMarketplaceAction('hero_search_submit', {
      surface: 'homepage_hero',
      query: trimmedQuery || undefined,
      destination,
    });
    router.push(destination);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex h-12 min-w-0 w-full items-center rounded-full border border-white/20 bg-white/95 p-1 shadow-[0_12px_36px_rgba(0,0,0,0.28)]"
    >
      <label htmlFor="mobile-hero-search" className="sr-only">Search running shoes</label>
      <input
        id="mobile-hero-search"
        type="search"
        name="q"
        value={query}
        onChange={handleChange}
        autoComplete="off"
        placeholder="Search brand or model"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500"
      />
      <button
        type="submit"
        className="flex h-10 shrink-0 items-center justify-center rounded-full bg-teal-500 px-4 text-sm font-semibold text-gray-950 hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
      >
        Search
      </button>
    </form>
  );
}
