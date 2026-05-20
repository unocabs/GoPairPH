import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

export const metadata: Metadata = {
  title: 'How to Buy on Go Pair PH',
  description: 'Find running shoes from local sellers, nearby shops, and runners who serve Pampanga buyers.',
  alternates: { canonical: '/help/how-to-buy' },
};

type StepVisual = 'browse' | 'details' | 'message' | 'handoff' | 'saved';

const steps: ReadonlyArray<{
  number: string;
  title: string;
  text: string;
  icon: IconName;
  visual: StepVisual;
}> = [
  {
    number: '1',
    title: 'Browse Marketplace',
    text: 'Explore running shoes listed by community sellers and shops.',
    icon: 'search',
    visual: 'browse',
  },
  {
    number: '2',
    title: 'Check the Details',
    text: 'Review the size, condition, mileage, price, location, and seller information.',
    icon: 'form',
    visual: 'details',
  },
  {
    number: '3',
    title: 'Message the Seller',
    text: 'Contact the seller to ask questions, negotiate, or confirm availability.',
    icon: 'chat',
    visual: 'message',
  },
  {
    number: '4',
    title: 'Meet, Deliver, or Ship',
    text: 'Agree on a safe meetup, delivery, or shipping option that works for both sides.',
    icon: 'pin',
    visual: 'handoff',
  },
  {
    number: '5',
    title: 'Save or Track Pairs',
    text: 'Save listings you like and come back later before they get sold.',
    icon: 'heart',
    visual: 'saved',
  },
];

const tips: ReadonlyArray<{ title: string; icon: IconName }> = [
  { title: 'Check photos and shoe details carefully.', icon: 'camera' },
  { title: 'Ask for more photos if needed.', icon: 'chat' },
  { title: 'Confirm size, condition, and mileage before meeting.', icon: 'check' },
  { title: 'Meet in a safe public place when possible.', icon: 'pin' },
  { title: 'Avoid sending full payment before verifying the seller and item.', icon: 'shield' },
];

type IconName = 'search' | 'form' | 'chat' | 'pin' | 'heart' | 'camera' | 'check' | 'shield' | 'box' | 'truck';

const iconPaths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  form: (
    <>
      <path d="M8 6h9" />
      <path d="M8 12h9" />
      <path d="M8 18h5" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>
  ),
  chat: (
    <>
      <path d="M21 12a7.5 7.5 0 0 1-7.5 7.5H8l-5 2 1.6-4.4A7.5 7.5 0 1 1 21 12Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  heart: (
    <path d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 1 0-7.5 7.5L12 21l8.8-7.9a5.3 5.3 0 0 0 0-7.5Z" />
  ),
  camera: (
    <>
      <path d="M4 8h3l1.4-2h7.2L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13.5" r="3" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-5.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.8 8-11V5l-8-3-8 3v6c0 7.2 8 11 8 11Z" />
      <path d="m8.8 12 2.1 2.1 4.3-4.6" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v9H3V7Z" />
      <path d="M14 10h4l3 3v3h-7v-6Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
};

export default function HowToBuyPage() {
  return (
    <PageShell contentClassName="py-8 sm:py-10 lg:py-12">
      <HeroSection />

      <section className="mt-8 space-y-4 sm:mt-10">
        {steps.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}
      </section>

      <TipsSection />
    </PageShell>
  );
}

function HeroSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)] lg:items-center">
      <div>
        <Logo size="lg" />
        <h1 className="mt-8 max-w-3xl text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
          How to Buy on <span className="text-teal-300">Go Pair PH</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
          Find running shoes from local sellers, nearby shops, and runners who serve Pampanga buyers.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/browse"
            className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
          >
            Browse Pairs
          </Link>
          <Link
            href="/find-my-pair"
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-800 hover:text-gray-100"
          >
            Find My Pair
          </Link>
        </div>
      </div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  return (
    <SurfaceCard glow className="relative hidden overflow-hidden p-4 sm:p-5 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(20,184,166,0.16),transparent_32%)]" />
      <div className="relative rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <LogoMark size={30} />
          <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300">
            Featured Pair
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[130px_minmax(0,1fr)]">
          <ShoeMock />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Local seller</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-100">Nike Alphafly 3</h2>
            <p className="mt-1 text-sm text-gray-400">Like New · 10 km</p>
            <p className="mt-4 text-3xl font-extrabold text-teal-300">₱8,000</p>
            <Link
              href="/browse"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-400 sm:w-auto"
            >
              View Pair
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <span className="rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-gray-300">Condition: Like New</span>
          <span className="rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-gray-300">Mileage: 10 km</span>
        </div>
      </div>
    </SurfaceCard>
  );
}

function StepCard({ step }: { step: (typeof steps)[number] }) {
  return (
    <SurfaceCard
      as="article"
      hover
      className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center"
    >
      <div className="flex gap-4 lg:gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-slate-950 text-2xl font-extrabold tabular-nums text-teal-300 sm:h-14 sm:w-14">
          {step.number}
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-teal-400/30 bg-teal-400/10 text-teal-300">
            <Icon name={step.icon} className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold leading-tight text-gray-100 sm:text-2xl">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">{step.text}</p>
        </div>
      </div>

      <MockPanel type={step.visual} />
    </SurfaceCard>
  );
}

function MockPanel({ type }: { type: StepVisual }) {
  return (
    <div className="overflow-hidden rounded-xl border border-teal-400/35 bg-slate-950/70 shadow-[0_18px_55px_rgba(0,0,0,0.28),0_0_42px_rgba(20,184,166,0.06)]">
      <MockTopBar />
      <div className="p-4 sm:p-5">
        {type === 'browse' && <BrowseMock />}
        {type === 'details' && <DetailsMock />}
        {type === 'message' && <MessageMock />}
        {type === 'handoff' && <HandoffMock />}
        {type === 'saved' && <SavedMock />}
      </div>
    </div>
  );
}

function MockTopBar() {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.08] bg-slate-900/60 px-4 py-3">
      <Logo size="sm" />
      <div className="hidden items-center gap-4 text-[11px] font-medium text-gray-500 sm:flex">
        <span>Browse</span>
        <span>Shops</span>
        <span>Find My Pair</span>
      </div>
      <span className="rounded-lg bg-teal-500 px-2.5 py-1 text-[10px] font-bold text-white">Browse</span>
    </div>
  );
}

function BrowseMock() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-100">Browse Marketplace</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {['Search', 'Brand', 'Size', 'Condition'].map((filter) => (
          <div key={filter} className="rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-gray-500">
            {filter}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {['Nike Alphafly 3', 'Adidas Adios Pro 3', 'Saucony Endorphin Pro'].map((pair, index) => (
          <div key={pair} className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-3">
            <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950">
              <ShoeTiny index={index} />
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-gray-100">{pair}</p>
            <p className="mt-1 text-xs text-gray-500">Like New · US 9</p>
            <p className="mt-2 text-sm font-bold text-teal-300">₱8,000</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsMock() {
  const details = [
    ['Price', '₱8,000'],
    ['Size', 'US 9 / 26.5cm'],
    ['Condition', 'Like New'],
    ['Mileage', '10 km'],
    ['Location', 'San Fernando'],
    ['Seller', 'Verified runner'],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
      <ShoeMock />
      <div>
        <h3 className="text-lg font-bold text-gray-100">Nike Alphafly 3</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2">
              <p className="text-[11px] font-medium text-gray-500">{label}</p>
              <p className="mt-1 text-xs font-semibold text-gray-200">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageMock() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-gray-100">Message Seller</h3>
      <div className="mt-4 space-y-3">
        <div className="mr-8 rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 text-sm text-gray-300">
          Hi! Available pa yung Alphafly 3?
        </div>
        <div className="ml-8 rounded-2xl rounded-tr-sm bg-teal-500 px-4 py-3 text-sm font-medium text-white">
          Yes available. Like new, 10 km only.
        </div>
        <div className="mr-8 rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 text-sm text-gray-300">
          Pwede meetup sa Clark this weekend?
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-gray-800 bg-slate-950 px-3 py-2 text-xs text-gray-500">
        Ask questions before committing.
      </div>
    </div>
  );
}

function HandoffMock() {
  const options: ReadonlyArray<{ title: string; body: string; icon: IconName }> = [
    { title: 'Meetup', body: 'Public place', icon: 'pin' },
    { title: 'Delivery', body: 'Local handoff', icon: 'box' },
    { title: 'Shipping', body: 'Agree on courier', icon: 'truck' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-100">Choose a safe option</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <div key={option.title} className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
            <Icon name={option.icon} className="h-6 w-6 text-teal-300" />
            <p className="mt-3 text-sm font-semibold text-gray-100">{option.title}</p>
            <p className="mt-1 text-xs text-gray-500">{option.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/[0.06] px-4 py-3 text-sm leading-6 text-teal-100">
        Keep payment, meetup, and shipping details clear before the exchange.
      </p>
    </div>
  );
}

function SavedMock() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-100">Saved Pairs</h3>
      <div className="mt-4 space-y-3">
        {['Nike Alphafly 3', 'Adidas Adios Pro 3'].map((pair, index) => (
          <div key={pair} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-slate-900/70 p-3">
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950">
              <ShoeTiny index={index} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-100">{pair}</p>
              <p className="mt-1 text-xs text-gray-500">US 9 · Like New</p>
            </div>
            <span className="rounded-full bg-green-500/15 px-2 py-1 text-[10px] font-bold text-green-300">Active</span>
            <Icon name="heart" className="h-5 w-5 text-teal-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsSection() {
  return (
    <SurfaceCard as="section" glow className="mt-8 p-5 sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">
        Tips for Buying Safely
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tips.map((tip) => (
          <div key={tip.title} className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-4 transition-colors hover:border-teal-400/30">
            <Icon name={tip.icon} className="h-6 w-6 text-teal-300" />
            <p className="mt-3 text-sm leading-6 text-gray-300">{tip.title}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function ShoeMock() {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950">
      <div className="absolute left-5 right-4 top-14 h-9 rounded-full bg-slate-950/80 shadow-[0_18px_30px_rgba(0,0,0,0.45)]" />
      <div className="absolute left-4 top-9 h-9 w-24 -rotate-6 rounded-[999px_999px_999px_24px] border border-teal-300/40 bg-gray-200 shadow-[0_18px_36px_rgba(45,212,191,0.22)]" />
      <div className="absolute left-12 top-12 h-2 w-12 -rotate-6 rounded-full bg-lime-300/80" />
    </div>
  );
}

function ShoeTiny({ index }: { index: number }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-[18%] right-[16%] top-[55%] h-4 rounded-full bg-slate-950/80" />
      <div className={`absolute left-[18%] top-[38%] h-5 w-[58%] -rotate-6 rounded-full ${index === 1 ? 'bg-gray-200' : index === 2 ? 'bg-amber-100' : 'bg-slate-200'}`} />
      <div className="absolute left-[36%] top-[45%] h-1.5 w-[34%] -rotate-6 rounded-full bg-teal-300/80" />
    </div>
  );
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {iconPaths[name]}
    </svg>
  );
}
