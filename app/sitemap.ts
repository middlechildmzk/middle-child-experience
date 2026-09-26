
import type { MetadataRoute } from 'next';
import { canIndexSite, siteUrl } from '../lib/site-url';
import { getPlaylists } from '../lib/playlist-os';
import { guides } from '../lib/learn-guides';
import { getPublicCurators } from '../lib/curator-network';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!canIndexSite) return [];

  let playlistEntries: MetadataRoute.Sitemap = [];
  let curatorEntries: MetadataRoute.Sitemap = [];
  try {
    const playlists = await getPlaylists();
    playlistEntries = playlists.map((playlist) => ({
      url: siteUrl + '/playlists/' + playlist.slug,
      lastModified: new Date(playlist.last_editorial_update_at || playlist.updated_at),
      changeFrequency: 'weekly',
      priority: 0.76,
    }));
    const curators = await getPublicCurators();
    curatorEntries = curators.map((curator) => ({
      url: siteUrl + '/curators/' + curator.handle,
      changeFrequency: 'weekly' as const,
      priority: 0.68,
    }));
  } catch {
    playlistEntries = [];
    curatorEntries = [];
  }

  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: siteUrl + '/music', changeFrequency: 'weekly', priority: 0.95 },
    { url: siteUrl + '/artists/middle-child', changeFrequency: 'monthly', priority: 0.95 },
    { url: siteUrl + '/never-alone', lastModified: new Date('2026-07-31T00:00:00-05:00'), changeFrequency: 'monthly', priority: 0.95 },
    { url: siteUrl + '/mercy', lastModified: new Date('2026-08-23T00:00:00-05:00'), changeFrequency: 'monthly', priority: 0.92 },
    { url: siteUrl + '/licensing', changeFrequency: 'monthly', priority: 0.88 },
    { url: siteUrl + '/playlists', changeFrequency: 'weekly', priority: 0.85 },
    ...playlistEntries,
    { url: siteUrl + '/curators', changeFrequency: 'weekly', priority: 0.76 },
    ...curatorEntries,
    { url: siteUrl + '/curators/apply', changeFrequency: 'monthly', priority: 0.55 },
    { url: siteUrl + '/learn', changeFrequency: 'monthly', priority: 0.82 },
    ...guides.map((guide) => ({
      url: siteUrl + '/learn/' + guide.slug,
      lastModified: new Date('2026-09-26T00:00:00-05:00'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: siteUrl + '/submit', changeFrequency: 'monthly', priority: 0.78 },
    { url: siteUrl + '/press', changeFrequency: 'monthly', priority: 0.65 },
    { url: siteUrl + '/brand', changeFrequency: 'monthly', priority: 0.5 },
    { url: siteUrl + '/experience', changeFrequency: 'monthly', priority: 0.5 },
  ];
}
