import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maarej.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Backend proxies are never meant for search engines.
          '/api/',
          // Private / authenticated surfaces must not be indexed. Trailing
          // slashes keep the private /teacher and /center dashboards from
          // ever shadowing the public /teachers and /centers listings.
          '/dashboard/',
          '/admin/',
          '/center/',
          '/teacher/',
          '/student/',
          '/parent/',
          '/profile/',
          '/notifications/',
          // Utility / session routes.
          '/login',
          '/register',
          '/search',
          '/change-password',
          '/reset-password',
          '/forgot-password',
          '/centers/register',
          // Filtered / paginated variants of the public listings. The bare
          // /teachers and /centers URLs stay crawlable; a trailing '?' matches
          // every URL that carries a query string.
          '/teachers?',
          '/centers?',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}