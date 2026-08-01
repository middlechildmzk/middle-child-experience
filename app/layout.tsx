import type { Metadata, Viewport } from 'next';
import '../src/app/globals.css';
import '../src/app/interactions.css';
import '../src/app/experience.css';
import '../src/app/healing-core.css';
import '../src/app/immersive-engine.css';
import InteractiveSky from '../src/app/components/InteractiveSky';
import ExperienceControls from '../src/app/components/ExperienceControls';
import HealingCore from '../src/app/components/HealingCore';
import ImmersiveEngine from '../src/app/components/ImmersiveEngine';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://middle-child-experience.vercel.app';
const releaseUrl = `${siteUrl}/never-alone`;
const thumbnailUrl = 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg';

export const viewport: Viewport = {
  themeColor: '#05050a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Middle Child - Never Alone',
    template: '%s | Middle Child',
  },
  description:
    'The official home of Middle Child, the emotional electronic project of Minneapolis artist and producer Dan Larson. Listen to Never Alone, read the lyrics, and explore the story.',
  applicationName: 'Middle Child',
  category: 'music',
  alternates: { canonical: releaseUrl },
  keywords: [
    'Middle Child music',
    'Middle Child Never Alone',
    'Never Alone feat lowly sunday',
    'melodic bass',
    'future bass',
    'emotional electronic music',
    'cinematic electronic music',
    'Minneapolis electronic artist',
  ],
  authors: [{ name: 'Dan Larson', url: siteUrl }],
  creator: 'Dan Larson',
  publisher: 'BVSS FVM',
  openGraph: {
    title: 'Middle Child - Never Alone (feat. lowly sunday)',
    description: 'Official audio, lyrics, story, credits, and streaming links for Never Alone.',
    type: 'website',
    siteName: 'Middle Child',
    locale: 'en_US',
    url: releaseUrl,
    images: [{ url: thumbnailUrl, width: 1280, height: 720, alt: 'Middle Child - Never Alone official audio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Middle Child - Never Alone (feat. lowly sunday)',
    description: 'Official audio, lyrics, story, credits, and streaming links for Never Alone.',
    images: [thumbnailUrl],
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
    '@id': `${siteUrl}/#artist`,
    name: 'Middle Child',
    alternateName: 'Middle Child Music',
    foundingDate: '2014',
    foundingLocation: { '@type': 'Place', name: 'Minneapolis, Minnesota, United States' },
    member: { '@type': 'Person', name: 'Dan Larson' },
    recordLabel: { '@type': 'Organization', name: 'BVSS FVM' },
    url: siteUrl,
    genre: ['Melodic Bass', 'Future Bass', 'Emotional Electronic Music'],
    description: 'Middle Child is the emotional electronic project of Minneapolis artist and producer Dan Larson.',
    sameAs: [
      'https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN',
      'https://www.instagram.com/middlechildmzk/',
      'https://x.com/middlechildmzk',
      'https://www.facebook.com/middlechildmusica/',
      'https://linktr.ee/middlechild',
    ],
  };

  return (
    <html lang="en">
      <body data-world="world-never-alone">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <ImmersiveEngine />
        <InteractiveSky />
        <HealingCore />
        <ExperienceControls />
        {children}
      </body>
    </html>
  );
}
