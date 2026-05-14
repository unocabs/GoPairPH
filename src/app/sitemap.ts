import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getAbsoluteListingUrl } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/browse`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/wishlist`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/carbon-plated-running-shoes-ph`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/adidas-running-shoes-pampanga`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/safety`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Active listings
  let listingRoutes: MetadataRoute.Sitemap = [];
  let shopRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient();
    const [{ data: listings }, { data: shops }] = await Promise.all([
      supabase
        .from('shoes')
        .select('id, slug, updated_at')
        .eq('status', 'active')
        .limit(1000),
      supabase
        .from('shops')
        .select('slug, updated_at')
        .eq('status', 'active')
        .limit(1000),
    ]);

    listingRoutes = (listings ?? []).map(shoe => ({
      url: getAbsoluteListingUrl(SITE_URL, shoe),
      lastModified: shoe.updated_at ? new Date(shoe.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
    shopRoutes = (shops ?? []).flatMap(shop => {
      const lastModified = shop.updated_at ? new Date(shop.updated_at) : now;
      return [
        {
          url: `${SITE_URL}/shop/${shop.slug}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        },
        {
          url: `${SITE_URL}/shop/${shop.slug}/listings`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        },
      ];
    });
  } catch {
    // If Supabase is unreachable at build time, the static routes still get indexed
  }

  return [...staticRoutes, ...shopRoutes, ...listingRoutes];
}
