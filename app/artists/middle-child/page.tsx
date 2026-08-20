import type { Metadata } from 'next';
import Link from 'next/link';
import { siteUrl } from '../../../lib/site-url';

const pageUrl = `${siteUrl}/artists/middle-child`;

export const metadata: Metadata = {
  title: 'Middle Child — Emotional Electronic Artist',
  description: 'Official artist profile for Middle Child, the Minneapolis electronic project of producer Dan Larson. Explore the sound, story, releases, and official listening links.',
  alternates: { canonical: pageUrl },
  openGraph: {
    title: 'Middle Child — Emotional Electronic Artist',
    description: 'The official home of Middle Child: melodic bass, future bass, cinematic electronics, guitar warmth, and deeply personal songwriting.',
    url: pageUrl,
    type: 'profile',
    siteName: 'BVSS FVM',
  },
};

export default function MiddleChildPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': `${pageUrl}#artist`,
    name: 'Middle Child',
    url: pageUrl,
    member: { '@type': 'Person', name: 'Dan Larson' },
    foundingDate: '2014',
    foundingLocation: { '@type': 'Place', name: 'Minneapolis, Minnesota, United States' },
    genre: ['Melodic Bass', 'Future Bass', 'Emotional Electronic Music'],
    recordLabel: { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'BVSS FVM', url: siteUrl },
    sameAs: [
      'https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN',
      'https://www.instagram.com/middlechildmzk/',
      'https://x.com/middlechildmzk',
      'https://www.facebook.com/middlechildmusica/',
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="shell page-hero">
        <p className="eyebrow">BVSS FVM artist · Minneapolis</p>
        <h1>Middle Child</h1>
        <p className="lead">Emotional electronic music for the space between breaking and becoming whole again.</p>
        <div className="actions">
          <a className="button" href="https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN" target="_blank" rel="noreferrer">Listen on Spotify</a>
          <Link className="button button-secondary" href="/music">Explore catalog</Link>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">About</p>
          <h2>Wounded, cinematic, and hopeful.</h2>
          <p className="lead">Middle Child is the electronic music project of Minneapolis artist and producer Dan Larson. The sound blends melodic bass, future bass, cinematic atmosphere, guitar warmth, intimate songwriting, and drops that bloom instead of attack.</p>
          <div className="grid">
            <article className="card"><h3>Sound</h3><p>Melodic bass, emotional future bass, cinematic electronics, organic guitar texture, and warm low end.</p></article>
            <article className="card"><h3>Story</h3><p>Music shaped by grief, depression, faith, healing, and the determination to make something useful from difficult seasons.</p></article>
            <article className="card"><h3>Home</h3><p>Minneapolis, Minnesota. Independent releases through BVSS FVM.</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Featured release</p>
            <h2>Never Alone</h2>
          </div>
          <div>
            <p className="lead compact-lead">A song about feeling invisible and discovering that something was still carrying you through.</p>
            <div className="actions"><Link className="button" href="/never-alone">Official release page</Link></div>
          </div>
        </div>
      </section>
    </main>
  );
}
