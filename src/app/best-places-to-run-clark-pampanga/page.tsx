import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { Button } from '@/components/ui/Button';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_URL = `${SITE_URL}/best-places-to-run-clark-pampanga`;
const PAGE_TITLE = 'Best Places to Run in Clark, Pampanga';
const PAGE_DESCRIPTION =
  'A local running guide for Clark, Pampanga routes, workout ideas, shoe suggestions, safety notes, and Go Pair PH links for local runners.';
const heroPhoto = {
  src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Angelesjf9605_26.JPG?width=1200',
  alt: 'A road scene in Angeles and Clark area in Pampanga',
  author: 'Ramon FVelasquez',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Angelesjf9605_26.JPG',
  licenseLabel: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
};

const routeSpots = [
  {
    name: 'CDC Parade Grounds',
    bestFor: 'Easy runs, shakeouts, social runs, beginner loops',
    why:
      'A familiar meeting point for many Pampanga runners, with a calmer park-like feel and plenty of room to settle into an easy pace.',
    shoe: 'Comfortable daily trainers or light stability shoes.',
  },
  {
    name: 'Clark Global City area',
    bestFor: 'Tempo runs, progression runs, controlled intervals',
    why:
      'Wider roads and straighter sections can work well for structured efforts when conditions are safe and traffic is light.',
    shoe: 'Lightweight trainers, Adizero-style workout shoes, or carbon-plated shoes for key sessions.',
  },
  {
    name: 'Mimosa / Filinvest side roads',
    bestFor: 'Long steady runs and relaxed weekend mileage',
    why:
      'Useful when you want a quieter-feeling route with enough space to build time on feet without constantly stopping.',
    shoe: 'Cushioned daily trainers for long-run comfort.',
  },
  {
    name: 'Clark connector and nearby flat roads',
    bestFor: 'Race-pace segments and longer tempo blocks',
    why:
      'Flat stretches help runners practice rhythm, fueling, and pacing before local races or out-of-town race weekends.',
    shoe: 'Responsive trainers or race shoes, depending on the workout.',
  },
];

const workoutIdeas = [
  {
    title: 'Beginner easy loop',
    details: '20-40 minutes at conversational pace, then 4 short relaxed strides if you feel good.',
  },
  {
    title: 'Tempo day',
    details: '10 minutes easy, 15-25 minutes steady-hard, then 10 minutes easy. Keep it controlled.',
  },
  {
    title: 'Interval session',
    details: 'Warm up well, then run 6-8 repeats of 1 minute fast and 1-2 minutes easy.',
  },
  {
    title: 'Long run',
    details: 'Build time gradually. Stay easy for most of the run and finish slightly faster only when prepared.',
  },
];

const shoeLinks = [
  {
    href: '/browse',
    title: 'Browse running shoes in Pampanga',
    description: 'See active Go Pair PH listings from community sellers and shops.',
  },
  {
    href: '/adidas-running-shoes-pampanga',
    title: 'Adidas running shoes guide',
    description: 'Compare daily trainers, workout shoes, and race-day Adidas models.',
  },
  {
    href: '/carbon-plated-running-shoes-ph',
    title: 'Carbon-plated shoe guide',
    description: 'Learn when carbon shoes make sense for tempo sessions and races.',
  },
  {
    href: '/find-my-pair/new',
    title: 'Post a pair request',
    description: 'Tell local runners what model and size you are looking for.',
  },
];

const safetyNotes = [
  'Check current access rules, events, security advisories, and traffic conditions before running.',
  'Run early or late when heat is lower, and bring water for longer sessions.',
  'Use visible clothing or lights when conditions are dim.',
  'Avoid forcing speed work on crowded roads, wet pavement, or unfamiliar sections.',
  'Tell someone your route if you are running solo.',
];

const faqs = [
  {
    question: 'Where can beginners run in Clark, Pampanga?',
    answer:
      'CDC Parade Grounds is a practical starting point for many beginners because it works for easy loops, social runs, and shorter shakeout runs.',
  },
  {
    question: 'Where can I do tempo runs in Clark?',
    answer:
      'Clark Global City area roads and nearby flatter stretches can work for tempo efforts when conditions are safe, clear, and traffic is light.',
  },
  {
    question: 'What shoes should I use for Clark runs?',
    answer:
      'Use comfortable daily trainers for easy runs and long runs. Save lighter workout shoes or carbon-plated shoes for tempo runs, intervals, and race-specific sessions.',
  },
  {
    question: 'Can I find running shoes for Clark training on Go Pair PH?',
    answer:
      'Yes. Go Pair PH has local listings from community sellers and shops, plus Find My Pair requests if you are searching for a specific model or size.',
  },
];

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  image: heroPhoto.src,
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
  datePublished: '2026-05-17',
  dateModified: '2026-05-17',
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
    'best places to run in Clark Pampanga',
    'Clark Pampanga running routes',
    'CDC Parade Grounds running',
    'Clark Global City running',
    'Pampanga running shoes',
    'running routes Pampanga',
    'where to run in Clark',
  ],
  alternates: { canonical: '/best-places-to-run-clark-pampanga' },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: '/best-places-to-run-clark-pampanga',
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

export default function BestPlacesToRunClarkPampangaPage() {
  return (
    <>
      <Script
        id="clark-running-routes-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="clark-running-routes-faq-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="bg-gray-950">
        <section className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
            <div>
              <Link
                href="/guides"
                className="mb-5 inline-flex text-sm font-medium text-teal-400 hover:text-teal-300"
              >
                &larr; Running Shoe Guides
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Local Running Guide
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
                Best Places to Run in Clark, Pampanga
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                A practical local guide for easy loops, tempo runs, intervals, long runs,
                and choosing the right shoes for Clark roads.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/browse">
                  <Button size="lg" className="w-full sm:w-auto">
                    Browse Running Shoes
                  </Button>
                </Link>
                <Link href="/find-my-pair/new">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Post a Pair Request
                  </Button>
                </Link>
              </div>
              <p className="mt-5 text-sm text-gray-500">Last updated: May 17, 2026</p>
            </div>

            <figure className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-2xl shadow-black/40">
              <Image
                src={heroPhoto.src}
                alt={heroPhoto.alt}
                width={1200}
                height={900}
                priority
                className="aspect-[4/3] h-auto w-full object-cover"
              />
              <figcaption className="border-t border-gray-800 p-3 text-xs leading-5 text-gray-500">
                Photo by {heroPhoto.author}.{' '}
                <a href={heroPhoto.sourceUrl} className="text-teal-400 hover:text-teal-300" rel="noopener noreferrer" target="_blank">
                  Source
                </a>
                {' '}licensed under{' '}
                <a href={heroPhoto.licenseUrl} className="text-teal-400 hover:text-teal-300" rel="noopener noreferrer" target="_blank">
                  {heroPhoto.licenseLabel}
                </a>
                .
              </figcaption>
            </figure>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                  Route ideas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-100">
                  Good Clark running spots by workout type
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                  Clark has a mix of open public areas, calmer roads, and flatter stretches
                  that can work for different training days. Access and road conditions can
                  change, so use this as a runner-friendly guide, then check the area before
                  you start.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {routeSpots.map(spot => (
                    <div key={spot.name} className="rounded-lg border border-gray-800 bg-gray-950 p-5">
                      <h3 className="text-lg font-semibold text-gray-100">{spot.name}</h3>
                      <p className="mt-2 text-sm font-medium text-teal-400">{spot.bestFor}</p>
                      <p className="mt-4 text-sm leading-7 text-gray-400">{spot.why}</p>
                      <p className="mt-4 rounded-lg bg-gray-900 p-3 text-sm leading-6 text-gray-300">
                        <span className="font-semibold text-gray-100">Shoe idea:</span> {spot.shoe}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  Simple workouts you can do around Clark
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {workoutIdeas.map(workout => (
                    <div key={workout.title} className="rounded-lg border border-gray-800 bg-gray-950 p-5">
                      <h3 className="font-semibold text-gray-100">{workout.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-gray-400">{workout.details}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  What shoes work best for Clark runs?
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                  Most runners are better off rotating shoes by workout. Use daily trainers
                  for easy mileage, lighter shoes for speed days, and carbon-plated shoes
                  only when the session is important enough to justify the wear.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {shoeLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-lg border border-gray-800 bg-gray-950 p-5 transition-colors hover:border-teal-500/60 hover:bg-gray-950/80"
                    >
                      <h3 className="font-semibold text-gray-100">{link.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{link.description}</p>
                      <p className="mt-4 text-sm font-medium text-teal-400">Open &rarr;</p>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Safety and comfort notes</h2>
                <div className="mt-5 grid gap-3">
                  {safetyNotes.map(note => (
                    <div key={note} className="rounded-lg bg-gray-950/70 p-4 text-sm leading-6 text-gray-300">
                      {note}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  Need shoes for your next Clark run?
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                  Go Pair PH helps Pampanga runners find daily trainers, speed shoes,
                  race-day pairs, and pre-loved listings from nearby sellers.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/browse">
                    <Button size="lg" className="w-full sm:w-auto">
                      Browse Listings
                    </Button>
                  </Link>
                  <Link href="/find-my-pair/new">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Post a Pair Request
                    </Button>
                  </Link>
                  <Link href="/listings/new">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      List Your Shoes
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
                <p className="text-sm font-semibold text-gray-100">Best for sharing</p>
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <p>Clark runners</p>
                  <p>Beginner groups</p>
                  <p>Weekend long-run crews</p>
                  <p>FB running communities</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-semibold text-gray-100">Route reminder</p>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Conditions, events, and access rules can change. Check before you run,
                  especially for early morning or late evening sessions.
                </p>
              </div>

              <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-5">
                <p className="text-sm font-semibold text-gray-100">Quick action</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Looking for a specific pair for Clark training? Post the model and size.
                </p>
                <Link href="/find-my-pair/new" className="mt-4 block">
                  <Button className="w-full">Post a Pair Request</Button>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
