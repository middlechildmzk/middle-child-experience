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
          <p className="lead">The independent home of Middle Child and a human-curated electronic music discovery network.</p>
          <p className="hero-note">Listen to new music, explore 18 curated playlists, submit a track, or discover the story behind Middle Child.</p>
          <div className="actions">
            <a className="button" href={smartLink} target="_blank" rel="noreferrer">Listen</a>
            <Link className="button button-secondary" href="/playlists">Explore playlists</Link>
            <Link className="button button-secondary" href="/submit">Submit music</Link>
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
          <div><span>Playlist network</span><strong>18 active playlists</strong></div>
          <div><span>Curation</span><strong>Human reviewed · submissions open</strong></div>
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
          <p className="eyebrow">Start here</p>
          <h2>Listen. Discover. Submit.</h2>
          <div className="grid feature-grid">
            <Link className="card card-feature" href="/music">
              <span className="card-index">01</span>
              <h3>Listen</h3>
              <p>Explore official Middle Child releases with verified listening links, credits, stories, and release context.</p>
              <span className="card-link">Explore the music →</span>
            </Link>
            <Link className="card card-feature" href="/playlists">
              <span className="card-index">02</span>
              <h3>Discover playlists</h3>
              <p>Browse 18 human-curated electronic playlists by genre, mood, and listening moment — from emotional bass to trance, DnB, house, UK garage, and more.</p>
              <span className="card-link">Find your playlist →</span>
            </Link>
            <Link className="card card-feature" href="/submit">
              <span className="card-index">03</span>
              <h3>Submit music</h3>
              <p>Send one Spotify track for independent editorial consideration across the BVSS FVM playlist network. No guaranteed placements.</p>
              <span className="card-link">Submit a track →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Curator Network Beta</p>
            <h2>Playlist owners can plug into the same operating system.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              Verified independent curators can add playlists, define fit, receive matched submissions, review tracks, and build transparent response history without giving up editorial control.
            </p>
            <div className="actions">
              <Link className="button" href="/curators">Explore curators</Link>
              <Link className="button button-secondary" href="/curators/apply">Apply for the beta</Link>
            </div>
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
