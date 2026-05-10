'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { getPublicUrl } from '@/lib/utils';
import { ApplyShopModal } from '@/components/shop/ApplyShopModal';
import type { Shop } from '@/types';

type ShopLite = Pick<Shop, 'id' | 'slug' | 'name' | 'logo_storage_path'>;

export function ShopsDropdown() {
  const [open, setOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [shops, setShops] = useState<ShopLite[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('shops')
        .select('id, slug, name, logo_storage_path')
        .eq('status', 'active')
        .order('name');
      if (active) setShops((data as ShopLite[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          aria-expanded={open}
        >
          Shops
          <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl py-2">
            {shops === null ? (
              <p className="px-3 py-2 text-xs text-gray-500">Loading…</p>
            ) : shops.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">No shops yet — be the first.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {shops.map(shop => {
                  const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos') : null;
                  return (
                    <li key={shop.id}>
                      <Link
                        href={`/shop/${shop.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors"
                      >
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt={shop.name}
                            width={32}
                            height={32}
                            className="h-7 w-7 rounded-full bg-white object-cover border border-gray-700"
                            unoptimized
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                            {shop.name[0]?.toUpperCase() ?? 'S'}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-200 truncate">{shop.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="my-1 border-t border-gray-800" />
            <button
              onClick={() => {
                setOpen(false);
                setApplyOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-teal-400 hover:bg-gray-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Register your shop
            </button>
          </div>
        )}
      </div>

      {applyOpen && <ApplyShopModal onClose={() => setApplyOpen(false)} />}
    </>
  );
}
