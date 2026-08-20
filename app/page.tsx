import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { siteUrl } from '../lib/site-url';

const smartLink = 'https://lnk.to/MiddlechildNeverAlone';
const artwork = 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg';

export const metadata: Metadata = {
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'BVSS FVM | Independent Electronic Music',
    description: 'The independent creative home of Middle Child: emotional electronic releases, official credits, licensing, playlists, and artist resources.',
    url: siteUrl,
    type: 'website',
    siteName: 'BVSS FVM',
    images: [{ url: artwork, width: 1280, height: 720, alt: 'Middle Child - Never Alone' }],
  },
};

export default function HomePage() {
  return (
    <main>
      <section className="shell hero">
        <div className="hero-copy">
          <p className="eyebrow">Independent electronic music · Minneapolis</p>
          <h1 className="display">BVSS<br />FVM</h1>
          <p className="lead">The creative home of Middle Child — emotional electronic music built for the moments people cannot always put into words.</p>
          <p className="hero-note">Official releases, artist stories, credits, playlists, licensing, and submissions — all from one independent home.</p>
          <div className="actions">
            <a className="button" href={smartLink} target="_blank" rel="noreferrer">Listen to Never Alone</a>
            <Link className="button button-secondary" href="/artists/middle-child">Meet Middle Child</Link>
          </div>
        </div>

        <Link className="cover cover-feature" href="/never-alone" aria-label="Explore Never Alone by Middle Child">
          <Image
            src={artwork}
            alt="Never Alone by Middle Child featuring lowly sunday"
            fill
            sizes="(max-width: 850px) calc(100vw - 40px), 42vw"
            priority
          />
          <div className="cover-overlay">
            <span>Current release</span>
            <strong>Never Alone</strong>
            <small>Middle Child feat. lowly sunday</small>
          </div>
        </Link>
      </section>

      <section className="proof-strip" aria-label="BVSS FVM overview">
        <div className="shell proof-grid">
          <div><span>Artist</span><strong>Middle Child</strong></div>
          <div><span>Sound</span><strong>Melodic · Cinematic · Emotional</strong></div>
          <div><span>Home</span><strong>Minneapolis, Minnesota</strong></div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Current release</p>
            <h2>Never Alone</h2>
          </div>
          <div>
            <p className="lead compact-lead">A wounded but hopeful melodic bass record about feeling invisible and discovering that even in the hardest season, you were never truly alone.</p>
            <div className="actions">
              <Link className="button" href="/never-alone">Lyrics, story & credits</Link>
              <a className="button button-secondary" href={smartLink} target="_blank" rel="noreferrer">Listen everywhere</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Explore BVSS FVM</p>
          <h2>Music first. Everything around it connected.</h2>
          <div className="grid feature-grid">
            <Link className="card card-feature" href="/music">
              <span className="card-index">01</span>
              <h3>Official music</h3>
              <p>Explore Middle Child releases with verified listening links, credits, lyrics, stories, and release context.</p>
              <span className="card-link">Explore catalog →</span>
            </Link>
            <Link className="card card-feature" href="/artists/middle-child">
              <span className="card-index">02</span>
              <h3>Middle Child</h3>
              <p>Meet the emotional electronic project behind the music — its sound, story, catalog, and creative identity.</p>
              <span className="card-link">Artist profile →</span>
            </Link>
            <Link className="card card-feature" href="/licensing">
              <span className="card-index">03</span>
              <h3>Licensing & sync</h3>
              <p>Explore Middle Child music for film, TV, games, trailers, podcasts, branded content, and creator work.</p>
              <span className="card-link">Licensing info →</span>
            </Link>
            <Link className="card card-feature" href="/playlists">
              <span className="card-index">04</span>
              <h3>Playlists</h3>
              <p>Curated electronic music organized by mood, genre, and the moments where it belongs.</p>
              <span className="card-link">Explore playlists →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section artist-cta">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Featured artist</p>
            <h2>Middle Child</h2>
          </div>
          <div>
            <p className="lead compact-lead">Melodic bass, future bass, cinematic space, guitar warmth, intimate songwriting, and drops that bloom instead of attack.</p>
            <div className="actions">
              <Link className="button" href="/artists/middle-child">Explore the artist</Link>
              <a className="button button-secondary" href="https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN" target="_blank" rel="noreferrer">Spotify</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <div className="shell">
          <p className="eyebrow">For artists & music supervisors</p>
          <h2>Looking to submit music or license a track?</h2>
          <div className="actions">
            <Link className="button" href="/submit">Submit music</Link>
            <Link className="button button-secondary" href="/licensing">Licensing & sync</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
