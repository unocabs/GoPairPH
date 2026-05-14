import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { Button } from '@/components/ui/Button';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_URL = `${SITE_URL}/adidas-running-shoes-pampanga`;
const PAGE_TITLE = 'Adidas Running Shoes in Pampanga';
const PAGE_DESCRIPTION =
  'A Pampanga runner guide to Adidas running shoes, popular models, training use cases, pre-loved buying checks, and selling Adidas pairs on Go Pair PH.';

const heroPhoto = {
  src: '/guides/adidas-running-shoes-pampanga-hero.jpg',
  alt: 'Stylized neon Adidas running shoes hero image',
};

const licensedPhotos = [
  {
    title: 'Adidas Ultra Boost 4',
    description:
      'A licensed reference photo of an Adidas Ultraboost model, a softer daily-trainer style that many runners associate with comfort.',
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Adidas_Ultra_Boost_4_running_shoes.jpeg?width=900',
    alt: 'Pair of Adidas Ultra Boost 4 running shoes',
    author: 'Dough4872',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Adidas_Ultra_Boost_4_running_shoes.jpeg',
    licenseLabel: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    title: 'Adidas Adizero Adios Pro 3',
    description:
      'A licensed reference photo of an Adidas carbon-plated race shoe, useful for runners comparing faster Adizero models.',
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Adizero_Adios_Pro_3.jpg?width=900',
    alt: 'Adidas Adizero Adios Pro 3 running shoe photographed in a store',
    author: 'Pangalau',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Adizero_Adios_Pro_3.jpg',
    licenseLabel: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
];

const modelGroups = [
  {
    label: 'Daily training',
    models: ['Adidas Ultraboost', 'Adidas Supernova', 'Adidas SolarGlide', 'Adidas Duramo'],
    note: 'Best for easy runs, walking, gym use, and runners who want comfort first.',
  },
  {
    label: 'Speed workouts',
    models: ['Adidas Adizero SL', 'Adidas Boston', 'Adidas Takumi Sen'],
    note: 'Good for tempo runs, intervals, and runners who want something lighter and quicker.',
  },
  {
    label: 'Race day',
    models: ['Adidas Adizero Adios Pro', 'Adidas Prime X', 'Adidas Pro Evo'],
    note: 'Designed for harder efforts and goal races, usually with higher prices and shorter best-life windows.',
  },
];

const buyingChecks = [
  'Check outsole wear, especially under the heel and forefoot.',
  'Ask for mileage and what type of runs the pair was used for.',
  'Inspect Boost, Lightstrike, or Lightstrike Pro foam for heavy compression.',
  'Confirm US, UK, EU, and CM sizing because Adidas fit can vary by model.',
  'Ask for top, side, heel, and sole photos before reserving.',
  'For race shoes, ask whether they were used for racing, workouts, or casual walking.',
];

const sellingTips = [
  'Mention the exact Adidas model and colorway if you know it.',
  'Add size in multiple units: US, UK, EU, and CM when possible.',
  'Include mileage, flaws, box status, and reason for selling.',
  'Photograph the outsole clearly so buyers can judge wear.',
  'List while the pair still has useful miles left.',
];

const faqs = [
  {
    question: 'Are Adidas running shoes good for Pampanga roads?',
    answer:
      'Many Adidas running shoes work well on paved roads around Pampanga, especially daily trainers for easy runs and Adizero models for workouts or race day. Choose based on comfort, fit, pace, and road surface.',
  },
  {
    question: 'Which Adidas shoes are best for beginners?',
    answer:
      'Beginners usually benefit from comfortable daily trainers such as Supernova, SolarGlide, Duramo, or Ultraboost-style models before buying aggressive race shoes.',
  },
  {
    question: 'Are pre-loved Adidas running shoes worth buying?',
    answer:
      'They can be worth buying if the outsole, upper, and foam still look healthy, the mileage is reasonable, and the seller provides clear photos and honest condition notes.',
  },
  {
    question: 'Can I sell Adidas running shoes on Go Pair PH?',
    answer:
      'Yes. Go Pair PH lets Pampanga runners list Adidas pairs with photos, size, mileage, condition, price, and seller details in one shareable listing.',
  },
];

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  image: `${SITE_URL}${heroPhoto.src}`,
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
  datePublished: '2026-05-12',
  dateModified: '2026-05-12',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': PAGE_URL,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
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
    'adidas running shoes pampanga',
    'adidas shoes pampanga',
    'adidas adizero pampanga',
    'adidas ultraboost pampanga',
    'running shoes pampanga',
    'pre-loved adidas running shoes',
    'buy adidas running shoes pampanga',
    'sell adidas running shoes pampanga',
  ],
  alternates: { canonical: '/adidas-running-shoes-pampanga' },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: '/adidas-running-shoes-pampanga',
    type: 'article',
    images: [heroPhoto.src],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    images: [heroPhoto.src],
  },
};

export default function AdidasRunningShoesPampangaPage() {
  return (
    <>
      <Script
        id="adidas-running-shoes-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="adidas-running-shoes-faq-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="bg-gray-950">
        <section className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div>
              <Link
                href="/guides"
                className="mb-5 inline-flex text-sm font-medium text-teal-400 hover:text-teal-300"
              >
                &larr; Running Shoe Guides
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Adidas Shoe Guide
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
                Adidas Running Shoes in Pampanga
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                A practical guide for Pampanga runners choosing Adidas daily trainers,
                Adizero workout shoes, race-day pairs, or pre-loved listings with useful
                miles left.
              </p>
              <p className="mt-5 text-sm text-gray-500">Last updated: May 12, 2026</p>
            </div>

            <figure className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-2xl shadow-black/40">
              <Image
                src={heroPhoto.src}
                alt={heroPhoto.alt}
                width={1024}
                height={768}
                priority
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            </figure>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <h2 className="mt-2 text-2xl font-bold text-gray-100">
                  Which Adidas running shoe should you look for?
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300">
                  Adidas makes everything from soft everyday trainers to aggressive
                  Adizero race shoes. The best choice depends less on the logo and more on
                  how you plan to run: easy mileage, faster workouts, long runs, races, or
                  casual walking between training days.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {modelGroups.map(group => (
                    <div key={group.label} className="rounded-lg border border-gray-800 bg-gray-950 p-5">
                      <h3 className="font-semibold text-gray-100">{group.label}</h3>
                      <div className="mt-4 space-y-2">
                        {group.models.map(model => (
                          <p key={model} className="text-sm text-gray-300">{model}</p>
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-gray-500">{group.note}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  Running in Clark, Angeles, and San Fernando
                </h2>
                <div className="mt-5 grid gap-5 text-base leading-8 text-gray-300 md:grid-cols-2">
                  <p>
                    Around Clark, CDC Parade Grounds, Clark Global City, Angeles City, and
                    San Fernando, most runners spend a lot of time on pavement. That makes
                    comfort, grip, and foam condition important when choosing Adidas pairs.
                  </p>
                  <p>
                    Daily trainers are easier to use often, while Adizero shoes are better
                    saved for tempo runs, intervals, tune-up races, and long runs with
                    faster segments.
                  </p>
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="mt-2 text-2xl font-bold text-gray-100">
                      Licensed Adidas running shoe photos
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-gray-500">
                    These are third-party Creative Commons images with attribution and
                    license links.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {licensedPhotos.map(photo => (
                    <figure
                      key={photo.title}
                      className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950"
                    >
                      <div className="aspect-[4/3] bg-white">
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          width={900}
                          height={675}
                          loading="lazy"
                          className="h-full w-full object-contain p-4"
                        />
                      </div>
                      <figcaption className="space-y-3 p-4">
                        <div>
                          <h3 className="font-semibold text-gray-100">{photo.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-gray-400">
                            {photo.description}
                          </p>
                        </div>
                        <p className="text-xs leading-5 text-gray-500">
                          Photo by {photo.author}.{' '}
                          <a href={photo.sourceUrl} className="text-teal-400 hover:text-teal-300" rel="noopener noreferrer" target="_blank">
                            Source
                          </a>
                          {' '}licensed under{' '}
                          <a href={photo.licenseUrl} className="text-teal-400 hover:text-teal-300" rel="noopener noreferrer" target="_blank">
                            {photo.licenseLabel}
                          </a>
                          .
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-6">
                  <h2 className="text-2xl font-bold text-gray-100">
                    Buying pre-loved Adidas shoes
                  </h2>
                  <div className="mt-5 space-y-3">
                    {buyingChecks.map(item => (
                      <div key={item} className="rounded-lg bg-gray-950/60 p-3 text-sm leading-6 text-gray-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-6">
                  <h2 className="text-2xl font-bold text-gray-100">
                    Selling Adidas pairs faster
                  </h2>
                  <div className="mt-5 space-y-3">
                    {sellingTips.map(item => (
                      <div key={item} className="rounded-lg bg-gray-950/60 p-3 text-sm leading-6 text-gray-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  Have Adidas running shoes to sell in Pampanga?
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                  List your Adidas pair on Go Pair PH with size, condition, mileage,
                  photos, price, and seller details so local runners can find it faster.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/listings/new">
                    <Button size="lg" className="w-full sm:w-auto">
                      List Adidas Shoes
                    </Button>
                  </Link>
                  <Link href="/browse?brand=Adidas">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Browse Adidas Listings
                    </Button>
                  </Link>
                  <Link href="/find-my-pair/new">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Post an Adidas Pair Request
                    </Button>
                  </Link>
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Quick FAQ</h2>
                <div className="mt-6 grid gap-4">
                  {faqs.map(faq => (
                    <div key={faq.question} className="rounded-lg border border-gray-800 bg-gray-950 p-5">
                      <h3 className="font-semibold text-gray-100">{faq.question}</h3>
                      <p className="mt-2 text-sm leading-7 text-gray-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <p className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs leading-6 text-gray-500">
                Adidas brand names and trademarks belong to their respective owners. Go
                Pair PH is not affiliated with, sponsored by, or endorsed by Adidas. This
                guide is informational and marketplace-focused.
              </p>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-semibold text-gray-100">Search intent</p>
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <p>Adidas running shoes Pampanga</p>
                  <p>Adizero for workouts</p>
                  <p>Ultraboost for comfort</p>
                  <p>Pre-loved Adidas shoes</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-semibold text-gray-100">Good listing details</p>
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <p>Exact model</p>
                  <p>US, EU, CM size</p>
                  <p>Mileage</p>
                  <p>Sole photos</p>
                </div>
              </div>

              <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-5">
                <p className="text-sm font-semibold text-gray-100">Quick action</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Turn an unused Adidas pair into a clean local listing.
                </p>
                <Link href="/listings/new" className="mt-4 block">
                  <Button className="w-full">List Adidas Shoes</Button>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
