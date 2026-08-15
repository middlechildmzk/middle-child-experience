import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const labelLaunch = new Date('2026-08-04T00:00:00-05:00');
  const neverAloneLaunch = new Date('2026-08-01T00:00:00-05:00');

  return [
    { url: siteUrl, lastModified: labelLaunch, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/music`, lastModified: labelLaunch, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/artists/middle-child`, lastModified: labelLaunch, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/never-alone`, lastModified: neverAloneLaunch, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/playlists`, lastModified: labelLaunch, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/submit`, lastModified: labelLaunch, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/press`, lastModified: labelLaunch, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/experience`, lastModified: neverAloneLaunch, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/brand`, lastModified: neverAloneLaunch, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
