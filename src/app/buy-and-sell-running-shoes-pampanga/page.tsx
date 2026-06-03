export const revalidate = 60;

import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { createPublicClient } from '@/lib/supabase/server';
import { getOfferCounts } from '@/lib/offers';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Button } from '@/components/ui/Button';
import { HeroFallback } from '@/components/home/HeroFallback';
import { LogoMark } from '@/components/brand/Logo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { Shoe } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_TITLE = 'Buy and Sell Running Shoes in Pampanga';
const PAGE_DESCRIPTION =
  'Buy and sell brand-new, pre-loved, used, and second-hand running shoes in Pampanga on Go Pair PH, a focused marketplace built for runners.';
const PAGE_URL = `${SITE_URL}/buy-and-sell-running-shoes-pampanga`;

const localAreas = [
  'Angeles City',
  'San Fernando',
  'Clark',
  'Mabalacat',
  'Mexico',
  'Guagua',
  'Porac',
  'Apalit',
  'Bacolor',
  'Floridablanca',
  'Lubao',
  'Magalang',
];

const marketplaceTypes = [
  {
    title: 'Brand-new running shoes in Pampanga',
    text: 'Shop sellers and runner sellers can list unused pairs with sizes, photos, price, and handoff details in one clean page.',
  },
  {
    title: 'Pre-loved running shoes in Pampanga',
    text: 'Buyers can check mileage, condition, outsole wear, photos, and seller notes before deciding if the pair is still worth it.',
  },
  {
    title: 'Used and second-hand running shoes',
    text: 'Good daily trainers, backup pairs, walking pairs, starter shoes, and race shoes can stay discoverable beyond one Facebook post.',
  },
];

const localReasons = [
  {
    title: 'Cleaner than scattered FB comments',
    text: 'A Go Pair PH listing keeps photos, size, condition, mileage, price, and seller details together so buyers can scan faster.',
  },
  {
    title: 'Made for Pampanga meetups',
    text: 'Use the listing page as the source of truth, then coordinate public meetup, delivery, or shipping directly with the buyer.',
  },
  {
    title: 'Focused on running shoes only',
    text: 'Buyers are not digging through random marketplace items. Every page is built around the details runners actually ask for.',
  },
  {
    title: 'Easy to share anywhere',
    text: 'Post once on Go Pair PH, then share the same link to Facebook groups, Marketplace, Messenger, or your shop page.',
  },
];

const sellerChecklist = [
  'Show top, side, heel, outsole, and flaw photos.',
  'Add US, EU, and CM size when possible.',
  'Mention mileage, condition, box, receipt, and reason for selling.',
  'Use a realistic price for brand-new, pre-loved, or used pairs.',
  'Share the Go Pair PH listing link back to Pampanga running groups.',
];

const buyerChecklist = [
  'Compare size carefully before meeting or shipping.',
  'Check outsole wear, midsole wrinkles, upper damage, and heel drag.',
  'Ask whether the pair was used for races, daily runs, walking, or workouts.',
  'Prefer clear seller profiles, real photos, and complete listing notes.',
  'Use the listing page to revisit details before finalizing the deal.',
];

const faqs = [
  {
    question: 'Where can I buy and sell running shoes in Pampanga?',
    answer:
      'Go Pair PH helps Pampanga runners buy, sell, and share brand-new, pre-loved, used, second-hand, and donated running shoes in one focused marketplace.',
  },
  {
    question: 'Can I find used running shoes in Pampanga on Go Pair PH?',
    answer:
      'Yes. Go Pair PH supports used and second-hand running shoe listings with photos, size, condition, mileage, price, location, and seller details.',
  },
  {
    question: 'Can sellers outside Pampanga post running shoes?',
    answer:
      'Yes. Central Luzon and NCR sellers can post running shoes when buyers can realistically receive the pair through meetup, delivery, or shipping.',
  },
  {
    question: 'What Pampanga areas does Go Pair PH serve?',
    answer:
      'Go Pair PH is useful for runners around Angeles City, San Fernando, Clark, Mabalacat, Mexico, Guagua, Porac, Apalit, Bacolor, Floridablanca, Lubao, Magalang, and nearby areas.',
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
  dateModified: '2026-06-03',
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
    'used running shoes Pampanga',
    'pre-loved running shoes Pampanga',
    'brand-new running shoes Pampanga',
    'second hand running shoes Pampanga',
    'running shoes for sale Pampanga',
    'running shoes marketplace Pampanga',
    'buy running shoes Angeles City',
    'sell running shoes San Fernando Pampanga',
    'running shoes Clark Pampanga',
    'Go Pair PH Pampanga',
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

async function getRecentListings(): Promise<Shoe[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shoe_images(*), shops(*), shoe_variants(*)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .order('created_at', { ascending: false })
    .limit(24);

  const all = (data as Shoe[]) ?? [];
  const hasPhoto = (shoe: Shoe) => (shoe.shoe_images?.length ?? 0) > 0;

  return all
    .sort((a, b) => {
      const aPhoto = hasPhoto(a);
      const bPhoto = hasPhoto(b);
      if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 8);
}

export default async function BuyAndSellRunningShoesPampangaPage() {
  const recentShoes = await getRecentListings();
  const offerCounts = await getOfferCounts(recentShoes.map((shoe) => shoe.id));

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

      <main className="bg-gray-950">
        <section className="relative overflow-hidden border-b border-gray-800 bg-[#020617]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 28% 42%, rgba(20,184,166,0.22), transparent 34%), linear-gradient(120deg, #020617 0%, #0f172a 44%, #022c22 100%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(255,255,255,0.9) 0.7px, transparent 0.7px)',
              backgroundSize: '4px 4px',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gray-950/70 to-transparent pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-2xl">
                <Link
                  href="/guides"
                  className="mb-4 inline-flex text-sm font-medium text-teal-300 hover:text-teal-200"
                >
                  &larr; Running Shoe Guides
                </Link>
                <div className="mb-4 flex items-center gap-2">
                  <LogoMark size={40} />
                  <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-300 shadow-[0_0_28px_rgba(20,184,166,0.12)] backdrop-blur-sm">
                    Pampanga Running Shoe Marketplace
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-100 drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)] sm:text-5xl">
                  Buy and Sell <br />
                  <span className="text-teal-300">Running Shoes in Pampanga</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300/85 sm:mt-4 sm:text-lg sm:leading-8">
                  Find brand-new, pre-loved, used, and second-hand running shoes
                  from Pampanga runners and nearby sellers. Go Pair PH keeps the
                  photos, size, condition, mileage, price, and seller details in
                  one focused listing page.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
                  <Link href="/browse">
                    <Button size="lg" variant="secondary" className="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base">
                      Browse Pampanga Deals
                    </Button>
                  </Link>
                  <Link href="/listings/new">
                    <Button size="lg" className="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base">
                      List Your Shoes
                    </Button>
                  </Link>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-teal-300/80">
                  Brand-new. Pre-loved. Used. Second-hand.
                </p>
              </div>

              <div className="flex w-full justify-center lg:w-auto lg:flex-1 lg:justify-end">
                <HeroFallback />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.08] bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-slate-900/45 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:grid-cols-4 sm:p-3">
              {[
                { label: 'Buy and sell', desc: 'Running shoe listings only' },
                { label: 'Pampanga-first', desc: 'Built for local runners' },
                { label: 'Used pairs', desc: 'Check wear before buying' },
                { label: 'Easy sharing', desc: 'List once, share anywhere' },
              ].map((item) => (
                <div key={item.label} className="px-3 py-2">
                  <p className="text-sm font-semibold leading-tight text-gray-100">{item.label}</p>
                  <p className="mt-1 text-xs leading-snug text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
                      Recent listings
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-100">
                      Running shoes recently posted on Go Pair PH
                    </h2>
                  </div>
                  <Link href="/browse" className="text-sm font-medium text-teal-400 hover:text-teal-300">
                    View all &rarr;
                  </Link>
                </div>
                {/* <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Browse active running shoe listings from Go Pair PH sellers serving
                  Pampanga, Central Luzon, and NCR. Use filters on the full marketplace
                  to narrow by brand, size, condition, and price.
                </p> */}
                <div className="mt-6">
                  <ListingGrid
                    shoes={recentShoes}
                    offerCounts={offerCounts}
                    emptyMessage="No running shoe listings yet. Be the first Pampanga seller to list a pair."
                  />
                </div>
              </section>
              
              <SurfaceCard glow className="relative overflow-hidden border-teal-500/20 bg-slate-950/70 p-5 sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.12),transparent_34%)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                    Local marketplace
                  </p>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-100 sm:text-3xl">
                    One cleaner place for Pampanga running shoe deals
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-gray-300">
                    Searching Facebook for running shoes in Pampanga can mean old
                    posts, missing sizes, unclear condition, and buried replies.
                    Go Pair PH gives sellers a complete listing page and gives
                    buyers a faster way to compare pairs before messaging.
                  </p>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {marketplaceTypes.map((item) => (
                      <div key={item.title} className="rounded-xl border border-white/[0.08] bg-slate-950/55 p-4">
                        <h3 className="text-sm font-bold text-gray-100">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SurfaceCard>

              <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  Useful for runners around Pampanga
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-300">
                  Go Pair PH is designed for buyers and sellers who want a better way
                  to share running shoe listings around local running communities.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {localAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-200"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <ChecklistCard title="Before selling a pair" items={sellerChecklist} />
                <ChecklistCard title="Before buying used running shoes" items={buyerChecklist} />
              </section>

              <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-100">
                  Keep using Facebook, but make the listing cleaner
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-300">
                  Facebook groups and Marketplace are still good places to reach
                  Pampanga buyers. Go Pair PH works as the clean listing layer:
                  post the running shoes once, then share the Go Pair PH link anywhere
                  so runners can review all details without digging through comments.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {localReasons.map((reason) => (
                    <div key={reason.title} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                      <h3 className="text-sm font-semibold text-gray-100">{reason.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{reason.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-8">
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
              <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] p-5">
                <h2 className="text-lg font-bold text-gray-100">Have running shoes to sell in Pampanga?</h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Create one clean pair page with photos, size, condition, mileage,
                  price, and seller details. Then share it to your Pampanga running
                  group or Facebook Marketplace post.
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

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-lg font-bold text-gray-100">Popular Pampanga searches</h2>
                <div className="mt-4 space-y-2 text-sm leading-6 text-gray-400">
                  <p>buy and sell running shoes Pampanga</p>
                  <p>used running shoes in Pampanga</p>
                  <p>pre-loved running shoes Pampanga</p>
                  <p>brand-new running shoes Pampanga</p>
                  <p>second hand running shoes Pampanga</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-lg font-bold text-gray-100">Also serving nearby sellers</h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Go Pair PH also supports Central Luzon and NCR sellers who can
                  serve Pampanga buyers through meetup, delivery, or shipping.
                </p>
                <Link href="/buy-and-sell-running-shoes-philippines" className="mt-4 block text-sm font-medium text-teal-300 hover:text-teal-200">
                  Philippines running shoe marketplace &rarr;
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] p-6 text-center sm:p-8">
            <h2 className="text-2xl font-bold text-gray-100">
              Make Pampanga running shoe deals easier to find
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Every clean listing helps local runners compare sizes, condition,
              and prices faster. Add your pair, then share the link where runners
              already are.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/listings/new">
                <Button>List Your Running Shoes</Button>
              </Link>
              <Link href="/browse">
                <Button variant="secondary">Browse Running Shoes</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-gray-100">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-gray-400">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
