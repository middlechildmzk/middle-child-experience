import type { MetadataRoute } from 'next';
import { canIndexSite, siteUrl } from '../lib/site-url';

export default function robots(): MetadataRoute.Robots {
  if (!canIndexSite) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
