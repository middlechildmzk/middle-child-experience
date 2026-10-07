import type { Metadata } from 'next';

// Page-specific Open Graph + Twitter cards. Next replaces (does not merge) the
// layout's openGraph/twitter objects, so pages must set the image too.
export const DEFAULT_SOCIAL_IMAGE = {
  url: 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg',
  width: 1280,
  height: 720,
  alt: 'Middle Child - Never Alone',
};

export function socialMeta(title: string, description: string, path: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      siteName: 'BVSS FVM',
      locale: 'en_US',
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE.url],
    },
  };
}
