import Link from 'next/link';
import Image from 'next/image';
import { getPublicUrl } from '@/lib/utils';
import type { Shop } from '@/types';

interface ShopBadgeProps {
  shop: Pick<Shop, 'slug' | 'name' | 'logo_storage_path'>;
  /** "Sold by <Shop>" pill (default) or just the chip-style logo+name. */
  variant?: 'sold-by' | 'chip';
}

export function ShopBadge({ shop, variant = 'sold-by' }: ShopBadgeProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const logoUrl = shop.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path) : null;

  return (
    <Link
      href={`/shop/${shop.slug}`}
      className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-colors"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={shop.name}
          width={32}
          height={32}
          className="h-4 w-4 rounded-full object-cover bg-white"
          unoptimized
        />
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 3l9 6.75M5 10v9a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1v-9" />
        </svg>
      )}
      <span>{variant === 'sold-by' ? `${shop.name}` : shop.name}</span>
    </Link>
  );
}
