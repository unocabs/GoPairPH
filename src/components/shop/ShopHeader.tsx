import { getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { getShopTheme } from '@/lib/shopTheme';
import { getFacebookContactUrl } from '@/lib/facebook';
import { SafeShopImage } from '@/components/shop/SafeShopImage';
import type { Shop } from '@/types';

interface ShopHeaderProps {
  shop: Shop;
  listingCount: number;
}

export function ShopHeader({ shop, listingCount }: ShopHeaderProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos', IMAGE_TRANSFORM_PRESETS.shopLogo) : null;
  const headerUrl = shop.header_image_storage_path ? getPublicUrl(supabaseUrl, shop.header_image_storage_path, 'shop-logos', IMAGE_TRANSFORM_PRESETS.shopHeader) : null;
  const hasCustomHeader = Boolean(headerUrl);
  const theme = getShopTheme(shop.background_color, shop.accent_color);
  const facebookUrl = getFacebookContactUrl(shop.fb_page_url);

  return (
    <section
      className="relative overflow-hidden border-b bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/30"
      style={{ backgroundColor: theme.background, borderColor: theme.border }}
    >
      {hasCustomHeader && (
        <div className="absolute inset-0">
          <SafeShopImage
            src={headerUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
            fallbackClassName="opacity-60"
            logoSize={96}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.overlay} 0%, ${theme.overlay} 44%, rgba(0,0,0,0.24) 100%)` }} />
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid items-center gap-6 md:grid-cols-[136px_minmax(0,720px)_1fr]">
          {/* Logo */}
          <div className="shrink-0">
            {logoUrl ? (
              <SafeShopImage
                src={logoUrl}
                alt={shop.name}
                className="h-24 w-24 rounded-2xl border-2 bg-white object-cover shadow-2xl sm:h-32 sm:w-32"
                fallbackClassName="h-24 w-24 rounded-2xl border-2 shadow-2xl sm:h-32 sm:w-32"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold shadow-2xl sm:h-32 sm:w-32" style={{ backgroundColor: theme.accent, color: theme.accentText }}>
                {shop.name[0]?.toUpperCase() ?? 'S'}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.accent }}>
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Shop
              </span>
              <span className="text-xs" style={{ color: theme.mutedText }}>{listingCount} listing{listingCount === 1 ? '' : 's'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ color: theme.text }}>{shop.name}</h1>
            {shop.location && (
              <p className="mt-2 text-sm inline-flex items-center gap-1.5" style={{ color: theme.mutedText }}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {shop.location}
              </p>
            )}
            {shop.about && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed whitespace-pre-wrap" style={{ color: theme.text }}>{shop.about}</p>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
                Facebook page
              </a>
            )}
          </div>
          <div className="hidden h-px md:block" />
        </div>
      </div>
    </section>
  );
}
