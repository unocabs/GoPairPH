import type { Metadata } from 'next';
import { PriceGuideForm } from '@/components/pricing/PriceGuideForm';

const title = 'Running Shoe Sellability & Price Estimator Philippines';
const description =
  'Not sure how much to sell your running shoes for? Use Go Pair PH to estimate a resale range, prepare seller notes, and reuse the details when listing.';
const image = '/guides/running-shoe-price-estimator-hero.jpg';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/price-guide' },
  keywords: [
    'running shoe price estimator Philippines',
    'how much to sell running shoes Philippines',
    'pre-loved running shoes Philippines',
    'second hand running shoes price',
    'used running shoes value',
    'Adidas running shoes resale price Philippines',
    'Nike running shoes resale price Philippines',
    'running shoes marketplace Philippines',
  ],
  openGraph: {
    title: `${title} | Go Pair PH`,
    description,
    url: '/price-guide',
    images: [image],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Go Pair PH`,
    description,
    images: [image],
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much should I sell my running shoes for in the Philippines?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Start from the original retail price, then adjust based on condition, mileage, age, demand, box, receipt, flaws, and how quickly you want to sell. Go Pair PH gives a suggested resale range, not a guaranteed value.',
      },
    },
    {
      '@type': 'Question',
      name: 'Should pre-loved running shoes be priced below retail?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most pre-loved running shoes should be priced below retail. Brand-new and very low-mileage pairs can stay closer to retail, while pairs with higher mileage or visible flaws should be priced more realistically.',
      },
    },
  ],
};

export default function PriceGuidePage() {
  return (
    <main className="overflow-x-hidden bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-[#020617]">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(45,212,191,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.45) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="max-w-[22.5rem] sm:max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
              Running Shoe Sellability Guide
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-100 sm:text-4xl">
              Know Your Resale Price
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">
              Can&apos;t decide on the pricing? Get a live resale price range before listing.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-4 w-[22.5rem] max-w-[calc(100vw-2rem)] py-4 sm:mx-auto sm:w-auto sm:max-w-6xl sm:px-6 sm:py-6 lg:px-8">
        <PriceGuideForm />
      </section>

      <section className="mx-4 grid w-[22.5rem] max-w-[calc(100vw-2rem)] gap-4 pb-10 sm:mx-auto sm:w-auto sm:max-w-6xl sm:px-6 lg:grid-cols-3 lg:px-8">
        <InfoCard
          title="Built for sellers"
          body="Use the range as a starting point before listing. Your estimator details can carry into the listing so your notes do not go wasted."
        />
        <InfoCard
          title="Not a certified value"
          body="Photos, proof of purchase, demand, and buyer trust still matter. This is a practical guide, not a guarantee."
        />
      </section>

    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4">
      <h2 className="text-sm font-bold text-gray-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
    </div>
  );
}
