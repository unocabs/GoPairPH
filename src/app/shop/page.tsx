export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicUrl } from '@/lib/utils';
import { ApplyShopModalTrigger } from './ApplyShopModalTrigger';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { Shop } from '@/types';

export const metadata: Metadata = {
  title: 'Shops — Go Pair PH',
  description: 'Browse running shoe shops and independent resellers that serve Pampanga buyers on Go Pair PH.',
  alternates: { canonical: '/shop' },
};

async function getShops(): Promise<Pick<Shop, 'id' | 'slug' | 'name' | 'logo_storage_path' | 'location'>[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shops')
    .select('id, slug, name, logo_storage_path, location')
    .eq('status', 'active')
    .order('name');
  return (data ?? []) as Pick<Shop, 'id' | 'slug' | 'name' | 'logo_storage_path' | 'location'>[];
}

export default async function ShopsIndexPage() {
  const shops = await getShops();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Storefronts"
        title="Shops"
        subtitle="Running shoe shops and independent resellers that serve Pampanga buyers."
        actions={<ApplyShopModalTrigger />}
      />

      {shops.length === 0 ? (
        <SurfaceCard className="border-dashed p-10 text-center">
          <p className="text-sm text-gray-400">No shops yet — be the first.</p>
          <div className="mt-4">
            <ApplyShopModalTrigger />
          </div>
        </SurfaceCard>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(shop => {
            const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos') : null;
            return (
              <li key={shop.id}>
                <Link
                  href={`/shop/${shop.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-slate-900/72 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-teal-400/35 hover:bg-slate-900/86"
                >
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={shop.name}
                      width={96}
                      height={96}
                      className="h-12 w-12 rounded-xl bg-white object-cover border border-gray-700"
                      unoptimized
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center text-white text-lg font-bold">
                      {shop.name[0]?.toUpperCase() ?? 'S'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-100 truncate">{shop.name}</p>
                    {shop.location && <p className="text-xs text-gray-500 mt-0.5 truncate">{shop.location}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <SurfaceCard className="mt-8 border-teal-500/20 bg-teal-500/[0.04] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
              Price Check
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-100">
              Checking retail prices?
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
              Compare official brand running shoe pages before buying pre-loved pairs
              from Go Pair PH sellers.
            </p>
          </div>
          <Link
            href="/official-running-shoe-brand-links-ph"
            className="inline-flex w-full items-center justify-center rounded-lg border border-teal-400/35 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/10 sm:w-auto"
          >
            View official brand links
          </Link>
        </div>
      </SurfaceCard>
    </PageShell>
  );
}
