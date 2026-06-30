import type { Metadata } from 'next';
import Link from 'next/link';
import { PriceGuideForm } from '@/components/pricing/PriceGuideForm';

const title = 'Running Shoe Resale Price Calculator Philippines';
const description =
  'Estimate a fair resale price for new or used running shoes in the Philippines based on retail price, condition, mileage, age, and buyer demand.';
const image = '/guides/running-shoe-price-estimator-hero.jpg';

const priceGuideFaqs = [
  {
    question: 'How much should I sell my running shoes for in the Philippines?',
    answer:
      'Start from the original Philippine retail price, then adjust for condition, mileage, age, demand, included proof or packaging, visible flaws, and how quickly you want to sell. The calculator gives a suggested range rather than a guaranteed selling price.',
  },
  {
    question: 'Should pre-loved running shoes be priced below retail?',
    answer:
      'Usually, yes. Brand-new and genuinely low-mileage pairs may stay closer to retail, while older pairs, higher-mileage shoes, and shoes with visible flaws generally need a lower and more buyer-friendly price.',
  },
  {
    question: 'Does running shoe mileage affect resale value?',
    answer:
      'Yes. Mileage helps buyers estimate outsole wear and how much useful life may remain in the midsole foam. Unknown mileage can also reduce buyer confidence, so an honest estimate is better than leaving usage unexplained.',
  },
  {
    question: 'Is the estimated resale price guaranteed?',
    answer:
      'No. The result is a practical starting point. Actual offers depend on the model, size, color, local demand, photos, authenticity evidence, current retail discounts, seller location, and buyer urgency.',
  },
] as const;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/price-guide' },
  keywords: [
    'running shoe price estimator Philippines',
    'how much to sell running shoes Philippines',
    'pre-loved running shoes Philippines',
    'second hand running shoes price',
    'used running shoes value',
    'Adidas running shoes resale price Philippines',
    'Nike running shoes resale price Philippines',
    'running shoes marketplace Philippines',
  ],
  openGraph: {
    title: `${title} | Go Pair PH`,
    description,
    url: '/price-guide',
    images: [image],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Go Pair PH`,
    description,
    images: [image],
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: priceGuideFaqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  })),
};

export default function PriceGuidePage() {
  return (
    <main className="overflow-x-hidden bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-[#020617]">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(45,212,191,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.45) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8">
          <div className="max-w-[22.5rem] sm:max-w-3xl">
            <p className="price-guide-step-mobile-hidden text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300 sm:text-xs">
              Running Shoe Sellability Guide
            </p>
            <h1 className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight text-gray-100 sm:mt-2 sm:text-4xl">
              Running Shoe Resale Price Calculator
            </h1>
            <p className="price-guide-step-mobile-hidden mt-2 max-w-xl text-xs leading-5 text-gray-400 sm:mt-3 sm:text-base sm:leading-7">
              Can&apos;t decide on the pricing? Get a live resale price range before listing.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-4 w-[22.5rem] max-w-[calc(100vw-2rem)] py-4 sm:mx-auto sm:w-auto sm:max-w-6xl sm:px-6 sm:py-6 lg:px-8">
        <PriceGuideForm />
      </section>

      <section className="mx-4 grid w-[22.5rem] max-w-[calc(100vw-2rem)] gap-4 pb-10 sm:mx-auto sm:w-auto sm:max-w-6xl sm:px-6 lg:grid-cols-3 lg:px-8">
        <InfoCard
          title="Built for sellers"
          body="Use the range as a starting point before listing. Your estimator details can carry into the listing so your notes do not go wasted."
        />
        <InfoCard
          title="Not a certified value"
          body="Photos, proof of purchase, demand, and buyer trust still matter. This is a practical guide, not a guarantee."
        />
      </section>

      <section className="border-t border-white/[0.08] bg-[#020617]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              Philippine resale guide
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-gray-100 sm:text-2xl">
              How to price used running shoes fairly
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base sm:leading-7">
              A fair asking price starts with what the pair actually cost in the Philippines, then accounts for wear and buyer confidence. Current retail discounts matter: if stores are selling the same model below SRP, buyers will compare your listing with that lower price.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <GuideStep
              number="1"
              title="Use a realistic retail price"
              body="Use the regular local price or a current official-store price, not an inflated marketplace SRP."
            />
            <GuideStep
              number="2"
              title="Deduct for use and age"
              body="Condition, mileage, release age, and visible flaws have the largest effect on the estimate."
            />
            <GuideStep
              number="3"
              title="Check buyer confidence"
              body="Clear photos, honest usage, the box, and proof of purchase can make your asking price easier to trust."
            />
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-white/[0.08]">
            <div className="border-b border-white/[0.08] bg-slate-900/70 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-100">Estimator starting ranges by condition</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                These percentages are the calculator&apos;s baseline before mileage, age, demand, selling speed, packaging, proof, and flaws are applied.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Condition</th>
                    <th className="px-4 py-3 font-semibold">Baseline from retail</th>
                    <th className="px-4 py-3 font-semibold">Typical description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] bg-slate-950/60 text-gray-300">
                  <PriceRangeRow condition="New" range="82% - 94%" description="Unused pair with no running mileage" />
                  <PriceRangeRow condition="Like New" range="62% - 78%" description="Very light wear and minimal signs of use" />
                  <PriceRangeRow condition="Good" range="42% - 62%" description="Normal runner use with useful life remaining" />
                  <PriceRangeRow condition="Fair" range="25% - 42%" description="Visible wear that is clearly shown and priced" />
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="text-lg font-extrabold text-gray-100">What can move the final price?</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-gray-400 sm:grid-cols-2">
                <GuidePoint text="Higher mileage and older foam usually lower the range." />
                <GuidePoint text="Popular models and useful sizes may attract more buyers." />
                <GuidePoint text="Visible outsole, upper, or midsole flaws should reduce the price." />
                <GuidePoint text="A receipt and clear authenticity evidence can improve trust." />
                <GuidePoint text="Current retail sales can make the original SRP less relevant." />
                <GuidePoint text="A sell-fast price is lower than a patient asking price." />
              </ul>
            </div>

            <aside className="rounded-lg border border-teal-400/20 bg-teal-400/[0.05] p-4">
              <h2 className="text-sm font-bold text-teal-100">How Go Pair PH calculates it</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                The estimator uses a transparent pricing model based on retail price and the details you provide. It is not yet a valuation based on completed Go Pair PH sales, and it does not certify authenticity or shoe safety.
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Compare the result with similar active listings and official-store discounts before publishing.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <Link href="/browse" className="text-teal-300 hover:text-teal-200">
                  Compare running shoes
                </Link>
                <Link href="/help/how-to-sell" className="text-teal-300 hover:text-teal-200">
                  Read the selling guide
                </Link>
              </div>
            </aside>
          </div>

          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-extrabold text-gray-100">Running shoe resale price questions</h2>
            <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {priceGuideFaqs.map(({ question, answer }) => (
                <details key={question} className="group py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-gray-200 marker:content-none">
                    <span>{question}</span>
                    <span aria-hidden="true" className="text-lg font-normal text-teal-300 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pb-4 pr-8 text-sm leading-6 text-gray-400">{answer}</p>
                </details>
              ))}
            </div>
          </div>

          <p className="mt-8 text-xs leading-5 text-gray-600">
            Prepared by the Go Pair PH marketplace team. Methodology reviewed June 18, 2026.
          </p>
        </div>
      </section>

    </main>
  );
}

function GuideStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="border-l-2 border-teal-400/40 pl-4">
      <p className="text-xs font-black text-teal-300">{number}</p>
      <h3 className="mt-1 text-sm font-bold text-gray-100">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}

function PriceRangeRow({ condition, range, description }: { condition: string; range: string; description: string }) {
  return (
    <tr>
      <th scope="row" className="whitespace-nowrap px-4 py-3 font-semibold text-gray-200">{condition}</th>
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-teal-300">{range}</td>
      <td className="px-4 py-3 text-gray-400">{description}</td>
    </tr>
  );
}

function GuidePoint({ text }: { text: string }) {
  return (
    <li className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
      <span>{text}</span>
    </li>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4">
      <h2 className="text-sm font-bold text-gray-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
    </div>
  );
}
