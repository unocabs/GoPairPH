import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_TITLE = 'Buy and Sell Running Shoes in Pampanga';
const PAGE_DESCRIPTION =
  'Buy and sell brand-new, pre-loved, and second-hand running shoes in Pampanga through Go Pair PH, a focused marketplace for runners.';
const PAGE_URL = `${SITE_URL}/buy-and-sell-running-shoes-pampanga`;

const localAreas = ['Angeles City', 'San Fernando', 'Clark', 'Mabalacat', 'Mexico', 'Guagua', 'Porac', 'Apalit'];

const localReasons = [
  {
    title: 'Cleaner than scattered posts',
    text: 'A Go Pair PH listing keeps photos, size, condition, mileage, price, and seller details together instead of spread across comments.',
  },
  {
    title: 'Useful for Pampanga meetups',
    text: 'Buyers and sellers can coordinate directly for public meetups, local delivery, or shipping when both sides agree.',
  },
  {
    title: 'Built around runners',
    text: 'The marketplace is focused on running shoes, so buyers are not digging through unrelated items to find a good pair.',
  },
];

const faqs = [
  {
    question: 'Where can I buy and sell running shoes in Pampanga?',
    answer:
      'Go Pair PH helps Pampanga runners buy, sell, and share brand-new, pre-loved, second-hand, and donated running shoes in one focused marketplace.',
  },
  {
    question: 'Can sellers outside Pampanga post running shoes?',
    answer:
      'Yes. Central Luzon and NCR sellers can post running shoes when buyers can realistically receive the pair through meetup, delivery, or shipping.',
  },
  {
    question: 'What Pampanga areas does Go Pair PH serve?',
    answer:
      'Go Pair PH is useful for runners around Angeles City, San Fernando, Clark, Mabalacat, Mexico, Guagua, Porac, Apalit, and nearby areas.',
  },
  {
    question: 'Is Go Pair PH better than posting only in Facebook groups?',
    answer:
      'Facebook groups are still useful for reach. Go Pair PH gives sellers one clean listing link they can share back to Facebook groups, Marketplace, Messenger, or shop pages.',
  },
];

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  image: `${SITE_URL}/og-image.png`,
  author: {
    '@type': 'Organization',
    name: 'Go Pair PH',
    url: SITE_URL,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Go Pair PH',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon.svg`,
    },
  },
  datePublished: '2026-06-02',
  dateModified: '2026-06-02',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': PAGE_URL,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'buy and sell running shoes Pampanga',
    'pre-loved running shoes Pampanga',
    'second hand running shoes Pampanga',
    'used running shoes Pampanga',
    'running shoes for sale Pampanga',
    'running shoes marketplace Pampanga',
  ],
  alternates: { canonical: '/buy-and-sell-running-shoes-pampanga' },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: '/buy-and-sell-running-shoes-pampanga',
    type: 'article',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function BuyAndSellRunningShoesPampangaPage() {
  return (
    <>
      <Script
        id="buy-sell-running-shoes-pampanga-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="buy-sell-running-shoes-pampanga-faq-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="bg-gray-950">
        <section className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <Link href="/guides" className="text-sm font-medium text-teal-400 hover:text-teal-300">
              &larr; Running Shoe Guides
            </Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-teal-400">
              Pampanga Running Shoe Deals
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
              Buy and Sell Running Shoes in Pampanga
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
              Go Pair PH helps Pampanga runners find and share brand-new,
              pre-loved, second-hand, and donated running shoes with cleaner listing
              pages built for shoe details, seller trust, and easy sharing.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/browse?q=pampanga" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400">
                Browse Pampanga Running Shoes
              </Link>
              <Link href="/listings/new" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 hover:text-gray-100">
                List Your Shoes
              </Link>
              <Link href="/help/how-to-sell" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 hover:text-gray-100">
                How Selling Works
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">A local running shoe marketplace for Pampanga</h2>
                <p className="mt-4 text-base leading-8 text-gray-300">
                  Running shoe buyers usually need more than a photo and a short caption.
                  Go Pair PH gives every pair a cleaner page for condition, mileage, size,
                  photos, seller details, and price so runners can decide faster before
                  messaging.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {localReasons.map((reason) => (
                    <div key={reason.title} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <h3 className="font-semibold text-gray-100">{reason.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{reason.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Useful for runners around Pampanga</h2>
                <p className="mt-4 text-base leading-8 text-gray-300">
                  Go Pair PH is especially useful for runners and sellers around:
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {localAreas.map((area) => (
                    <span key={area} className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-200">
                      {area}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Keep using Facebook, but make the listing cleaner</h2>
                <p className="mt-4 text-base leading-8 text-gray-300">
                  Facebook groups and Marketplace are still good places to reach buyers.
                  Go Pair PH works as the clean listing layer: post the pair once, then
                  share the Go Pair PH link anywhere so runners can see the complete
                  details without digging through comments.
                </p>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Common questions</h2>
                <div className="mt-6 space-y-5">
                  {faqs.map((faq) => (
                    <div key={faq.question} className="border-b border-gray-800 pb-5 last:border-0 last:pb-0">
                      <h3 className="text-lg font-semibold text-gray-100">{faq.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border border-teal-500/25 bg-teal-500/[0.06] p-5">
                <h2 className="text-lg font-bold text-gray-100">Have a pair to sell?</h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Create one running shoe listing and share it to your Facebook post,
                  Marketplace listing, group thread, or shop page.
                </p>
                <div className="mt-5 grid gap-3">
                  <Link href="/listings/new" className="rounded-lg bg-teal-500 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-400">
                    List a Pair
                  </Link>
                  <Link href="/price-guide" className="rounded-lg border border-gray-700 px-4 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300">
                    Shoe Price Estimator
                  </Link>
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-lg font-bold text-gray-100">PH-wide page</h2>
                <Link href="/buy-and-sell-running-shoes-philippines" className="mt-3 block text-sm leading-6 text-teal-300 hover:text-teal-200">
                  Buy and sell running shoes in the Philippines
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
