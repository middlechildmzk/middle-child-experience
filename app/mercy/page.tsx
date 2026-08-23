import type { Metadata } from 'next';
import Link from 'next/link';
import { siteUrl } from '../../lib/site-url';

const pageUrl = `${siteUrl}/mercy`;
const spotifyUrl = 'https://open.spotify.com/track/2OQSrHYdfbtHuMrEAAtYey';
const appleMusicUrl = 'https://music.apple.com/us/album/mercy-radio-edit-radio-edit-single/1585601648';

export const metadata: Metadata = {
  title: 'mercy (Radio Edit) — Middle Child',
  description: 'Official BVSS FVM release page for mercy (Radio Edit) by Middle Child, released August 18, 2017. Listen, view verified release details, explore the artist, and inquire about licensing.',
  alternates: { canonical: pageUrl },
  keywords: [
    'Middle Child mercy',
    'Middle Child mercy Radio Edit',
    'mercy Middle Child 2017',
    'BVSS FVM mercy',
    'Middle Child electronic music',
  ],
  openGraph: {
    title: 'mercy (Radio Edit) — Middle Child',
    description: 'Official release details, listening links, artist context, and licensing information for mercy (Radio Edit) by Middle Child.',
    url: pageUrl,
    type: 'music.song',
    siteName: 'BVSS FVM',
  },
};

export default function MercyPage() {
  const recordingSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': `${pageUrl}#recording`,
    name: 'mercy (Radio Edit)',
    url: pageUrl,
    datePublished: '2017-08-18',
    byArtist: { '@id': `${siteUrl}/artists/middle-child#artist`, '@type': 'MusicGroup', name: 'Middle Child' },
    recordLabel: { '@id': `${siteUrl}/#organization`, '@type': 'Organization', name: 'BVSS FVM' },
    sameAs: [spotifyUrl, appleMusicUrl],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: 'mercy (Radio Edit) — Middle Child',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${pageUrl}#recording` },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recordingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      <section className="shell page-hero">
        <p className="eyebrow">Middle Child · BVSS FVM · 2017</p>
        <h1>mercy (Radio Edit)</h1>
        <p className="lead">A permanent first-party home for one of Middle Child’s defining early catalog releases.</p>
        <div className="actions">
          <a className="button" href={spotifyUrl} target="_blank" rel="noreferrer">Listen on Spotify</a>
          <a className="button button-secondary" href={appleMusicUrl} target="_blank" rel="noreferrer">Apple Music</a>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Release details</p>
            <h2>Official metadata</h2>
          </div>
          <div className="grid">
            <article className="card"><h3>Artist</h3><p>Middle Child</p></article>
            <article className="card"><h3>Title</h3><p>mercy (Radio Edit)</p></article>
            <article className="card"><h3>Release date</h3><p>August 18, 2017</p></article>
            <article className="card"><h3>Label</h3><p>BVSS FVM</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Listen</p>
          <h2>Stream mercy</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <iframe
              src="https://open.spotify.com/embed/track/2OQSrHYdfbtHuMrEAAtYey"
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="mercy by Middle Child on Spotify"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Catalog context</p>
          <h2>Part of the 2017 Middle Child era.</h2>
          <p className="lead">mercy belongs to the run of 2017 releases that established the early Middle Child catalog and its emotional electronic identity. This BVSS FVM page exists so listeners, partners, and music supervisors have a stable first-party source for the track instead of relying only on streaming-platform listings.</p>
          <div className="actions">
            <Link className="button" href="/artists/middle-child">About Middle Child</Link>
            <Link className="button button-secondary" href="/music">Browse the catalog</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Licensing & sync</p>
            <h2>Interested in using mercy in a project?</h2>
          </div>
          <div>
            <p className="lead compact-lead">Availability and rights are reviewed for the specific use. Send the project, media, territory, term, placement context, timeline, and budget range if known.</p>
            <div className="actions"><Link className="button" href="/licensing">Start a licensing inquiry</Link></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">More Middle Child</p>
          <h2>Continue through the official catalog.</h2>
          <div className="grid">
            <Link className="card" href="/never-alone"><h3>Never Alone</h3><p>2026 · official release page, story, credits, and listening links.</p></Link>
            <Link className="card" href="/music"><h3>Middle Child catalog</h3><p>Official release pages and verified listening links from BVSS FVM.</p></Link>
            <Link className="card" href="/press"><h3>Press kit</h3><p>Artist background and official Middle Child information.</p></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
