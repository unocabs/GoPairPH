import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

const guides = [
  {
    href: '/best-running-shoes-ph',
    title: 'Best Running Shoes in the Philippines (2026)',
    description:
      'Compare daily trainers, max-cushion shoes, race-day pairs, stability options, and pre-loved buying checks for PH runners.',
    category: 'Shoe Roundup',
    image: '/og-image.png',
  },
  {
    href: '/best-places-to-run-clark-pampanga',
    title: 'Best Places to Run in Clark, Pampanga',
    description:
      'A local guide to Clark running spots, workouts, safety notes, and shoe ideas for Pampanga runners.',
    category: 'Local Running Guide',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Angelesjf9605_26.JPG?width=1200',
  },
  {
    href: '/adidas-running-shoes-pampanga',
    title: 'Adidas Running Shoes in Pampanga',
    description:
      'Compare Adidas daily trainers, Adizero workout shoes, race-day pairs, and pre-loved buying checks for Pampanga runners.',
    category: 'Brand Guide',
    image: '/guides/adidas-running-shoes-pampanga-hero.jpg',
  },
  {
    href: '/carbon-plated-running-shoes-ph',
    title: 'Carbon-Plated Running Shoes in the Philippines',
    description:
      'Learn how carbon-plated shoes work, when they help, what to watch out for, and how to buy or sell pre-loved race shoes.',
    category: 'Shoe Guide',
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
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-gray-800 pb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
          Go Pair PH Guides
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
          Running Shoe Guides
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-400">
          Helpful reads for Pampanga runners, shoe buyers, community sellers, and
          local shops building better running shoe listings.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        {guides.map(guide => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-teal-500/60 hover:bg-gray-900/80"
          >
            <Image
              src={guide.image}
              alt=""
              width={1200}
              height={720}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                {guide.category}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-gray-100 group-hover:text-teal-300">
                {guide.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">{guide.description}</p>
              <p className="mt-4 text-sm font-medium text-teal-400 group-hover:text-teal-300">
                Read guide &rarr;
              </p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
