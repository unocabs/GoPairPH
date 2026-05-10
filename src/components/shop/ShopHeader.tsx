import Image from 'next/image';
import { getPublicUrl } from '@/lib/utils';
import { ShopLogoUploader } from '@/components/shop/ShopLogoUploader';
import type { Shop } from '@/types';

interface ShopHeaderProps {
  shop: Shop;
  listingCount: number;
  isOwner?: boolean;
}

export function ShopHeader({ shop, listingCount, isOwner = false }: ShopHeaderProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos') : null;

  return (
    <section className="relative overflow-hidden border-b border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* Logo */}
          <div className="shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={shop.name}
                width={112}
                height={112}
                className="h-20 w-20 sm:h-28 sm:w-28 rounded-2xl border-2 border-white/10 bg-white object-cover shadow-xl"
                unoptimized
              />
            ) : (
              <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-2xl bg-teal-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl">
                {shop.name[0]?.toUpperCase() ?? 'S'}
              </div>
            )}
            {isOwner && <ShopLogoUploader shopId={shop.id} currentLogoPath={shop.logo_storage_path} />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Shop
              </span>
              <span className="text-xs text-gray-500">{listingCount} listing{listingCount === 1 ? '' : 's'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-100 tracking-tight">{shop.name}</h1>
            {shop.location && (
              <p className="mt-1.5 text-sm text-gray-400 inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {shop.location}
              </p>
            )}
            {shop.about && (
              <p className="mt-3 max-w-2xl text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{shop.about}</p>
            )}
            {shop.fb_page_url && (
              <a
                href={shop.fb_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
                Facebook page
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
