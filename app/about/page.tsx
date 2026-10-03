import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlaylists } from '../../lib/playlist-os';
import { networkFollowerTotals } from '../../lib/source-health';
import { siteUrl } from '../../lib/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About BVSS FVM',
  description:
    'BVSS FVM is an independent electronic music label, curator network, and discovery platform built around human curation, artist development, and transparent playlist decisions.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About BVSS FVM',
    description:
      'Independent electronic music, human-curated playlists, artist discovery, releases, and transparent submissions.',
    url: '/about',
    type: 'website',
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default async function AboutPage() {
  const playlists = await getPlaylists().catch(() => []);
  const active = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  const followerTotals = networkFollowerTotals(active);
  const openForSubmissions = active.filter((playlist) => playlist.submission_status === 'open').length;

  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': siteUrl + '/about#page',
    name: 'About BVSS FVM',
    url: siteUrl + '/about',
    mainEntity: { '@id': siteUrl + '/#organization' },
    isPartOf: { '@id': siteUrl + '/#website' },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      <section className="shell page-hero about-hero">
        <p className="eyebrow">About BVSS FVM</p>
        <h1>Independent music with an operating system behind it.</h1>
        <p className="lead">
          BVSS FVM is an independent electronic music label, curator network, and discovery platform
          based in Minneapolis. It is the creative home of Middle Child and a growing system for
          discovering, reviewing, releasing, and amplifying electronic music we genuinely believe in.
        </p>
        <div className="actions">
          <Link className="button" href="/playlists">Explore playlists</Link>
          <Link className="button button-secondary" href="/submit">Submit music</Link>
        </div>
      </section>

      <section className="proof-strip" aria-label="BVSS FVM network facts">
        <div className="shell proof-grid">
          <div>
            <span>Playlist network</span>
            <strong>{active.length || playlists.length || 18} active playlists</strong>
          </div>
          <div>
            <span>Measured audience{followerTotals.counted ? ' · ' + followerTotals.counted + ' of ' + followerTotals.monitored + ' playlists' : ''}</span>
            <strong>{followerTotals.counted ? formatNumber(followerTotals.total) + ' followers' : 'Measuring'}</strong>
          </div>
          <div>
            <span>Submission lanes</span>
            <strong>{openForSubmissions || 'Multiple'} open for review</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">What BVSS FVM does</p>
            <h2>Label, discovery network, and artist infrastructure.</h2>
          </div>
          <div className="about-stack">
            <article className="card">
              <h3>Releases & artist development</h3>
              <p>
                BVSS FVM releases independent electronic music and develops projects with a focus on
                identity, release strategy, positioning, long-term catalog value, and genuine audience fit.
              </p>
            </article>
            <article className="card">
              <h3>Playlist curation</h3>
              <p>
                The playlist network is organized around specific sounds, moods, and listening moments.
                Playlists are edited by humans and measured with real follower history rather than invented
                listener or stream estimates.
              </p>
            </article>
            <article className="card">
              <h3>Artist discovery</h3>
              <p>
                Artists can submit one track into a structured review workflow. Software can suggest likely
                fits, but placement decisions remain editorial and independent.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section editorial-policy" id="editorial-policy">
        <div className="shell">
          <p className="eyebrow">Editorial policy</p>
          <h2>What we will—and will not—do.</h2>
          <div className="editorial-columns">
            <article className="card">
              <h3>Human decisions</h3>
              <p>
                Matching systems can organize submissions and surface likely fits. A human curator decides
                whether a track strengthens the playlist.
              </p>
            </article>
            <article className="card">
              <h3>No guaranteed placement</h3>
              <p>
                Submitting music, working with the label, or using a partner platform does not purchase or
                guarantee a playlist placement.
              </p>
            </article>
            <article className="card">
              <h3>No artificial growth</h3>
              <p>
                BVSS FVM does not use fake followers, artificial streams, or misleading playlist metrics.
                Missing measurements stay missing until a defensible data source is available.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Founder & flagship artist</p>
            <h2>Built by Dan Larson.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              Dan Larson founded BVSS FVM and releases electronic music as Middle Child. The label and
              playlist network are being built around the same principle: emotional records deserve
              thoughtful context, credible discovery, and systems that help good music travel farther.
            </p>
            <div className="actions">
              <Link className="button button-secondary" href="/artists/middle-child">Middle Child</Link>
              <a className="button button-secondary" href="https://www.instagram.com/bvssfvm/" target="_blank" rel="noreferrer">Instagram</a>
              <a className="button button-secondary" href="https://open.spotify.com/user/larsunmusic" target="_blank" rel="noreferrer">Spotify</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Work with BVSS FVM</p>
            <h2>Listen, submit, curate, or license.</h2>
          </div>
          <div>
            <div className="actions">
              <Link className="button" href="/submit">Submit music</Link>
              <Link className="button button-secondary" href="/curators/apply">Join curator beta</Link>
              <Link className="button button-secondary" href="/licensing">Licensing</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
