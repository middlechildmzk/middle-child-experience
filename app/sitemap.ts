import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://middle-child-experience.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-08-01T00:00:00-05:00');

  return [
    {
      url: `${siteUrl}/never-alone`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/experience`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/press`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/brand`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
