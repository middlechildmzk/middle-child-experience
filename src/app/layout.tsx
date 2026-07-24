import type { Metadata, Viewport } from 'next';
import './globals.css';
import './interactions.css';
import './experience.css';
import InteractiveSky from './components/InteractiveSky';
import ExperienceControls from './components/ExperienceControls';

const siteUrl = 'https://middle-child-experience.vercel.app';

export const viewport: Viewport = {
  themeColor: '#05050a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Middle Child — Never Alone',
    template: '%s | Middle Child',
  },
  description: 'The official home of Middle Child: emotional electronic music, the story behind Never Alone, creator-friendly releases, lyrics, and press information.',
  applicationName: 'Middle Child',
  category: 'music',
  alternates: { canonical: '/' },
  keywords: [
    'Middle Child music',
    'Never Alone Middle Child',
    'melodic bass',
    'future bass',
    'emotional electronic music',
    'cinematic electronic music',
    'music about hope',
    'creator-friendly music',
  ],
  authors: [{ name: 'Dan Larson' }],
  creator: 'Dan Larson',
  publisher: 'BVSS FVM',
  openGraph: {
    title: 'Middle Child — Never Alone',
    description: 'Some songs are released. Some are survived. Discover the new single from Middle Child, arriving July 31, 2026.',
    type: 'website',
    siteName: 'Middle Child',
    locale: 'en_US',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Middle Child — Never Alone',
    description: 'Some songs are released. Some are survived. New single arriving July 31, 2026.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
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
    genre: ['Melodic Bass', 'Future Bass', 'Emotional Electronic Music'],
    description: 'Middle Child is the emotional electronic project of Minneapolis artist and producer Dan Larson.',
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <InteractiveSky />
        <ExperienceControls />
        {children}
      </body>
    </html>
  );
}
