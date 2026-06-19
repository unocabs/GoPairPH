'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { trackMarketplaceAction } from '@/lib/analytics';

export function MobileHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const isSearchMode = isFocused || query.trim().length > 0;

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
      surface: 'homepage_hero_mobile',
      query: trimmedQuery || undefined,
      destination,
    });
    router.push(destination);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="mb-4 flex h-11 min-w-0 w-full items-center rounded-full border border-white/20 bg-white/95 p-1 shadow-[0_12px_36px_rgba(0,0,0,0.28)] md:hidden"
    >
      <label htmlFor="mobile-hero-search" className="sr-only">Search running shoes</label>
      <input
        id="mobile-hero-search"
        type="search"
        name="q"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="off"
        placeholder="Search brand or model"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500"
      />
      <button
        type="submit"
        aria-label={isSearchMode ? 'Search running shoes' : 'Browse all shoes'}
        className={`relative flex h-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-500 text-white shadow-md shadow-teal-500/25 transition-[width,background-color] duration-300 ease-out hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 motion-reduce:transition-none ${
          isSearchMode ? 'w-10' : 'w-[126px]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute whitespace-nowrap text-xs font-bold transition-all duration-200 motion-reduce:transition-none ${
            isSearchMode ? '-translate-x-2 opacity-0' : 'translate-x-0 opacity-100'
          }`}
        >
          Browse All Shoes
        </span>
        <svg
          className={`absolute h-[19px] w-[19px] transition-all duration-200 motion-reduce:transition-none ${
            isSearchMode ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="10.75" cy="10.75" r="6.25" strokeWidth="2.25" />
          <path strokeLinecap="round" strokeWidth="2.25" d="m15.5 15.5 4.25 4.25" />
        </svg>
      </button>
    </form>
  );
}
