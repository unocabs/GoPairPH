import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const PAGE_TITLE = 'Where to Sell Used Running Shoes in the Philippines';
const PAGE_DESCRIPTION =
  'Compare the usual Facebook-first selling workflow with a cleaner Go Pair PH listing link for selling used, pre-loved, and second-hand running shoes in the Philippines.';
const PAGE_PATH = '/where-to-sell-used-running-shoes-philippines';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const HERO_IMAGE = '/guides/where-to-sell-used-running-shoes-philippines-hero.webp';
const DATE_PUBLISHED = '2026-06-24';

const scatteredSteps = [
  {
    step: '1',
    title: 'Post on Facebook Marketplace',
    body: 'Marketplace gives sellers reach, but running shoe details often sit inside one long caption or get clarified later in comments.',
  },
  {
    step: '2',
    title: 'Repost to multiple groups',
    body: 'Sellers usually copy the same photos and captions into running groups, shoe groups, local buy-and-sell groups, and personal posts.',
  },
  {
    step: '3',
    title: 'Answer the same questions in DMs',
    body: 'Size, mileage, outsole photos, condition, price, location, and sold status can quickly get split across comments, chats, and screenshots.',
  },
] as const;

const goPairSteps = [
  {
    step: '1',
    title: 'Create one Go Pair PH listing',
    body: 'Add photos, size, condition, mileage, price, seller notes, location, and contact details in one focused running shoe page.',
  },
  {
    step: '2',
    title: 'Share the listing anywhere',
    body: 'Use the same Go Pair PH link on Facebook Marketplace, running groups, Messenger, shop pages, and running community chats.',
  },
  {
    step: '3',
    title: 'Update the pair once',
    body: 'When the price changes, a flaw needs to be disclosed, or the pair is sold, the source listing stays easier to keep current.',
  },
] as const;

const comparisonRows = [
  {
    label: 'Reach',
    facebook: 'Strong reach through Marketplace, groups, and social feeds.',
    goPair: 'Keeps that reach by giving sellers one link to share back into those same channels.',
  },
  {
    label: 'Listing details',
    facebook: 'Details can get buried in captions, comments, and repeated replies.',
    goPair: 'Photos, size, condition, mileage, price, and seller notes stay on one page.',
  },
  {
    label: 'Photo organization',
    facebook: 'Extra outsole or flaw photos often get sent separately in DMs.',
    goPair: 'Buyers can review the actual pair photos from the listing before messaging.',
  },
  {
    label: 'Price updates',
    facebook: 'Price drops may need edits across several posts.',
    goPair: 'Update the Go Pair PH listing once, then keep sharing the same link.',
  },
  {
    label: 'Repeated questions',
    facebook: 'Sellers often repeat size, mileage, location, and condition details.',
    goPair: 'A complete listing can answer the basics before the buyer starts a chat.',
  },
  {
    label: 'Sold status',
    facebook: 'Old shared posts may keep circulating after the pair is gone.',
    goPair: 'Marking the listing sold gives buyers a clearer source of truth.',
  },
  {
    label: 'Shareability',
    facebook: 'Each channel can become its own separate post.',
    goPair: 'One clean link works across Facebook, Messenger, groups, and direct chats.',
  },
] as const;

const sellerDetails = [
  'Brand and exact model',
  'US, UK, EU, or CM size when available',
  'Condition, mileage, and how the pair was used',
  'Clear top, side, heel, outsole, and flaw photos',
  'Price, location, meetup, shipping, or delivery notes',
  'Box, receipt, authenticity proof, or missing accessories',
] as const;

const sharePlaces = [
  'Facebook Marketplace',
  'Local running groups',
  'Buy-and-sell shoe groups',
  'Messenger and running club chats',
  'Personal profile posts or stories',
] as const;

const faqs = [
  {
    question: 'Can I still use Facebook Marketplace if I list on Go Pair PH?',
    answer:
      'Yes. Facebook Marketplace and groups are still useful for reach. Go Pair PH works best as the complete listing page you can share into those channels.',
  },
  {
    question: 'Why not just sell directly on Facebook?',
    answer:
      'You can sell directly on Facebook, but details can become scattered across captions, comments, screenshots, and DMs. A Go Pair PH listing keeps the important running shoe details in one place.',
  },
  {
    question: 'What details help used running shoes sell faster?',
    answer:
      'Clear photos, exact size, condition, mileage, price, location, flaws, box or receipt details, and responsive seller notes can help serious buyers decide faster.',
  },
  {
    question: 'Is Go Pair PH only for Pampanga sellers?',
    answer:
      'No. Go Pair PH has strong roots in Pampanga and Central Luzon, but sellers from NCR and other Philippine areas can use it when buyers can realistically receive the pair through meetup, delivery, or shipping.',
  },
  {
    question: 'How should I price used running shoes?',
    answer:
      'Start with the original local retail price, then adjust for condition, mileage, age, demand, included proof, and flaws. The Go Pair PH price guide can help sellers choose a practical starting range.',
  },
] as const;

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  image: `${SITE_URL}${HERO_IMAGE}`,
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
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_PUBLISHED,
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

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Guides',
      item: `${SITE_URL}/guides`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: PAGE_TITLE,
      item: PAGE_URL,
    },
  ],
};

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'where to sell used running shoes Philippines',
    'sell used running shoes Philippines',
    'sell pre-loved running shoes Philippines',
    'sell second hand running shoes Philippines',
    'running shoes marketplace Philippines',
    'sell running shoes Pampanga',
    'sell running shoes Central Luzon',
    'sell running shoes NCR',
    'Go Pair PH sellers',
  ],
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    type: 'article',
    images: [HERO_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE_TITLE} | Go Pair PH`,
    description: PAGE_DESCRIPTION,
    images: [HERO_IMAGE],
  },
};

export default function WhereToSellUsedRunningShoesPhilippinesPage() {
  return (
    <>
      <Script
        id="where-to-sell-used-running-shoes-article-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="where-to-sell-used-running-shoes-faq-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id="where-to-sell-used-running-shoes-breadcrumb-json-ld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="overflow-x-hidden bg-gray-950">
        <HeroSection />

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-3 lg:px-8">
          <InsightCard
            eyebrow="Seller problem"
            title="Your buyers are spread across different channels."
            body="Facebook, groups, and chats can all help, but each post can become a separate version of the same listing."
          />
          <InsightCard
            eyebrow="Go Pair PH role"
            title="Use one listing as the source."
            body="The Go Pair PH page keeps the running shoe details together while social channels still do the distribution."
          />
          <InsightCard
            eyebrow="Buyer effect"
            title="Less guessing before they message."
            body="A complete pair page helps buyers check size, mileage, condition, price, location, and photos faster."
          />
        </section>

        <section className="border-y border-white/[0.08] bg-[#020617]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-8">
            <WorkflowPanel
              eyebrow="The usual way"
              title="Sellers post the same pair in many places."
              description="This works for reach, but it also creates more places to maintain when buyers ask for details or when the listing changes."
              steps={scatteredSteps}
              tone="muted"
            />
            <WorkflowPanel
              eyebrow="The cleaner way"
              title="List once on Go Pair PH, then share anywhere."
              description="The listing becomes the stable page. Facebook Marketplace, groups, and Messenger become places to send that page."
              steps={goPairSteps}
              tone="teal"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              Side-by-side
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-100 sm:text-3xl">
              Facebook-only vs one Go Pair PH link
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">
              Facebook is still useful because buyers are already there. The difference is where the complete, updated listing lives.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-white/[0.08] bg-slate-950/70">
            <div className="hidden grid-cols-[0.75fr_1fr_1fr] border-b border-white/[0.08] bg-slate-900/80 text-xs font-bold uppercase tracking-[0.12em] text-gray-400 md:grid">
              <div className="px-3 py-3 sm:px-4">Area</div>
              <div className="px-3 py-3 sm:px-4">Facebook-only</div>
              <div className="px-3 py-3 sm:px-4 text-teal-200">Go Pair PH link</div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-0 text-[13px] leading-5 text-gray-400 sm:text-sm sm:leading-6 md:grid-cols-[0.75fr_1fr_1fr]"
                >
                  <div className="bg-slate-900/50 px-3 py-3 font-semibold text-gray-200 sm:px-4">
                    {row.label}
                  </div>
                  <div className="px-3 py-3 sm:px-4">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 md:hidden">
                      Facebook-only
                    </p>
                    {row.facebook}
                  </div>
                  <div className="border-t border-teal-400/10 bg-teal-400/[0.035] px-3 py-3 text-teal-50/90 sm:px-4 md:border-l md:border-t-0">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-300 md:hidden">
                      Go Pair PH link
                    </p>
                    {row.goPair}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-slate-950">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                Better listings
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-100 sm:text-3xl">
                What sellers should include before sharing a pair
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">
                Used running shoes sell more smoothly when buyers do not need to chase basic details. Add the information runners usually ask for before you share the listing into your usual channels.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {sellerDetails.map((detail) => (
                  <div
                    key={detail}
                    className="flex min-h-16 items-center gap-3 rounded-lg border border-white/[0.08] bg-[#020617] px-4 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-400/25 bg-teal-400/10 text-sm font-black text-teal-300">
                      ✓
                    </span>
                    <p className="text-sm font-medium leading-5 text-gray-200">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-teal-400/20 bg-teal-400/[0.055] p-5 sm:p-6">
              <h3 className="text-lg font-extrabold text-gray-100">
                Where to share your Go Pair PH listing
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Go Pair PH does not need to replace every channel. It can make each channel cleaner by giving sellers one complete page to share.
              </p>
              <div className="mt-5 grid gap-2">
                {sharePlaces.map((place) => (
                  <div
                    key={place}
                    className="rounded-lg border border-white/[0.08] bg-slate-950/65 px-4 py-3 text-sm font-semibold text-teal-50"
                  >
                    {place}
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3">
                <Link
                  href="/price-guide"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
                >
                  Estimate a Fair Price
                </Link>
                <Link
                  href="/safety"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.12] bg-slate-950/70 px-4 py-2.5 text-sm font-bold text-gray-200 transition-colors hover:border-teal-400/50 hover:text-teal-200"
                >
                  Read Safety Tips
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
            Seller questions
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-100 sm:text-3xl">
            Selling used running shoes in the Philippines
          </h2>
          <div className="mt-6 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-gray-100 marker:content-none">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="text-xl font-normal text-teal-300 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-gray-400">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-teal-400/20 bg-[#020617] p-5 sm:p-6">
            <h2 className="text-xl font-extrabold text-gray-100">
              Start with one clean listing
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Add the full pair details once, then share the same Go Pair PH link wherever your buyers already are.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/listings/new"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
              >
                Create a Listing
              </Link>
              <Link
                href="/help/how-to-sell"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.12] px-5 py-2.5 text-sm font-bold text-gray-200 transition-colors hover:border-teal-400/50 hover:text-teal-200"
              >
                See How to Sell
              </Link>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.08] bg-[#020617]">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(45,212,191,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.45) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(20,184,166,0.20),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.14),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:px-8 lg:py-16">
        <div>
          <Link href="/guides" className="text-sm font-semibold text-teal-300 hover:text-teal-200">
            &larr; Running Shoe Guides
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
            Seller workflow guide
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
            Where to Sell Used Running Shoes in the Philippines
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg sm:leading-8">
            Facebook, groups, and chats can help you reach buyers. A complete Go Pair PH listing gives those buyers one organized place to check the pair before they message.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/listings/new"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-colors hover:bg-teal-400"
            >
              Create a Listing
            </Link>
            <Link
              href="/browse"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.12] bg-slate-950/60 px-5 py-2.5 text-sm font-bold text-gray-200 transition-colors hover:border-teal-400/50 hover:text-teal-200"
            >
              See Active Listings
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl bg-teal-400/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-lg border border-teal-400/20 bg-slate-950 shadow-2xl shadow-black/40">
            <Image
              src={HERO_IMAGE}
              alt="Premium running shoe marketplace workflow with pricing, checklist, and share overlays"
              width={1672}
              height={941}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent p-4 sm:p-5">
              <div className="inline-flex rounded-full border border-teal-300/25 bg-slate-950/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-200 backdrop-blur">
                One listing, many channels
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InsightCard({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-slate-900/70 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-extrabold leading-snug text-gray-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
    </div>
  );
}

function WorkflowPanel({
  eyebrow,
  title,
  description,
  steps,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: typeof scatteredSteps | typeof goPairSteps;
  tone: 'muted' | 'teal';
}) {
  const isTeal = tone === 'teal';

  return (
    <section
      className={`rounded-lg border p-5 sm:p-6 ${
        isTeal
          ? 'border-teal-400/25 bg-teal-400/[0.055]'
          : 'border-white/[0.08] bg-slate-900/60'
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isTeal ? 'text-teal-200' : 'text-gray-500'}`}>
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-100 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">
        {description}
      </p>

      <div className="mt-6 grid gap-3">
        {steps.map((item) => (
          <article key={item.step} className="rounded-lg border border-white/[0.08] bg-[#020617]/80 p-4">
            <div className="flex gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                  isTeal
                    ? 'border-teal-400/30 bg-teal-400/10 text-teal-300'
                    : 'border-gray-700 bg-slate-900 text-gray-300'
                }`}
              >
                {item.step}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100 sm:text-base">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-400">{item.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
