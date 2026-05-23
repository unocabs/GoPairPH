import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/profile', '/listings/new', '/listings/*/edit', '/looking-for/new', '/find-my-pair/new', '/wishlist/new'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`, 
    host: SITE_URL,
  };
}
