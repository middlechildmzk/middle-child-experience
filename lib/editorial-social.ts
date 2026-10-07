import type { Metadata } from 'next';

export function editorialSocial(title: string, description: string, path: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = path + '/opengraph-image';
  return {
    openGraph: { title, description, url: path, type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
