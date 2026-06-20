export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

type LegacySearchParams = Record<string, string | string[] | undefined>;

export default function LegacyNewListingPage({ searchParams }: { searchParams?: LegacySearchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, item));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(`/listings/new${query ? `?${query}` : ''}`);
}
