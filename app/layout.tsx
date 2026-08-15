import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { siteUrl } from '../lib/site-url';

export const viewport: Viewport = {
  themeColor: '#08090d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BVSS FVM | Independent Electronic Music',
    template: '%s | BVSS FVM',
  },
  description:
    'BVSS FVM is an independent electronic music label and creative home for Middle Child. Explore releases, playlists, creator resources, licensing, and submissions.',
  applicationName: 'BVSS FVM',
  category: 'music',
  keywords: [
    'BVSS FVM',
    'Middle Child music',
    'independent electronic music label',
    'melodic bass',
    'future bass',
    'emotional electronic music',
    'Minneapolis electronic artist',
  ],
  creator: 'Dan Larson',
  publisher: 'BVSS FVM',
  openGraph: {
    title: 'BVSS FVM | Independent Electronic Music',
    description: 'Music for the moments people cannot always put into words.',
    type: 'website',
    siteName: 'BVSS FVM',
    locale: 'en_US',
    url: siteUrl,
    images: [{ url: 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg', width: 1280, height: 720, alt: 'Middle Child - Never Alone' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BVSS FVM | Independent Electronic Music',
    description: 'Music for the moments people cannot always put into words.',
    images: ['https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
};

const nav = [
  ['Music', '/music'],
  ['Artist', '/artists/middle-child'],
  ['Playlists', '/playlists'],
  ['Submit', '/submit'],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'BVSS FVM',
    url: siteUrl,
    description: 'An independent electronic music label and creative home founded by artist and producer Dan Larson.',
    founder: { '@type': 'Person', name: 'Dan Larson' },
    subOrganization: {
      '@type': 'MusicGroup',
      '@id': `${siteUrl}/artists/middle-child#artist`,
      name: 'Middle Child',
      genre: ['Melodic Bass', 'Future Bass', 'Emotional Electronic Music'],
    },
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <header className="site-header">
          <Link className="wordmark" href="/" aria-label="BVSS FVM home">BVSS FVM</Link>
          <nav aria-label="Primary navigation">
            {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <a className="button button-small" href="https://lnk.to/MiddlechildNeverAlone" target="_blank" rel="noreferrer">Listen</a>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <Link className="wordmark" href="/">BVSS FVM</Link>
            <p>Independent electronic music. Minneapolis, Minnesota.</p>
          </div>
          <div className="footer-links">
            <Link href="/music">Music</Link>
            <Link href="/playlists">Playlists</Link>
            <Link href="/submit">Submit music</Link>
            <a href="mailto:hello@bvssfvm.com">Contact</a>
          </div>
          <p>© 2026 BVSS FVM. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}