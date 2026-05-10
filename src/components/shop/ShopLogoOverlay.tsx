import Image from 'next/image';
import Link from 'next/link';
import { getPublicUrl } from '@/lib/utils';
import type { Shop } from '@/types';

type Size = 'sm' | 'lg';

interface ShopLogoOverlayProps {
  shop: Pick<Shop, 'slug' | 'name' | 'logo_storage_path'>;
  size?: Size;
  /** When true, renders as a div (no Link). Used inside cards already wrapped in <Link>. */
  asDiv?: boolean;
}

const DIMS: Record<Size, { px: number; classes: string }> = {
  sm: { px: 28, classes: 'h-7 w-7 top-1.5 left-1.5' },
  lg: { px: 56, classes: 'h-14 w-14 top-3 left-3' },
};

export function ShopLogoOverlay({ shop, size = 'lg', asDiv = false }: ShopLogoOverlayProps) {
  if (!shop.logo_storage_path) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos');
  const dims = DIMS[size];

  const inner = (
    <span
      className={`absolute z-10 inline-flex ${dims.classes} items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-lg`}
      title={shop.name}
    >
      <Image
        src={url}
        alt={shop.name}
        width={dims.px * 2}
        height={dims.px * 2}
        className="h-full w-full object-cover"
        unoptimized
      />
    </span>
  );

  if (asDiv) return inner;

  return (
    <Link
      href={`/shop/${shop.slug}`}
      aria-label={`Visit ${shop.name}`}
      className="contents"
    >
      {inner}
    </Link>
  );
}
