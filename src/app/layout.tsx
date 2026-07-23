import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://middle-child-never-alone.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Middle Child — Never Alone',
  description: 'The official home of Middle Child: emotional electronic music, creator-friendly releases, story, press, and the Never Alone experience.',
  alternates: { canonical: '/' },
  keywords: ['Middle Child', 'Never Alone', 'melodic bass', 'future bass', 'emotional electronic music', 'creator-friendly music'],
  openGraph: {
    title: 'Middle Child — Never Alone',
    description: 'Some songs are released. Some are survived.',
    type: 'website',
    siteName: 'Middle Child',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Middle Child — Never Alone',
    description: 'Some songs are released. Some are survived.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: 'Middle Child',
    alternateName: 'Middle Child Music',
    foundingDate: '2014',
    foundingLocation: { '@type': 'Place', name: 'Minneapolis, Minnesota' },
    member: { '@type': 'Person', name: 'Dan Larson' },
    recordLabel: { '@type': 'Organization', name: 'BVSS FVM' },
    url: siteUrl,
    genre: ['Melodic Bass', 'Future Bass', 'Electronic Music'],
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        {children}
      </body>
    </html>
  );
}
