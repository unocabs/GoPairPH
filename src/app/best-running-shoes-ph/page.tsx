import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_URL = `${SITE_URL}/best-running-shoes-ph`;
const PAGE_TITLE = 'Best Running Shoes in the Philippines (2026)';
const PAGE_DESCRIPTION =
  'A Philippines-focused guide to the best running shoes for daily training, long runs, racing, trails, stability, and pre-loved buying on Go Pair PH.';
const LAST_UPDATED = 'May 21, 2026';

const shoePicks = [
  {
    label: 'Best Overall',
    name: 'Adidas Adizero Evo SL',
    bestFor: 'Runners who want one light, fast-feeling road shoe for daily miles and workouts.',
    type: 'Neutral road',
    cushion: 'Lightstrike Pro',
    weight: '7.9 oz',
    drop: '6 mm',
    verdict:
      'A lively lightweight trainer that feels quick enough for tempo days but forgiving enough for regular training when the fit works.',
    watchOut:
      'The shape can feel narrow or race-inspired for some feet, so wide-footed buyers should ask for fit notes or try before buying.',
    preLoved:
      'Good pre-loved buy if the forefoot rubber is intact, the midsole still rebounds, and the seller did not use it as an all-day casual shoe.',
    sources: [
      { label: 'Adidas specs', href: 'https://www.adidas.com/us/adizero-evo-sl-shoes/JH6206.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Daily Trainer',
    name: 'Brooks Ghost 18',
    bestFor: 'Beginners, steady mileage, walking, and runners who want a dependable neutral daily shoe.',
    type: 'Road / daily / walking',
    cushion: 'Balanced DNA Loft v3',
    weight: '10.2 oz',
    drop: '10 mm',
    verdict:
      'The Ghost remains the sensible workhorse pick: stable enough for routine miles, padded enough for comfort, and easy to recommend.',
    watchOut:
      'It is not built to feel explosive, so speed-focused runners may want a lighter trainer beside it.',
    preLoved:
      'Good pre-loved buy if the upper is not stretched out, the heel collar is clean, and the outsole wear is even.',
    sources: [
      { label: 'Brooks specs', href: 'https://www.brooksrunning.com/en_us/mens/shoes/road-running-shoes/ghost-18/110493.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Most Versatile',
    name: 'ASICS Novablast 5',
    bestFor: 'Daily training, longer runs, and runners who like a bouncy but not fully race-shoe ride.',
    type: 'Neutral road',
    cushion: 'High FF Blast Max',
    weight: '9 oz',
    drop: '8 mm',
    verdict:
      'A fun all-rounder with generous cushioning, useful bounce, and enough comfort for many PH road-running routines.',
    watchOut:
      'Traction can matter on wet pavement, so buyers should inspect outsole condition carefully during rainy season.',
    preLoved:
      'Good pre-loved buy if the foam still feels lively and the forefoot outsole has not been flattened smooth.',
    sources: [
      { label: 'ASICS specs', href: 'https://www.asics.com/us/en-us/novablast--5/p/1011B974-402.html' },
      { label: 'RunRepeat', href: 'https://runrepeat.com/guides/best-running-shoes' },
    ],
  },
  {
    label: 'Best Max Cushion',
    name: 'Nike Vomero Plus',
    bestFor: 'Long runs, easy days, recovery miles, and runners who want a soft ZoomX road shoe.',
    type: 'Road / max cushion',
    cushion: 'Full-length ZoomX',
    weight: '10.3 oz',
    drop: '10 mm',
    verdict:
      'A high-stack comfort option for runners who want soft landings without moving into a plated race shoe.',
    watchOut:
      'The tall stack may feel too much for runners who prefer ground feel or very stable low-profile shoes.',
    preLoved:
      'Good pre-loved buy if the midsole has no deep creasing and the seller can show clean outsole photos from heel to toe.',
    sources: [
      { label: 'Nike specs', href: 'https://www.nike.com/t/vomero-plus-mens-road-running-shoes-5npsVBwT/IM6011-060' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Plush Daily Trainer',
    name: 'New Balance 1080v15',
    bestFor: 'Comfort-first daily runs, long runs, and buyers who often need width options.',
    type: 'Neutral road',
    cushion: 'Extra soft Infinion',
    weight: '9.2 oz',
    drop: '6 mm',
    verdict:
      'A cushioned daily shoe for runners who want comfort and width flexibility more than an aggressive speed feel.',
    watchOut:
      'Soft shoes can hide heavy compression in photos, so ask the seller how many kilometers are on the pair.',
    preLoved:
      'Good pre-loved buy if the upper shape is still symmetrical and the midsole does not lean to one side.',
    sources: [
      { label: 'New Balance specs', href: 'https://www.newbalance.com/pd/1080v15/M10806NR-4E-115.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Speed Trainer',
    name: 'Brooks Hyperion Max 3',
    bestFor: 'Workout days, long runs with pace changes, and runners who want a plated trainer without a carbon plate.',
    type: 'Road workout trainer',
    cushion: 'DNA Flash v2 + DNA Gold',
    weight: '9.9 oz',
    drop: '6 mm',
    verdict:
      'A protective fast trainer with a nylon plate, useful for runners building workouts before race day.',
    watchOut:
      'It is pricier than simple daily trainers, so condition matters a lot when buying second hand.',
    preLoved:
      'Good pre-loved buy if the plate area feels smooth underfoot and the seller used it mainly for workouts, not every run.',
    sources: [
      { label: 'Brooks specs', href: 'https://www.brooksrunning.com/en_us/mens/shoes/road-running-shoes/hyperion-max-3/110467.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Stability Shoe',
    name: 'Brooks Adrenaline GTS 25',
    bestFor: 'Runners who like guided support for easy miles, walking, and longer road runs.',
    type: 'Structured support road',
    cushion: 'Balanced DNA Loft v3',
    weight: '10.6 oz',
    drop: '10 mm',
    verdict:
      'A steady support shoe for runners who want guidance without making the ride feel harsh or overly corrective.',
    watchOut:
      'Support shoes should match your stride, so avoid buying only because the price looks good.',
    preLoved:
      'Good pre-loved buy if the midsole is not tilted inward and the outsole wear pattern is not heavily uneven.',
    sources: [
      { label: 'Brooks specs', href: 'https://www.brooksrunning.com/en_us/mens/shoes/road-running-shoes/adrenaline-gts-25/1104541D272.070.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Recovery Shoe',
    name: 'Hoka Bondi 9',
    bestFor: 'Recovery runs, walking, easy mileage, and runners who want plush underfoot protection.',
    type: 'Neutral road / walking',
    cushion: 'Plush supercritical EVA',
    weight: '10.5 oz',
    drop: '5 mm',
    verdict:
      'A big-cushion comfort shoe for easy days when protection matters more than snappy turnover.',
    watchOut:
      'It can feel bulky for fast sessions, and wide-footed runners should confirm fit before committing.',
    preLoved:
      'Good pre-loved buy if the sidewalls are not creased heavily and the outsole still has enough rubber for daily use.',
    sources: [
      { label: 'Hoka specs', href: 'https://www.hoka.com/en/us/mens-everyday-running-shoes/bondi-9/1162011.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Race-Day Shoe',
    name: 'Adidas Adizero Adios Pro 4',
    bestFor: 'Goal races, marathon builds, and experienced runners who want a high-stack racer.',
    type: 'Neutral road racer',
    cushion: 'Lightstrike Pro + EnergyRods',
    weight: '7.1 oz',
    drop: '6 mm',
    verdict:
      'A serious race shoe for fast efforts, best saved for workouts and races instead of daily errands.',
    watchOut:
      'Race shoes age quickly when used casually, so treat vague mileage answers as a warning sign.',
    preLoved:
      'Good pre-loved buy if the seller can separate race mileage from walking mileage and show outsole wear clearly.',
    sources: [
      { label: 'Adidas source', href: 'https://www.adidas.com/us/adizero_adios_pro' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
  {
    label: 'Best Trail Shoe',
    name: 'Brooks Cascadia 19',
    bestFor: 'Trail runs, gravel, mixed terrain, hiking, and runners who want grip and protection.',
    type: 'Trail / stable ride',
    cushion: 'Balanced DNA Loft v3',
    weight: '10.7 oz',
    drop: '6 mm',
    verdict:
      'A practical trail pick with stable cushioning and traction for runners who leave the road or train on mixed surfaces.',
    watchOut:
      'Check lug depth before buying used; trail shoes can look clean on top but be worn down underneath.',
    preLoved:
      'Good pre-loved buy if the lugs still bite, the rock plate feels even, and the upper has no torn flex points.',
    sources: [
      { label: 'Brooks specs', href: 'https://www.brooksrunning.com/en_us/mens/shoes/trail-shoes/cascadia-19/110457.html' },
      { label: 'Runner\'s World', href: 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/' },
    ],
  },
];

const buyingChecks = [
  'Ask for mileage in kilometers and what the shoe was used for: easy runs, races, workouts, walking, or gym.',
  'Request outsole photos from heel, midfoot, and forefoot because the bottom tells the truth fastest.',
  'Compare US, UK, EU, and CM sizing before reserving; brands and models do not fit exactly the same.',
  'Look for midsole compression, deep creases, inward lean, torn uppers, loose heel collars, and missing insoles.',
  'For plated race shoes, ask how many races and hard workouts are already on the pair.',
  'For PH weather, check grip condition if you will run on wet concrete, asphalt, or painted road lines.',
];

const faqs = [
  {
    question: 'What is the best running shoe for beginners in the Philippines?',
    answer:
      'Most beginners should start with a comfortable daily trainer such as the Brooks Ghost 18, ASICS Novablast 5, New Balance 1080v15, or Hoka Bondi 9. Fit and comfort matter more than buying the fastest-looking shoe.',
  },
  {
    question: 'Are pre-loved running shoes worth buying?',
    answer:
      'Pre-loved running shoes can be worth buying when the mileage is reasonable, the outsole and foam still look healthy, the seller provides clear photos, and the size is confirmed in CM, US, UK, or EU.',
  },
  {
    question: 'Do I need carbon-plated shoes for a first race?',
    answer:
      'Most runners do not need carbon-plated shoes for a first race. A reliable daily trainer is usually better for building consistency, then a race shoe can make sense once you have a goal pace and stronger running base.',
  },
  {
    question: 'How should I choose between soft cushion and stability?',
    answer:
      'Choose soft cushion if you want comfort and protection for easy miles. Choose stability if you know you prefer guided support or your form collapses late in longer runs. When unsure, prioritize fit and a secure heel.',
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
  datePublished: '2026-05-21',
  dateModified: '2026-05-21',
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
    'best running shoes Philippines 2026',
    'best running shoes PH',
    'running shoes Philippines',
    'pre-loved running shoes Philippines',
    'buy running shoes Philippines',
    'sell running shoes Philippines',
    'daily trainer running shoes',
    'race day running shoes',
  ],
  alternates: { canonical: '/best-running-shoes-ph' },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: '/best-running-shoes-ph',
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

export default function BestRunningShoesPhPage() {
  return (
    <>
      <Script
        id="best-running-shoes-ph-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="best-running-shoes-ph-faq-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="bg-gray-950">
        <section className="overflow-hidden border-b border-gray-800 bg-gray-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
            <div>
              <Link
                href="/guides"
                className="mb-5 inline-flex text-sm font-medium text-teal-400 hover:text-teal-300"
              >
                &larr; Running Shoe Guides
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Philippines Shoe Guide
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
                Best Running Shoes in the Philippines (2026)
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                A practical shortlist for PH runners choosing daily trainers, long-run
                shoes, race-day pairs, trail shoes, or pre-loved listings with useful
                miles left.
              </p>
              <p className="mt-5 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-teal-500/20 bg-gray-950 p-5 shadow-2xl shadow-black/40 sm:p-7">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                Quick fit logic
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Easy miles', 'Ghost 18, 1080v15, Bondi 9'],
                  ['One-shoe rotation', 'Evo SL, Novablast 5'],
                  ['Speed days', 'Hyperion Max 3, Adios Pro 4'],
                  ['Support or trails', 'Adrenaline GTS 25, Cascadia 19'],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
                    <p className="text-sm font-semibold text-gray-100">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-gray-400">
                Philippines retail and resale prices
                vary by shop, colorway, size, condition, and seller.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-8">
              <section className="min-w-0 rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                  Quick picks
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-100">
                  The shortlist by use case
                </h2>
                <div className="mt-6 w-full max-w-full overflow-x-auto">
                  <table className="min-w-[760px] text-left text-sm">
                    <thead className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="py-3 pr-4 font-semibold">Pick</th>
                        <th className="py-3 pr-4 font-semibold">Shoe</th>
                        <th className="py-3 pr-4 font-semibold">Best for</th>
                        <th className="py-3 pr-4 font-semibold">Specs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {shoePicks.map(shoe => (
                        <tr key={shoe.name}>
                          <td className="py-4 pr-4 font-semibold text-teal-300">{shoe.label}</td>
                          <td className="py-4 pr-4 font-semibold text-gray-100">{shoe.name}</td>
                          <td className="py-4 pr-4">{shoe.bestFor}</td>
                          <td className="py-4 pr-4 text-gray-400">
                            {shoe.weight} / {shoe.drop} / {shoe.type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-5">
                {shoePicks.map((shoe, index) => (
                  <div
                    key={shoe.name}
                    id={shoe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}
                    className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-7"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                          #{index + 1} / {shoe.label}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-100">{shoe.name}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                          {shoe.bestFor}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-6 grid gap-3 sm:grid-cols-4">
                      {[
                        ['Type', shoe.type],
                        ['Cushion', shoe.cushion],
                        ['Weight', shoe.weight],
                        ['Drop', shoe.drop],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                          <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
                          <dd className="mt-2 text-sm font-semibold text-gray-100">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-100">Go Pair take</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{shoe.verdict}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-amber-300">Watch out for</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{shoe.watchOut}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-teal-300">Pre-loved check</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{shoe.preLoved}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {shoe.sources.map(source => (
                        <a
                          key={source.href}
                          href={source.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-teal-500/70 hover:text-teal-300"
                        >
                          {source.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                  Pre-loved buying
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-100">
                  What PH buyers should check before reserving
                </h2>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {buyingChecks.map(check => (
                    <div key={check} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <p className="text-sm leading-6 text-gray-300">{check}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">Running shoe FAQs</h2>
                <div className="mt-6 space-y-5">
                  {faqs.map(faq => (
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
                <h2 className="text-lg font-bold text-gray-100">Find the pair, not just the hype.</h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Use this guide to shortlist models, then check Go Pair PH for new and
                  pre-loved listings from runners and shops.
                </p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href="/browse"
                    className="rounded-lg bg-teal-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
                  >
                    Browse Listings
                  </Link>
                  <Link
                    href="/looking-for"
                    className="rounded-lg border border-gray-700 px-4 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
                  >
                    Looking For
                  </Link>
                  <Link
                    href="/listings/new"
                    className="rounded-lg border border-gray-700 px-4 py-2 text-center text-sm font-semibold text-gray-200 transition-colors hover:border-teal-500/70 hover:text-teal-300"
                  >
                    Sell a Pair
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-lg font-bold text-gray-100">Sources checked</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ['Runner\'s World 2026 roundup', 'https://www.runnersworld.com/gear/a19663621/best-running-shoes/'],
                    ['RunRepeat best running shoes', 'https://runrepeat.com/guides/best-running-shoes'],
                  ].map(([label, href]) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-gray-400 transition-colors hover:text-teal-300"
                    >
                      {label}
                    </a>
                  ))}
                  <p className="text-gray-500">
                    Official brand product/spec pages are linked on each shoe card.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
