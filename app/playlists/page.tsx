import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlaylists } from '../../lib/playlist-os';
import { networkFollowerTotals } from '../../lib/source-health';
import { siteUrl } from '../../lib/site-url';
import PlaylistBrowser from './PlaylistBrowser';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Electronic Music Playlists',
  description:
    'Explore the BVSS FVM independent playlist network: emotional bass, drum & bass, house, UK garage, hardwave, chill electronic, bass music and more.',
  alternates: { canonical: '/playlists' },
  openGraph: {
    title: 'BVSS FVM Playlist Network',
    description:
      'Human-curated electronic playlists built around real listening moments, discovery and independent artists.',
    url: '/playlists',
    type: 'website',
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();
  const active = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  const network = active.length ? active : playlists;
  const followerTotals = networkFollowerTotals(network);
  const openCount = network.filter((playlist) => playlist.submission_status === 'open').length;

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': siteUrl + '/playlists#collection',
    name: 'BVSS FVM Playlist Network',
    description: 'Human-curated electronic music playlists organized by sound, mood and listening intent.',
    url: siteUrl + '/playlists',
    isPartOf: { '@type': 'WebSite', '@id': siteUrl + '/#website' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: network.length,
      itemListElement: network.map((playlist, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: playlist.canonical_name,
        url: siteUrl + '/playlists/' + playlist.slug,
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <section className="shell page-hero playlist-hero">
        <p className="eyebrow">BVSS FVM playlist network</p>
        <h1>Find the lane that fits the moment.</h1>
        <p className="lead">
          {network.length} active, human-curated electronic playlists — organized by sound, mood and
          listener intent, with live audience measurement and one submission funnel for independent artists.
        </p>
        <div className="actions">
          <Link className="button" href="/submit">Submit music</Link>
          <a className="button button-secondary" href="#network">Explore the network</a>
        </div>
      </section>

      <section className="proof-strip" aria-label="Playlist network facts">
        <div className="shell proof-grid">
          <div><span>Network</span><strong>{network.length} active playlists</strong></div>
          <div>
            <span>Measured audience{followerTotals.counted ? ' · ' + followerTotals.counted + ' of ' + followerTotals.monitored + ' playlists' : ''}</span>
            <strong>{followerTotals.counted ? formatNumber(followerTotals.total) + ' followers' : 'Measuring'}</strong>
          </div>
          <div><span>Submissions</span><strong>{openCount || 'Multiple'} lanes open for review</strong></div>
        </div>
      </section>

      <section className="section" id="network">
        <div className="shell">
          <p className="eyebrow">Browse by sound</p>
          <h2>Built for discovery, not keyword stuffing.</h2>
          <p className="playlist-network-intro">
            Every page shows the playlist's editorial lane, update cadence, live follower count when
            measured, current rotation highlights, Spotify player, and a direct submission path.
          </p>
          <PlaylistBrowser playlists={network} />
        </div>
      </section>

      <section className="section growth-principles">
        <div className="shell">
          <p className="eyebrow">How the network grows</p>
          <h2>Real listeners. Real curation. Measurable movement.</h2>
          <div className="editorial-columns">
            <article className="card">
              <h3>Audience first</h3>
              <p>
                We track follower history and first-party Spotify outbound clicks separately. We do not
                turn unavailable playlist-listener or playlist-stream data into estimates.
              </p>
            </article>
            <article className="card">
              <h3>Artist-powered discovery</h3>
              <p>
                Strong placements are built to be shareable so artists can send real listeners into the
                playlists where their music genuinely fits.
              </p>
            </article>
            <article className="card">
              <h3>Editorial independence</h3>
              <p>
                Submission routing can suggest a lane. Humans make the final call, and no submission or
                partner relationship guarantees placement.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Independent artists</p>
            <h2>Submit once. Route intelligently.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              Send one focused submission. BVSS FVM proposes likely playlist fits for the curator to review;
              placement is never automatic or guaranteed.
            </p>
            <div className="actions">
              <Link className="button" href="/submit">Submit music</Link>
              <Link className="button button-secondary" href="/about#editorial-policy">Read editorial policy</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
