import type { Metadata } from 'next';
import Link from 'next/link';
import { PriceGuideForm } from '@/components/pricing/PriceGuideForm';

const title = 'Running Shoe Price Guide Philippines';
const description =
  'Not sure how much to sell your running shoes for? Use Go Pair PH to estimate a suggested resale range for brand-new and pre-loved running shoes in the Philippines.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/price-guide' },
  keywords: [
    'running shoe price guide Philippines',
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
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Go Pair PH`,
    description,
    images: ['/og-image.png'],
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
    <main className="bg-slate-950">
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
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
              Running Shoe Price Guide
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
              Price Your Running Shoes Before Selling
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400 sm:text-lg sm:leading-8">
              Estimate a suggested price range for brand-new, second-hand, or pre-loved running shoes
              before posting them.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-gray-300">
              {['Nike', 'Adidas', 'ASICS', 'New Balance', 'Hoka', 'Puma'].map((brand) => (
                <span key={brand} className="rounded-full border border-white/[0.08] bg-slate-950/60 px-3 py-1">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PriceGuideForm />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <InfoCard
          title="Built for sellers"
          body="Use the range as a starting point before listing. It helps you avoid guessing too high or underselling too fast."
        />
        <InfoCard
          title="Not a certified value"
          body="Photos, proof of purchase, demand, and buyer trust still matter. This is a practical guide, not a guarantee."
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] p-5 text-center sm:p-7">
          <h2 className="text-xl font-bold text-gray-100">Ready to sell after checking the price?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Create one clean Go Pair PH listing, then share it to Facebook groups,
            Messenger, Marketplace, or running chats.
          </p>
          <Link
            href="/listings/new"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400 sm:w-auto"
          >
            List Your Running Shoes
          </Link>
        </div>
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
