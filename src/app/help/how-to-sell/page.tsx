import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { CanListWidget } from '@/components/listings/CanListWidget';

export const metadata: Metadata = {
  title: 'How to Sell on Go Pair PH',
  description: 'List your running shoes in minutes and connect with Central Luzon and NCR runners on Go Pair PH.',
  alternates: { canonical: '/help/how-to-sell' },
};

type StepVisual = 'signin' | 'upload' | 'details' | 'share' | 'sold';

const steps: ReadonlyArray<{
  number: string;
  title: string;
  text: string;
  icon: IconName;
  visual: StepVisual;
}> = [
  {
    number: '1',
    title: 'Sign In',
    text: 'Continue with Google to create your account or sign in.',
    icon: 'user',
    visual: 'signin',
  },
  {
    number: '2',
    title: 'Create Your Listing',
    text: "Click '+ List a Shoe' and upload clear photos of your running shoes.",
    icon: 'shoe',
    visual: 'upload',
  },
  {
    number: '3',
    title: 'Add Details',
    text: 'Add brand, model, size, condition, mileage, price, and location.',
    icon: 'form',
    visual: 'details',
  },
  {
    number: '4',
    title: 'Share Your Listing',
    text: 'Publish your listing and share it to Facebook groups with one click.',
    icon: 'send',
    visual: 'share',
  },
  {
    number: '5',
    title: 'Meet & Mark as Sold',
    text: 'Meet up or ship your shoes. Once sold, mark your listing as sold.',
    icon: 'check',
    visual: 'sold',
  },
];

const tips: ReadonlyArray<{ title: string; icon: IconName }> = [
  { title: 'Use clear photos from multiple angles.', icon: 'camera' },
  { title: 'Provide accurate details and mileage.', icon: 'form' },
  { title: 'Mention meetup locations.', icon: 'pin' },
  { title: 'Include original box and accessories if available.', icon: 'box' },
  { title: 'Respond quickly to interested buyers.', icon: 'chat' },
];

const sellerBenefits: ReadonlyArray<{
  title: string;
  text: string;
  icon: IconName;
}> = [
  {
    title: 'List once, share anywhere',
    text: 'Create one clean pair link, then share it to FB groups, Facebook Marketplace, Messenger, or friends.',
    icon: 'send',
  },
  {
    title: 'Cleaner than a normal FB post',
    text: 'Buyers can check photos, size, condition, mileage, price, and location in one place.',
    icon: 'form',
  },
  {
    title: 'Built for runners',
    text: 'Go Pair PH is focused on running shoes, not random marketplace items.',
    icon: 'shoe',
  },
  {
    title: 'Easier for serious buyers',
    text: 'Runners can browse by brand, size, and condition, then save pairs they like.',
    icon: 'check',
  },
  {
    title: 'Looks more trustworthy',
    text: 'A clean pair page and seller profile help buyers decide faster.',
    icon: 'user',
  },
  {
    title: 'Your pair is easier to revisit',
    text: 'FB posts can get buried, but your Go Pair PH link stays easy to share again.',
    icon: 'chat',
  },
];

type IconName = 'user' | 'shoe' | 'form' | 'send' | 'check' | 'camera' | 'pin' | 'box' | 'chat';

const iconPaths: Record<IconName, React.ReactNode> = {
  user: (
    <>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  shoe: (
    <path d="M4 14.5c3.2.2 5.6-1.2 7.2-4.2l2 1.8c1.4 1.2 3.3 2 5.2 2.2l1.8.2c.8.1 1.4.8 1.4 1.6v1.4H4v-3Z" />
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
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-5.4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.4-2h7.2L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13.5" r="3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
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
};

export default function HowToSellPage() {
  return (
    <PageShell contentClassName="py-6 sm:py-10 lg:py-12">
      <HeroSection />

      <SellerBenefitsSection />

      <div className="mt-8 sm:mt-10">
        <CanListWidget showCta />
      </div>

      <section className="mt-8 space-y-4 sm:mt-10">
        {steps.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}
      </section>

      <TipsSection />
    </PageShell>
  );
}

function SellerBenefitsSection() {
  return (
    <SurfaceCard as="section" glow className="relative mt-6 overflow-hidden p-4 sm:mt-10 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.12),transparent_34%)]" />
      <div className="relative">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300 sm:text-xs sm:tracking-[0.2em]">
              Seller benefits
            </p>
            <h2 className="mt-2 text-xl font-extrabold leading-snug tracking-tight text-gray-100 sm:mt-3 sm:text-3xl sm:leading-tight">
              Why add your running shoes on Go Pair PH?
            </h2>
            <p className="mt-2 text-sm leading-5 text-gray-400 sm:mt-3 sm:text-base sm:leading-7">
              Use Go Pair PH as a clean seller page, then keep sharing your pair wherever your buyers already are.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <Link
              href="/listings/new"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400 sm:px-4 sm:py-2.5"
            >
              List Your Running Shoes
            </Link>
            <Link
              href="/browse"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 bg-slate-950/60 px-3.5 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-800 hover:text-gray-100 sm:px-4 sm:py-2.5"
            >
              See GP Marketplace
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {sellerBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3 transition-colors hover:border-teal-400/30 hover:bg-slate-950/65 sm:p-4"
            >
              <div className="flex gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-400/30 bg-teal-400/10 text-teal-300 sm:h-10 sm:w-10">
                  <Icon name={benefit.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-bold leading-snug text-gray-100 sm:text-sm">{benefit.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-gray-400 sm:mt-1.5 sm:text-sm sm:leading-6">{benefit.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}

function HeroSection() {
  return (
    <section className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)] lg:items-center">
      <div>
        <Logo size="lg" />
        <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-gray-100 sm:mt-8 sm:text-5xl lg:text-6xl">
          How to Sell on <span className="text-teal-300">Go Pair PH</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 sm:mt-5 sm:text-lg sm:leading-8">
          List your running shoes in minutes and connect with Central Luzon and NCR runners.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7 sm:gap-3">
          <Link
            href="/listings/new"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400 sm:px-5 sm:py-3"
          >
            + List a Shoe
          </Link>
          <Link
            href="/browse"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-800 hover:text-gray-100 sm:px-5 sm:py-3"
          >
            See GP Marketplace
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(20,184,166,0.16),transparent_32%)]" />
      <div className="relative rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <LogoMark size={30} />
          <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300">
            Live Pair
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[130px_minmax(0,1fr)]">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950">
            <div className="absolute left-5 right-4 top-14 h-9 rounded-full bg-slate-950/80 shadow-[0_18px_30px_rgba(0,0,0,0.45)]" />
            <div className="absolute left-4 top-9 h-9 w-24 -rotate-6 rounded-[999px_999px_999px_24px] border border-teal-300/40 bg-gray-200 shadow-[0_18px_36px_rgba(45,212,191,0.22)]" />
            <div className="absolute left-12 top-12 h-2 w-12 -rotate-6 rounded-full bg-lime-300/80" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Featured example</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-100">Nike Alphafly 3</h2>
            <p className="mt-1 text-sm text-gray-400">Like New · US 9 · 10 km</p>
            <p className="mt-4 text-3xl font-extrabold text-teal-300">₱8,000</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span className="rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-gray-300">San Fernando</span>
              <span className="rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-gray-300">Share ready</span>
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-xl border border-teal-500/20 bg-teal-500/[0.06] px-4 py-3 text-sm leading-6 text-teal-100">
          A clean pair page helps buyers see the details faster.
        </p>
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
        {type === 'signin' && <SignInMock />}
        {type === 'upload' && <UploadMock />}
        {type === 'details' && <DetailsMock />}
        {type === 'share' && <ShareMock />}
        {type === 'sold' && <SoldMock />}
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
        <span>Guides</span>
      </div>
      <span className="rounded-lg bg-teal-500 px-2.5 py-1 text-[10px] font-bold text-white">+ List a Shoe</span>
    </div>
  );
}

function SignInMock() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-white/[0.08] bg-slate-900/70 p-5">
      <h3 className="text-lg font-bold text-gray-100">Welcome back!</h3>
      <p className="mt-1 text-xs text-gray-500">Sign in to continue</p>
      <button className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-900">
        <span className="font-bold text-blue-600">G</span>
        Continue with Google
      </button>
      <p className="mt-4 text-xs leading-5 text-gray-500">By continuing, you agree to our Terms and Privacy Policy.</p>
    </div>
  );
}

function UploadMock() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-100">Create New Listing</h3>
      <p className="mt-1 text-xs text-gray-500">Upload up to 6 photos</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="aspect-square rounded-lg border border-white/[0.08] bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 p-2">
            <div className="mt-7 h-5 rounded-full bg-slate-950/80" />
            <div className="mx-auto -mt-3 h-7 w-16 -rotate-6 rounded-full bg-gray-200 shadow-[0_12px_22px_rgba(45,212,191,0.18)]" />
          </div>
        ))}
        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-700 bg-slate-900/60 text-center text-xs text-gray-500">
          +<br />Upload more
        </div>
      </div>
    </div>
  );
}

function DetailsMock() {
  const fields = [
    ['Brand', 'Nike'],
    ['Model', 'Alphafly 3'],
    ['Size', 'US 9 / 26.5cm'],
    ['Condition', 'Like New'],
    ['Mileage', '10 km'],
    ['Price', '₱8,000'],
    ['Location', 'San Fernando, Pampanga'],
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-100">Shoe Details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className={label === 'Location' ? 'lg:col-span-2' : ''}>
            <p className="text-[11px] font-medium text-gray-500">{label}</p>
            <div className="mt-1 rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs font-medium text-gray-200">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareMock() {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
      <div>
        <h3 className="text-sm font-semibold text-gray-100">Your listing is ready!</h3>
        <p className="mt-1 text-xs text-gray-500">Get more visibility by sharing to FB groups.</p>
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-900/70 p-3">
          <div className="flex gap-3">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-slate-700 to-teal-950" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-100">Nike Alphafly 3</p>
              <p className="mt-1 text-xs text-gray-500">Like New · US 9 · 10 km</p>
              <p className="mt-2 font-bold text-teal-300">₱8,000</p>
            </div>
          </div>
          <button className="mt-4 w-full rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold text-white">
            Post on FB Group
          </button>
        </div>
      </div>
      <div className="mx-auto w-32 rounded-[2rem] border border-gray-700 bg-gray-950 p-2 shadow-2xl">
        <div className="rounded-[1.5rem] bg-white p-2 text-gray-900">
          <p className="text-xs font-bold">facebook</p>
          {['Pampanga Runners', 'Pampanga Shoes Buy and Sell', 'Go Pair PH'].map((group) => (
            <div key={group} className="mt-2 flex items-center justify-between rounded-md bg-gray-100 p-1.5">
              <span className="max-w-[72px] truncate text-[9px] font-medium">{group}</span>
              <span className="h-3 w-3 rounded-full bg-teal-500" />
            </div>
          ))}
          <div className="mt-2 rounded-md bg-teal-500 py-1 text-center text-[9px] font-bold text-white">Post</div>
        </div>
      </div>
    </div>
  );
}

function SoldMock() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-100">Your Listing</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
        <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-slate-900/70 p-3">
          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-slate-700 to-teal-950" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-gray-100">Nike Alphafly 3</p>
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-300">Active</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Like New · US 9 · 10 km</p>
            <p className="mt-2 font-bold text-teal-300">₱8,000</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-2 text-sm text-gray-300">
          {['Mark as Sold', 'Edit Listing', 'Delete Listing'].map((action) => (
            <div key={action} className="rounded-lg px-3 py-2 hover:bg-slate-800">{action}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipsSection() {
  return (
    <SurfaceCard as="section" glow className="mt-8 p-5 sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">
        Tips for Selling Faster
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
