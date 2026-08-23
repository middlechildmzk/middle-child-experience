import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Middle Child Music Catalog',
  description: 'Explore official Middle Child releases from BVSS FVM, including release stories, lyrics, credits, videos, verified listening links, and licensing information.',
  alternates: { canonical: '/music' },
};

const releases = [
  { title: 'Never Alone', detail: 'Middle Child feat. lowly sunday · 2026', href: '/never-alone', image: 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg' },
  { title: 'mercy (Radio Edit)', detail: 'Middle Child · 2017 · BVSS FVM', href: '/mercy', image: 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg' },
  { title: 'Full Middle Child catalog', detail: 'Permanent release pages are being added across the catalog', href: 'https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN', image: 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg' },
];

export default function MusicPage() {
  return (
    <main>
      <section className="shell page-hero">
        <p className="eyebrow">Middle Child music · BVSS FVM catalog</p>
        <h1>Official Middle Child releases, stories, credits, and listening links.</h1>
        <p className="lead">Start with Never Alone and mercy, then explore the growing BVSS FVM catalog of emotional electronic, melodic bass, and future bass music.</p>
        <div className="actions">
          <Link className="button" href="/never-alone">Explore Never Alone</Link>
          <Link className="button button-secondary" href="/mercy">Explore mercy</Link>
          <Link className="button button-secondary" href="/licensing">License Middle Child music</Link>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <div className="grid">
            {releases.map((r, i) => (
              <a className="card release-card" href={r.href} key={r.title} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                <img src={r.image} alt={i === 0 ? 'Middle Child Never Alone release artwork' : ''} />
                <div>
                  <p className="eyebrow">{i < 2 ? 'Official release page' : 'Catalog'}</p>
                  <h2>{r.title}</h2>
                  <p>{r.detail}</p>
                </div>
              </a>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 32 }}>The full Middle Child discography is being converted into permanent BVSS FVM release pages with verified metadata, credits, lyrics where available, platform links, original context, and a clear route for licensing inquiries.</p>
          <div className="actions"><Link className="button" href="/never-alone">Explore Never Alone</Link><Link className="button button-secondary" href="/mercy">Explore mercy</Link><Link className="button button-secondary" href="/licensing">Licensing & sync</Link></div>
        </div>
      </section>
    </main>
  );
}
