import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import HeaderNavigation from './HeaderNavigation';
import './globals.css';
import { canIndexSite, siteUrl } from '../lib/site-url';

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
    'BVSS FVM is an independent electronic music label and genre-spanning curator network for releases, playlists, submissions, licensing, and artist discovery.',
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
  creator: 'BVSS FVM',
  publisher: 'BVSS FVM',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'BVSS FVM | Independent Electronic Music',
    description: 'Independent electronic releases, human-curated playlists, artist discovery, submissions, and licensing.',
    type: 'website',
    siteName: 'BVSS FVM',
    locale: 'en_US',
    url: siteUrl,
    images: [{ url: 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg', width: 1280, height: 720, alt: 'Middle Child - Never Alone' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BVSS FVM | Independent Electronic Music',
    description: 'Independent electronic releases, human-curated playlists, artist discovery, submissions, and licensing.',
    images: ['https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg'],
  },
  robots: canIndexSite
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
      }
    : {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'BVSS FVM',
        url: siteUrl,
        description: 'Independent music discovery, playlist curation, artist submissions and promotion resources.',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/icon.svg`,
          contentUrl: `${siteUrl}/icon.svg`,
          caption: 'BVSS FVM',
        },
        image: `${siteUrl}/icon.svg`,
        sameAs: [
          'https://open.spotify.com/user/larsunmusic',
          'https://www.instagram.com/bvssfvm/',
          'https://www.facebook.com/bvssfam',
          'https://x.com/BVSSFAM',
        ],
      },
      {
        '@type': 'MusicGroup',
        '@id': `${siteUrl}/artists/middle-child#artist`,
        name: 'Middle Child',
        url: `${siteUrl}/artists/middle-child`,
        genre: ['Melodic Bass', 'Future Bass', 'Emotional Electronic Music'],
        sameAs: [
          'https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN',
          'https://www.instagram.com/middlechildmzk/',
          'https://www.youtube.com/@middlechildmusica',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'BVSS FVM',
        url: siteUrl,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <header className="site-header">
          <Link className="wordmark" href="/" aria-label="BVSS FVM home">BVSS FVM</Link>
          <HeaderNavigation />
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
            <Link href="/licensing">Licensing</Link>
            <Link href="/playlists">Playlists</Link>
            <Link href="/playlists/collections">Collections</Link>
            <Link href="/curators">Curators</Link>
            <Link href="/about">About</Link>
            <Link href="/learn">Learn</Link>
            <Link href="/submit">Submit music</Link>
            <Link href="/free-spotify-playlist-submission">Free playlist submission</Link>
            <Link href="/tools/playlist-fit-checker">Playlist Fit Checker</Link>
            <a href="mailto:hello@bvssfvm.com">Contact</a>
          </div>
          <p>© 2026 BVSS FVM. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
