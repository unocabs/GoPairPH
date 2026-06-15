export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { Shop } from '@/types';

export const metadata: Metadata = {
  title: 'Shops — Go Pair PH',
  description: 'Browse selected running shoe sellers with dedicated Go Pair PH pages.',
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
        eyebrow="Selected sellers"
        title="Shops"
        subtitle="Some approved sellers may have dedicated Go Pair PH pages, while the marketplace stays focused on clean running shoe listings."
      />

      {shops.length === 0 ? (
        <SurfaceCard className="border-dashed p-10 text-center">
          <p className="text-sm text-gray-400">No selected seller pages are public yet.</p>
        </SurfaceCard>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(shop => {
            const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos', IMAGE_TRANSFORM_PRESETS.shopLogo) : null;
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
    </PageShell>
  );
}
