import Link from 'next/link';
import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

const officialBrandLinks = [
  { brand: 'Adidas PH', href: 'https://www.adidas.com.ph/running-shoes', note: 'Official Adidas Philippines running shoes category.' },
  { brand: 'Nike PH', href: 'https://www.nike.com/ph/w/running-shoes-37v7jzy7ok', note: 'Official Nike Philippines running shoes category.' },
  { brand: 'ASICS PH', href: 'https://www.asics.com/ph/en-ph/shoes051/', note: 'Official ASICS Philippines running shoes category.' },
  { brand: 'PUMA PH', href: 'https://ph.puma.com/ph/en/sport/running/running-shoes-1', note: 'Official PUMA Philippines running shoes category.' },
  { brand: 'Under Armour PH', href: 'https://underarmour.com.ph/collections/running-shoes', note: 'Official Under Armour Philippines running shoes collection.' },
  { brand: 'Mizuno PH', href: 'https://phl.mizuno.com/collections/sport-running-running-shoes', note: 'Official Mizuno Philippines running shoes collection.' },
  { brand: 'Brooks PH', href: 'https://brooksrunning.com.ph/collections/running-shoes', note: 'Official Brooks Philippines running shoes collection.' },
  { brand: 'On PH', href: 'https://www.on.com/en-ph/shop/shoes/running', note: 'Official On Philippines running shoes category.' },
  { brand: 'New Balance official', href: 'https://www.newbalance.com/running-shoes/', note: 'Official New Balance running shoes category for retail price reference.' },
  { brand: 'Salomon PH', href: 'https://ph.salomon.com/collections/running', note: 'Official Salomon Philippines running collection.' },
  { brand: 'Saucony PH', href: 'https://saucony.ph/collections/mens-running-shoes', note: 'Official Saucony Philippines running shoes collection.' },
  { brand: 'HOKA official (AU reference)', href: 'https://au.hoka.com/categories/mens', note: 'Official HOKA category page used as a non-PH price/model reference.' },
];

export const metadata: Metadata = {
  title: 'Official Running Shoe Brand Links',
  description:
    'Official running shoe brand links for Go Pair PH buyers who want to compare retail prices before buying pre-loved running shoes.',
  alternates: { canonical: '/official-running-shoe-brand-links-ph' },
  openGraph: {
    title: 'Official Running Shoe Brand Links | Go Pair PH',
    description:
      'Compare official running shoe category pages before buying pre-loved pairs on Go Pair PH.',
    url: '/official-running-shoe-brand-links-ph',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Official Running Shoe Brand Links | Go Pair PH',
    description:
      'Compare official running shoe category pages before buying pre-loved pairs on Go Pair PH.',
    images: ['/og-image.png'],
  },
};

export default function OfficialRunningShoeBrandLinksPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-white/[0.08] pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Price Check
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
            Official Running Shoe Brand Links
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-gray-400 sm:text-lg">
            Use these official running shoe pages to compare retail prices, current models,
            and original product details before buying pre-loved pairs on Go Pair PH.
          </p>
          <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100">
            These are official brand links for price checking. Go Pair PH is not affiliated
            with these brands.
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {officialBrandLinks.map((brand) => (
            <a
              key={brand.href}
              href={brand.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-white/[0.08] bg-slate-900/72 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:border-teal-400/35 hover:bg-slate-900/90"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-100 group-hover:text-teal-200">
                    {brand.brand}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {brand.note}
                  </p>
                </div>
                <ExternalLinkIcon />
              </div>
              <p className="mt-4 text-xs font-medium text-teal-300">
                Use this to compare retail prices before buying pre-loved.
              </p>
            </a>
          ))}
        </section>

        <SurfaceCard className="mt-8 border-teal-500/20 bg-teal-500/[0.04] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Ready to compare with local deals?</h2>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                Check Go Pair PH listings after you know the retail price range.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/listings/new"
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
              >
                List a Shoe
              </Link>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </PageShell>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-teal-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}
