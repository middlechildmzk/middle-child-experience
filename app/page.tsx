import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getPlaylists } from '../lib/playlist-os';
import { assessPlaylistFollowers, describeFollowersPublic, networkFollowerTotals } from '../lib/source-health';
import { siteUrl } from '../lib/site-url';

const smartLink = 'https://lnk.to/MiddlechildNeverAlone';
const artwork = 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'BVSS FVM | Independent Electronic Music',
    description:
      'Independent electronic releases, a genre-spanning human-curated playlist network, artist submissions, licensing, and music discovery.',
    url: siteUrl,
    type: 'website',
    siteName: 'BVSS FVM',
    images: [{ url: artwork, width: 1280, height: 720, alt: 'Middle Child - Never Alone' }],
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default async function HomePage() {
  const playlists = await getPlaylists().catch(() => []);
  const activePlaylists = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  const network = activePlaylists.length ? activePlaylists : playlists;
  const now = new Date();
  const followerTotals = networkFollowerTotals(network, now);
  const featured = [...network]
    .sort(
      (a, b) =>
        (assessPlaylistFollowers(b, now).displayValue ?? -1) - (assessPlaylistFollowers(a, now).displayValue ?? -1)
        || a.display_order - b.display_order,
    )
    .slice(0, 4);
  const networkCount = network.length || 18;

  return (
    <main>
      <section className="shell hero">
        <div className="hero-copy">
          <p className="eyebrow">Independent electronic music · Minneapolis</p>
          <h1 className="display">BVSS<br />FVM</h1>
          <p className="lead">
            An independent electronic music label and human-curated discovery network built for listeners,
            artists, and records with a real point of view.
          </p>
          <p className="hero-note">
            Listen to new music, explore {networkCount} curated playlists, submit a track, or discover the
            story behind Middle Child.
          </p>
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
          <div><span>Playlist network</span><strong>{networkCount} active playlists</strong></div>
          <div>
            <span>Measured audience{followerTotals.counted ? ' · ' + followerTotals.counted + ' of ' + followerTotals.monitored + ' playlists' : ''}</span>
            <strong>{followerTotals.counted ? formatNumber(followerTotals.total) + ' followers' : 'Measuring'}</strong>
          </div>
          <div><span>Curation</span><strong>Human reviewed · submissions open</strong></div>
        </div>
      </section>

      {!!featured.length && (
        <section className="section network-feature">
          <div className="shell">
            <div className="section-split network-feature-heading">
              <div>
                <p className="eyebrow">Growing now</p>
                <h2>The BVSS FVM playlist network.</h2>
              </div>
              <div>
                <p className="lead compact-lead">
                  Genre-focused playlists with live follower measurement, clear editorial lanes, and
                  direct artist submission paths.
                </p>
                <div className="actions">
                  <Link className="button button-secondary" href="/playlists">Browse all playlists</Link>
                </div>
              </div>
            </div>

            <div className="network-feature-grid">
              {featured.map((playlist) => (
                <Link className="network-feature-card" href={'/playlists/' + playlist.slug} key={playlist.id}>
                  {playlist.cover_asset_url ? (
                    <img
                      src={playlist.cover_asset_url}
                      alt={playlist.canonical_name + ' playlist cover'}
                      loading="lazy"
                    />
                  ) : (
                    <div className="playlist-art-placeholder" aria-hidden="true" />
                  )}
                  <div>
                    <p className="eyebrow">{playlist.primary_genre}</p>
                    <h3>{playlist.canonical_name}</h3>
                    <p>{playlist.subtitle}</p>
                    <div className="network-feature-meta">
                      <strong title={describeFollowersPublic(playlist, now).detail || undefined} data-follower-state={describeFollowersPublic(playlist, now).state}>
                        {describeFollowersPublic(playlist, now).label}
                      </strong>
                      <span>
                        {playlist.current_track_count != null
                          ? formatNumber(playlist.current_track_count) + ' tracks'
                          : playlist.update_cadence + ' updates'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Current release</p>
            <h2>Never Alone</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              A wounded but hopeful melodic bass record about feeling invisible and discovering that even
              in the hardest season, you were never truly alone.
            </p>
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
              <p>
                Browse {networkCount} human-curated playlists by genre, mood, activity, and curator —
                from the BVSS FVM electronic catalog to CuratorOS discovery, focus, workout, pop, indie,
                R&B, rock, country, and more.
              </p>
              <span className="card-link">Find your playlist →</span>
            </Link>
            <Link className="card card-feature" href="/submit">
              <span className="card-index">03</span>
              <h3>Submit music</h3>
              <p>Send one Spotify track for independent editorial consideration across the BVSS FVM playlist network. No guaranteed placements.</p>
              <span className="card-link">Submit a track →</span>
            </Link>
            <Link className="card card-feature" href="/about">
              <span className="card-index">04</span>
              <h3>How BVSS FVM works</h3>
              <p>Read the label story, curation standards, editorial policy, and the principles behind the network.</p>
              <span className="card-link">About BVSS FVM →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Curator Network Beta</p>
            <h2>CuratorOS is live inside the BVSS FVM network.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              Explore CuratorOS alongside the BVSS FVM catalog: genre, mood and activity playlists with
              verified ownership, direct Spotify listening, and one focused artist submission path.
            </p>
            <div className="actions">
              <Link className="button" href="/curators/curatoros">Explore CuratorOS</Link>
              <Link className="button button-secondary" href="/curators">Explore curators</Link>
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
            <p className="lead compact-lead">
              Melodic bass, future bass, cinematic space, guitar warmth, intimate songwriting, and drops
              that bloom instead of attack.
            </p>
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
