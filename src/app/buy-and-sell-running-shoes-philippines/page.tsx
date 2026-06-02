import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_TITLE = 'Buy and Sell Running Shoes in the Philippines';
const PAGE_DESCRIPTION =
  'Buy, sell, and share brand-new, pre-loved, and second-hand running shoes in the Philippines on Go Pair PH, a focused marketplace built for runners.';
const PAGE_URL = `${SITE_URL}/buy-and-sell-running-shoes-philippines`;

const benefits = [
  {
    title: 'For buyers',
    text: 'Browse running shoes with the details runners care about: brand, model, size, condition, mileage, price, photos, and seller information.',
  },
  {
    title: 'For sellers',
    text: 'Create one clean listing page, then share it to Facebook groups, Marketplace, Messenger, or your shop page to reach more runners.',
  },
  {
    title: 'For better deals',
    text: 'Pre-loved and second-hand running shoes can help runners find backup pairs, daily trainers, race shoes, or starter shoes at more practical prices.',
  },
];

const shoeTypes = [
  'Brand-new running shoes from runners, resellers, and selected shops',
  'Pre-loved running shoes with useful mileage left',
  'Second-hand running shoes for training, walking, gym use, or starter pairs',
  'Donated running shoes for runners who need help getting a pair',
];

const buyerChecks = [
  'Ask for top, side, heel, and outsole photos.',
  'Confirm US, EU, UK, and CM size when possible.',
  'Check condition, flaws, mileage, and whether the shoe was used for races or daily runs.',
  'Coordinate meetup, delivery, or shipping directly with the seller.',
];

const faqs = [
  {
    question: 'Where can I buy and sell running shoes in the Philippines?',
    answer:
      'Go Pair PH is a focused marketplace where runners can buy, sell, and share brand-new, pre-loved, second-hand, and donated running shoes in one place.',
  },
  {
    question: 'Can I sell pre-loved running shoes on Go Pair PH?',
    answer:
      'Yes. Sellers can list pre-loved running shoes with photos, size, condition, mileage, price, location, and contact details so buyers can review the pair more easily.',
  },
  {
    question: 'Are second-hand running shoes worth buying?',
    answer:
      'Second-hand running shoes can be worth buying when the outsole, upper, and midsole still look healthy, the mileage is reasonable, and the seller provides clear photos and honest condition notes.',
  },
  {
    question: 'Does Go Pair PH handle payment or shipping?',
    answer:
      'No. Buyers and sellers coordinate the deal directly. Go Pair PH helps organize listings and make running shoe details easier to review and share.',
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
    'buy and sell running shoes Philippines',
    'pre-loved running shoes Philippines',
    'second hand running shoes Philippines',
    'used running shoes Philippines',
    'running shoes marketplace Philippines',
    'brand new running shoes Philippines',
  ],
  alternates: { canonical: '/buy-and-sell-running-shoes-philippines' },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: '/buy-and-sell-running-shoes-philippines',
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

export default function BuyAndSellRunningShoesPhilippinesPage() {
  return (
    <>
      <Script
        id="buy-sell-running-shoes-ph-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="buy-sell-running-shoes-ph-faq-json-ld"
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
              Running Shoe Marketplace
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
              Buy and Sell Running Shoes in the Philippines
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
              Go Pair PH helps runners find, list, and share brand-new, pre-loved,
              second-hand, and donated running shoes in one focused marketplace built
              for running shoes, not random items.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/browse" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400">
                Browse Running Shoes
              </Link>
              <Link href="/listings/new" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 hover:text-gray-100">
                List Your Shoes
              </Link>
              <Link href="/price-guide" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 hover:text-gray-100">
                Shoe Price Estimator
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">A focused place for running shoe deals</h2>
                <p className="mt-4 text-base leading-8 text-gray-300">
                  General marketplaces and Facebook groups can work, but running shoe
                  details often get buried in comments. Go Pair PH keeps the important
                  details on one clean page so buyers can check the pair faster and sellers
                  can share one link anywhere.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {benefits.map((benefit) => (
                    <div key={benefit.title} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <h3 className="font-semibold text-gray-100">{benefit.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{benefit.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">What you can list on Go Pair PH</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {shoeTypes.map((type) => (
                    <p key={type} className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm leading-6 text-gray-300">
                      {type}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Before buying a pre-loved pair</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {buyerChecks.map((check) => (
                    <p key={check} className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm leading-6 text-gray-300">
                      {check}
                    </p>
                  ))}
                </div>
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
                <h2 className="text-lg font-bold text-gray-100">Start with the marketplace</h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Browse active listings or post your own running shoes with one clean,
                  shareable page.
                </p>
                <div className="mt-5 grid gap-3">
                  <Link href="/browse" className="rounded-lg bg-teal-500 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-400">
                    Browse Listings
                  </Link>
                  <Link href="/listings/new" className="rounded-lg border border-gray-700 px-4 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300">
                    List a Pair
                  </Link>
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-lg font-bold text-gray-100">Local page</h2>
                <Link href="/buy-and-sell-running-shoes-pampanga" className="mt-3 block text-sm leading-6 text-teal-300 hover:text-teal-200">
                  Buy and sell running shoes in Pampanga
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
