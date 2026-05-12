import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { Button } from '@/components/ui/Button';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_URL = `${SITE_URL}/carbon-plated-running-shoes-ph`;
const PAGE_TITLE = 'Carbon-Plated Running Shoes in the Philippines';
const PAGE_DESCRIPTION =
  'Learn the pros and cons of carbon-plated running shoes, sample race-day models, Pampanga training tips, and how to buy or sell pre-loved carbon shoes on Go Pair PH.';
const HEADER_IMAGE = '/guides/carbon-plated-running-shoes-header.jpeg';

const pros = [
  'Efficient at faster paces',
  'Snappier toe-off',
  'Race-day confidence',
  'Great for key workouts',
  'Lightweight performance feel',
];

const cons = [
  'Usually expensive',
  'Shorter best-life window',
  'Can feel unstable',
  'Not ideal for every easy run',
  'May load calves differently',
];

const shoeModels = [
  'Nike Vaporfly',
  'Nike Alphafly',
  'Adidas Adizero Adios Pro',
  'Adidas Prime X',
  'Asics Metaspeed Sky',
  'Asics Metaspeed Edge',
  'Saucony Endorphin Pro',
  'New Balance FuelCell SuperComp Elite',
  'Hoka Rocket X',
  'Puma Deviate Nitro Elite',
];

const realShoePhotos = [
  {
    title: 'Adidas Adizero Adios Pro 3',
    description:
      'A real product photo of an Adidas carbon-plated racing shoe, useful as a visual reference for what modern race shoes can look like.',
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Adizero_Adios_Pro_3.jpg?width=900',
    alt: 'Adidas Adizero Adios Pro 3 running shoe photographed in a store',
    author: 'Pangalau',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Adizero_Adios_Pro_3.jpg',
    licenseLabel: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    title: 'Nike Vaporfly cutaway',
    description:
      'A cut-in-half Vaporfly image that shows the foam layers and the dark carbon-fiber plate inside the midsole.',
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nike_Vaporfly_Cut_in_Half.png?width=900',
    alt: 'Nike Vaporfly cut in half showing foam layers and carbon plate',
    author: 'Seth James DeMoor',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nike_Vaporfly_Cut_in_Half.png',
    licenseLabel: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
];

const buyingChecks = [
  'Mileage and workout history',
  'Outsole wear pattern',
  'Midsole creasing or compression',
  'Upper, heel collar, and lace areas',
  'Real top, sole, side, and heel photos',
  'Seller details and clear condition notes',
];

const sellingChecks = [
  'Top and sole photos',
  'Mileage, race history, and workout use',
  'Exact US, EU, or CM size',
  'Box, receipt, flaws, or repairs',
  'Reason for selling',
];

const faqs = [
  {
    question: 'Are carbon-plated running shoes good for daily training?',
    answer:
      'They can work for faster workouts, tempo runs, and race-specific sessions, but many runners still use regular daily trainers for easy mileage because carbon shoes are expensive, less durable, and can feel unstable at slower paces.',
  },
  {
    question: 'How long do carbon-plated running shoes last?',
    answer:
      'Durability depends on the model, runner, surface, and use. Many race-focused carbon shoes feel best for racing and fast workouts first, then may become training shoes once the foam loses its original bounce.',
  },
  {
    question: 'Are pre-loved carbon-plated shoes worth buying?',
    answer:
      'They can be worth it if the mileage is reasonable, the outsole and midsole still look healthy, the upper is intact, and the seller provides clear photos. Always check condition carefully before buying.',
  },
  {
    question: 'Do beginners need carbon-plated shoes?',
    answer:
      'Most beginners do not need carbon-plated shoes right away. A comfortable daily trainer is usually more useful while building consistency, strength, and safe running habits.',
  },
];

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  image: `${SITE_URL}${HEADER_IMAGE}`,
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
    'carbon plated running shoes philippines',
    'carbon running shoes ph',
    'carbon plated shoes pampanga',
    'running shoes pampanga',
    'race day running shoes',
    'pre-loved carbon shoes',
    'Nike Vaporfly Philippines',
    'Adidas Adios Pro Philippines',
  ],
  alternates: { canonical: '/carbon-plated-running-shoes-ph' },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: '/carbon-plated-running-shoes-ph',
    type: 'article',
    images: [HEADER_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    images: [HEADER_IMAGE],
  },
};

export default function CarbonPlatedRunningShoesPage() {
  return (
    <>
      <Script
        id="carbon-plated-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="carbon-plated-faq-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="bg-gray-950">
        <section className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
            <div>
              <Link
                href="/guides"
                className="mb-5 inline-flex text-sm font-medium text-teal-400 hover:text-teal-300"
              >
                &larr; Running Shoe Guides
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Carbon Shoe Guide
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
                Carbon-Plated Running Shoes in the Philippines
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                A practical guide for runners deciding whether carbon-plated shoes are
                worth it for training, racing, buying pre-loved, or selling a pair that
                still has fast miles left.
              </p>
              <p className="mt-5 text-sm text-gray-500">Last updated: May 12, 2026</p>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-2xl shadow-black/40">
              <Image
                src={HEADER_IMAGE}
                alt="Carbon-plated running shoes guide header"
                width={1200}
                height={800}
                priority
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                  The simple version
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-100">
                  What are carbon-plated running shoes?
                </h2>
                <div className="mt-5 grid gap-5 text-base leading-8 text-gray-300 md:grid-cols-2">
                  <p>
                    Carbon-plated running shoes are performance shoes built with a stiff
                    carbon-fiber plate inside the midsole, usually paired with soft,
                    lightweight, high-energy foam.
                  </p>
                  <p>
                    The plate does not magically make you fast by itself. The plate and foam
                    work together to help the shoe feel more stable, more responsive, and
                    easier to roll forward at harder efforts.
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-6">
                  <h2 className="text-2xl font-bold text-gray-100">Pros</h2>
                  <div className="mt-5 space-y-3">
                    {pros.map(item => (
                      <div key={item} className="flex gap-3 rounded-lg bg-gray-950/60 p-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-400" aria-hidden="true" />
                        <p className="text-sm leading-6 text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-6">
                  <h2 className="text-2xl font-bold text-gray-100">Cons</h2>
                  <div className="mt-5 space-y-3">
                    {cons.map(item => (
                      <div key={item} className="flex gap-3 rounded-lg bg-gray-950/60 p-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-400" aria-hidden="true" />
                        <p className="text-sm leading-6 text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-100">Who should consider them?</h2>
                    <div className="mt-5 space-y-4 text-base leading-8 text-gray-300">
                      <p>
                        Carbon-plated shoes make the most sense for runners preparing for a
                        5K, 10K, half marathon, marathon, or triathlon run leg where
                        performance matters.
                      </p>
                      <p>
                        If you are just starting, walking more than running, or building back
                        from an injury, a comfortable daily trainer is usually the better
                        first buy. Add a carbon shoe later when you have a clearer race goal.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {['Race day', 'Tempo runs', 'Intervals', 'Fast long runs'].map(item => (
                      <div key={item} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                        <p className="text-sm font-semibold text-gray-100">{item}</p>
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          Best when the pace is controlled and purposeful.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Popular carbon-plated running shoes</h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                  Each model feels different. Some are aggressive and race-focused, while
                  others feel more forgiving for longer workouts. Fit matters a lot,
                  especially if you are buying pre-loved.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shoeModels.map(model => (
                    <div
                      key={model}
                      className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-medium text-gray-300"
                    >
                      {model}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="mt-2 text-2xl font-bold text-gray-100">
                      Licensed branded shoe photos
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-gray-500">
                    These images are from Wikimedia Commons and are shown with source and
                    license attribution.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {realShoePhotos.map(photo => (
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
                          <a
                            href={photo.sourceUrl}
                            className="text-teal-400 hover:text-teal-300"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Source
                          </a>
                          {' '}licensed under{' '}
                          <a
                            href={photo.licenseUrl}
                            className="text-teal-400 hover:text-teal-300"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {photo.licenseLabel}
                          </a>
                          .
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>

                <p className="mt-5 rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs leading-6 text-gray-500">
                  Brand names and trademarks belong to their respective owners. Go Pair PH
                  is not affiliated with, sponsored by, or endorsed by Nike, Adidas, ASICS,
                  Saucony, New Balance, Hoka, Puma, or any other brand mentioned in this guide.
                </p>
              </section>

              <section className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="p-6 sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                      Local running context
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-100">
                      Training with carbon shoes in Clark, Pampanga
                    </h2>
                    <div className="mt-5 space-y-4 text-base leading-8 text-gray-300">
                      <p>
                        Pampanga runners have plenty of places where carbon-plated shoes can
                        make sense for controlled faster work. Around Clark, the CDC Parade
                        Grounds, the Clark Global City area, and nearby flatter roads are
                        popular choices for tempo runs, intervals, progression runs, and
                        long runs with race-pace segments.
                      </p>
                      <p>
                        You do not need carbon shoes for every run in Clark. Keep daily
                        trainers for easy mileage, then bring out carbon-plated shoes for
                        race simulation days, tune-up workouts, or races.
                      </p>
                    </div>
                  </div>
                  <Image
                    src="/guides/clark-training.svg"
                    alt="Abstract map illustration for running workouts in Clark, Pampanga"
                    width={900}
                    height={620}
                    className="h-full min-h-[280px] w-full object-cover"
                  />
                </div>
              </section>

              <section className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                  <Image
                    src="/guides/shoe-checklist.svg"
                    alt="Checklist illustration for inspecting pre-loved carbon-plated running shoes"
                    width={900}
                    height={620}
                    className="h-full min-h-[280px] w-full object-cover"
                  />
                  <div className="p-6 sm:p-8">
                    <h2 className="text-2xl font-bold text-gray-100">
                      Buying pre-loved carbon-plated shoes
                    </h2>
                    <p className="mt-4 text-base leading-8 text-gray-300">
                      Pre-loved carbon shoes can be a smart buy, especially when a runner
                      used them for only a few workouts or one race. Before buying, check:
                    </p>
                    <div className="mt-5 grid gap-2">
                      {buyingChecks.map(item => (
                        <div key={item} className="rounded-lg bg-gray-950 px-4 py-3 text-sm text-gray-300">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                      Seller notes
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-100">
                      Selling your carbon-plated shoes
                    </h2>
                    <p className="mt-4 text-base leading-8 text-gray-300">
                      If your carbon shoes do not fit your stride, feel too aggressive, or
                      are just sitting unused after race day, list them while they still
                      have value.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sellingChecks.map(item => (
                      <div key={item} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                        <p className="text-sm font-medium text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Have a carbon-plated pair to sell?</h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                  Go Pair PH helps Pampanga runners list new and pre-loved running shoes
                  with photos, size, mileage, condition, and seller details in one clean link.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/listings/new">
                    <Button size="lg" className="w-full sm:w-auto">
                      List Your Carbon-Plated Shoes
                    </Button>
                  </Link>
                  <Link href="/browse?q=carbon">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Browse Carbon Shoes
                    </Button>
                  </Link>
                  <Link href="/wishlist/new">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Post a Wishlist Item
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
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-semibold text-gray-100">Best used for</p>
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <p>Race day</p>
                  <p>Tempo runs</p>
                  <p>Intervals</p>
                  <p>Long runs with fast segments</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-semibold text-gray-100">Better saved from</p>
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <p>Every easy run</p>
                  <p>Unplanned walking use</p>
                  <p>Wet or rough surfaces</p>
                  <p>Runs where stability feels off</p>
                </div>
              </div>

              <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-5">
                <p className="text-sm font-semibold text-gray-100">Quick action</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Have a race shoe sitting unused? Give it a clean listing while it still
                  has value.
                </p>
                <Link href="/listings/new" className="mt-4 block">
                  <Button className="w-full">List a Pair</Button>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
