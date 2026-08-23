import type { MetadataRoute } from 'next';
import { canIndexSite, siteUrl } from '../lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!canIndexSite) return [];

  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/music`, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${siteUrl}/artists/middle-child`, changeFrequency: 'monthly', priority: 0.95 },
    { url: `${siteUrl}/never-alone`, lastModified: new Date('2026-07-31T00:00:00-05:00'), changeFrequency: 'monthly', priority: 0.95 },
    { url: `${siteUrl}/mercy`, lastModified: new Date('2026-08-23T00:00:00-05:00'), changeFrequency: 'monthly', priority: 0.92 },
    { url: `${siteUrl}/licensing`, changeFrequency: 'monthly', priority: 0.88 },
    { url: `${siteUrl}/playlists`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/submit`, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${siteUrl}/press`, changeFrequency: 'monthly', priority: 0.65 },
    { url: `${siteUrl}/brand`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/experience`, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
