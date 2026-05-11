export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicUrl } from '@/lib/utils';
import { ApplyShopModalTrigger } from './ApplyShopModalTrigger';
import type { Shop } from '@/types';

export const metadata: Metadata = {
  title: 'Shops — Go Pair PH',
  description: 'Browse running shoe shops and independent resellers in Pampanga on Go Pair PH.',
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Shops</h1>
          <p className="mt-1 text-sm text-gray-500">Pampanga running shoe shops and independent resellers on Go Pair PH.</p>
        </div>
        <ApplyShopModalTrigger />
      </div>

      {shops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/50 p-10 text-center">
          <p className="text-sm text-gray-400">No shops yet — be the first.</p>
          <div className="mt-4">
            <ApplyShopModalTrigger />
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(shop => {
            const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos') : null;
            return (
              <li key={shop.id}>
                <Link
                  href={`/shop/${shop.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all hover:border-teal-700 hover:bg-gray-800/60"
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
    </div>
  );
}
