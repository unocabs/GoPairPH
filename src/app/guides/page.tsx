import type { Metadata } from 'next';
import Image from 'next/image';
import { GuideLink } from '@/components/guides/GuideLink';

type Guide = {
  href: string;
  title: string;
  description: string;
  category: string;
  image: string;
  imageSource?: string;
  imageCredit?: string;
  intent: 'choose' | 'buy' | 'sell';
};

const guides: Guide[] = [
  {
    href: '/buy-and-sell-running-shoes-philippines',
    title: 'Buy and Sell Running Shoes in the Philippines',
    description:
      'A practical guide to buying, selling, and sharing brand-new, pre-loved, and second-hand running shoes on Go Pair PH.',
    category: 'Marketplace Guide',
    intent: 'buy',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Marathon_shoes.jpg?width=1200',
    imageSource: 'https://commons.wikimedia.org/wiki/File:Marathon_shoes.jpg',
    imageCredit: 'Josiah Mackenzie, CC BY 2.0, via Wikimedia Commons',
  },
  {
    href: '/where-to-sell-used-running-shoes-philippines',
    title: 'Where to Sell Used Running Shoes in the Philippines',
    description:
      'Compare the usual Facebook-first selling workflow with one clean Go Pair PH listing link sellers can share anywhere.',
    category: 'Seller Guide',
    intent: 'sell',
    image: '/guides/where-to-sell-used-running-shoes-philippines-hero.webp',
  },
  {
    href: '/buy-and-sell-running-shoes-pampanga',
    title: 'Buy and Sell Running Shoes in Pampanga',
    description:
      'A local guide for Pampanga runners buying and selling brand-new, pre-loved, and second-hand running shoes.',
    category: 'Local Marketplace Guide',
    intent: 'buy',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Friendship_Highway_Angeles_Koreatown.jpg?width=1200',
    imageSource: 'https://commons.wikimedia.org/wiki/File:Friendship_Highway_Angeles_Koreatown.jpg',
    imageCredit: 'Matthew Gan, CC BY-SA 4.0, via Wikimedia Commons',
  },
  {
    href: '/price-guide',
    title: 'Running Shoe Price Estimator Philippines',
    description:
      'Estimate a suggested resale price range before selling brand-new or pre-loved running shoes.',
    category: 'Seller Tool',
    intent: 'sell',
    image: '/guides/running-shoe-price-estimator-hero.jpg',
  },
  {
    href: '/official-running-shoe-brand-links-ph',
    title: 'Official Running Shoe Brand Links',
    description:
      'Use official brand category pages to compare retail prices before buying pre-loved running shoes on Go Pair PH.',
    category: 'Price Check',
    intent: 'choose',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Running_shoes_display.JPG?width=1200',
    imageSource: 'https://commons.wikimedia.org/wiki/File:Running_shoes_display.JPG',
    imageCredit: 'MarkBuckawicki, CC0, via Wikimedia Commons',
  },
  {
    href: '/best-running-shoes-ph',
    title: 'Best Running Shoes in the Philippines (2026)',
    description:
      'Compare daily trainers, max-cushion shoes, race-day pairs, stability options, and pre-loved buying checks for PH runners.',
    category: 'Shoe Roundup',
    intent: 'choose',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Running_shoes.jpg?width=1200',
    imageSource: 'https://commons.wikimedia.org/wiki/File:Running_shoes.jpg',
    imageCredit: 'Tiia Monto, CC BY-SA 4.0, via Wikimedia Commons',
  },
  {
    href: '/best-places-to-run-clark-pampanga',
    title: 'Best Places to Run in Clark, Pampanga',
    description:
      'A local guide to Clark running spots, workouts, safety notes, and shoe ideas for Pampanga runners.',
    category: 'Local Running Guide',
    intent: 'buy',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Angelesjf9605_26.JPG?width=1200',
  },
  {
    href: '/adidas-running-shoes-pampanga',
    title: 'Adidas Running Shoes in Pampanga',
    description:
      'Compare Adidas daily trainers, Adizero workout shoes, race-day pairs, and pre-loved buying checks for Pampanga runners.',
    category: 'Brand Guide',
    intent: 'choose',
    image: '/guides/adidas-running-shoes-pampanga-hero.jpg',
  },
  {
    href: '/carbon-plated-running-shoes-ph',
    title: 'Carbon-Plated Running Shoes in the Philippines',
    description:
      'Learn how carbon-plated shoes work, when they help, what to watch out for, and how to buy or sell pre-loved race shoes.',
    category: 'Shoe Guide',
    intent: 'choose',
    image: '/guides/carbon-plated-running-shoes-header.jpeg',
  },
];

export const metadata: Metadata = {
  title: 'Running Shoe Guides',
  description:
    'Helpful running shoe guides from Go Pair PH for Pampanga runners, buyers, sellers, and local running shoe shops.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Running Shoe Guides | Go Pair PH',
    description:
      'Helpful running shoe guides from Go Pair PH for Pampanga runners, buyers, sellers, and local running shoe shops.',
    url: '/guides',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Running Shoe Guides | Go Pair PH',
    description:
      'Helpful running shoe guides from Go Pair PH for Pampanga runners, buyers, sellers, and local running shoe shops.',
    images: ['/og-image.png'],
  },
};

export default function GuidesPage() {
  const groups = [
    { id: 'choose', title: 'Choose your shoes', thumbnail: '/guides/carbon-shoe-hero.svg' },
    { id: 'buy', title: 'Buying and running locally', thumbnail: '/guides/clark-training.svg' },
    { id: 'sell', title: 'Sell your shoes', thumbnail: '/guides/shoe-checklist.svg' },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-6 border-b border-gray-800 pb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
          Go Pair PH Guides
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
          Running Shoe Guides
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
          Choose running shoes, buy with confidence, or get ready to sell.
        </p>
        <nav aria-label="Guide topics" className="mt-4 flex flex-wrap gap-2">
          {groups.map((group, index) => (
            <a key={group.id} href={`#${group.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-teal-400">
              {['Choose shoes', 'Buying', 'Selling'][index]}
            </a>
          ))}
        </nav>
        <GuideLink source="/guides" href="/browse" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal-300 hover:text-teal-200">Browse available shoes →</GuideLink>
      </header>

      {groups.map(group => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="mb-8 scroll-mt-24">
          <h2 id={`${group.id}-heading`} className="mb-3 text-lg font-bold text-gray-100">{group.title}</h2>
          <div className="grid gap-3 md:grid-cols-2 md:gap-5">
            {guides.filter(guide => guide.intent === group.id).map(guide => (
              <article
                key={guide.href}
                className="group overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-teal-500/60 hover:bg-gray-900/80"
              >
                <GuideLink source="/guides" href={guide.href} className="flex items-start gap-3 p-3 md:block md:p-0">
                  <picture className="block w-16 shrink-0 overflow-hidden rounded-md md:w-full md:rounded-none">
                    <source media="(max-width: 767px)" srcSet={group.thumbnail} />
                    <Image
                      src={guide.image.replace('?width=1200', '?width=640')}
                      alt=""
                      width={1200}
                      height={720}
                      className="aspect-square w-full object-cover md:aspect-[16/9]"
                    />
                  </picture>
                  <div className="min-w-0 md:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 md:text-xs">
                      {guide.category}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-5 text-gray-100 group-hover:text-teal-300 md:mt-2 md:text-xl md:leading-7">
                      {guide.title}
                    </h3>
                    <p className="mt-3 hidden text-sm leading-6 text-gray-400 md:block">{guide.description}</p>
                    <p className="mt-2 text-xs font-medium text-teal-400 group-hover:text-teal-300 md:mt-4 md:text-sm">
                      Read guide &rarr;
                    </p>
                  </div>
                </GuideLink>
                {guide.imageSource && guide.imageCredit ? (
                  <p className="hidden border-t border-gray-800 px-5 pb-4 pt-3 text-[11px] leading-5 text-gray-500 md:block">
                    Image:{' '}
                    <a href={guide.imageSource} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                      {guide.imageCredit}
                    </a>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
