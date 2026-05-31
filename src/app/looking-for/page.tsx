export const dynamic = 'force-dynamic';

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { WishlistGrid } from '@/components/wishlist/WishlistGrid';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { WishlistItem } from '@/types';

export const metadata: Metadata = {
  title: 'Looking For Shoes',
  description: 'Looking for a specific running shoe? Post what you\'re looking for and let the community drop available links from Go Pair PH, Facebook Marketplace, shop pages, and more.',
  alternates: { canonical: '/looking-for' },
};

async function getLookingForPosts(): Promise<WishlistItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('wishlist_items')
    .select('*, wishlist_images(*), wishlist_offers(count)')
    .order('created_at', { ascending: false })
    .limit(60);
  return (data as WishlistItem[]) ?? [];
}

export default async function LookingForPage() {
  const items = await getLookingForPosts();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Demand board"
        title="Looking For Shoes"
        subtitle="Looking for a specific running shoe? Post what you're looking for and let the community drop available links."
        actions={
          <Link href="/looking-for/new">
            <Button>Post what you&apos;re looking for</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard glow className="p-6 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
              How it works
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-100">
              Tell local sellers what you need.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Posting what you&apos;re looking for creates demand signals, so runners and Central Luzon or NCR sellers know what to list next.
            </p>
          </div>
          <div className="space-y-4">
            {[
              ['1', 'Post what you\'re looking for', 'Share the model, size, budget, and location.'],
              ['2', 'Sellers reach out', 'The community can drop available links or offers.'],
              ['3', 'Meet, deal, run', 'Coordinate safely and complete the deal directly.'],
            ].map(([step, title, body]) => (
              <div key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-300 ring-1 ring-teal-400/25">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-100">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/looking-for/new" className="mt-6 block">
            <Button className="w-full">Post what you&apos;re looking for</Button>
          </Link>
        </SurfaceCard>

        <div className="min-w-0">
          <WishlistGrid items={items} />
        </div>
      </div>
    </PageShell>
  );
}
