import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'This Go Pair PH page could not be found.',
};

export default function NotFound() {
  return (
    <PageShell contentClassName="flex min-h-[calc(100vh-11rem)] items-center py-10 sm:py-14 lg:py-16">
      <SurfaceCard glow className="relative w-full overflow-hidden border-teal-500/20 bg-slate-950/72">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 14% 18%, rgba(20,184,166,0.14), transparent 34%), radial-gradient(circle at 84% 20%, rgba(45,212,191,0.08), transparent 28%)',
          }}
        />
        <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center lg:p-8">
          <div className="order-2 lg:order-1">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
              <LogoMark size={24} />
              404 route check
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">
              Missing pair alert
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl">
              This page ran off for a tempo run.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              The link you followed may be old, moved, or unlaced. Let&apos;s get you
              back to a clean route through Go Pair PH.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/browse">
                <Button size="lg" className="w-full sm:w-auto">
                  Browse Marketplace
                </Button>
              </Link>
              <Link href="/help/how-to-buy">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  How to Buy
                </Button>
              </Link>
              <Link href="/help/how-to-sell">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  How to Sell
                </Button>
              </Link>
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-900/50 p-4">
              <p className="text-sm text-gray-400">
                Still chasing a specific pair?
              </p>
              <Link
                href="/find-my-pair"
                className="mt-2 inline-flex text-sm font-semibold text-teal-300 transition-colors hover:text-teal-200"
              >
                Post or browse pair requests
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <Image
                src="/404-runaway-pair.png"
                alt="A running shoe dashing away on a neon night route"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="h-auto w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200 backdrop-blur-md">
                Pair last seen sprinting
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </PageShell>
  );
}
