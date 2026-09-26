
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlaylists } from '../../lib/playlist-os';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Electronic Music Playlists',
  description: 'Explore the BVSS FVM independent playlist network: emotional bass, drum & bass, house, UK garage, hardwave, chill electronic, bass music and more.',
  alternates: { canonical: '/playlists' },
  openGraph: {
    title: 'BVSS FVM Playlist Network',
    description: 'Human-curated electronic playlists built around real listening moments, discovery and independent artists.',
    url: '/playlists',
    type: 'website',
  },
};

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();

  return (
    <main>
      <section className="shell page-hero playlist-hero">
        <p className="eyebrow">BVSS FVM playlist network</p>
        <h1>Find the lane that fits the moment.</h1>
        <p className="lead">
          {playlists.length} active, human-curated electronic playlists — organized by sound, mood and listener intent,
          with one submission funnel for independent artists.
        </p>
        <div className="actions">
          <Link className="button" href="/submit">Submit music</Link>
          <a className="button button-secondary" href="#network">Explore the network</a>
        </div>
      </section>

      <section className="proof-strip" aria-label="Playlist network principles">
        <div className="shell proof-grid">
          <div><span>Network</span><strong>{playlists.length} active playlists</strong></div>
          <div><span>Curation</span><strong>Human editorial decisions</strong></div>
          <div><span>Submissions</span><strong>One track · multiple possible fits</strong></div>
        </div>
      </section>

      <section className="section" id="network">
        <div className="shell">
          <p className="eyebrow">Browse by sound</p>
          <h2>Built for discovery, not keyword stuffing.</h2>
          <div className="playlist-grid">
            {playlists.map((playlist) => (
              <Link className="playlist-card" href={'/playlists/' + playlist.slug} key={playlist.id}>
                {playlist.cover_asset_url ? (
                  <img src={playlist.cover_asset_url} alt="" loading="lazy" />
                ) : <div className="playlist-art-placeholder" aria-hidden="true" />}
                <div className="playlist-card-body">
                  <p className="eyebrow">{playlist.primary_genre}</p>
                  <h3>{playlist.canonical_name}</h3>
                  <p>{playlist.description}</p>
                  <div className="chip-row">
                    {playlist.moods.slice(0, 3).map((mood) => <span className="chip" key={mood}>{mood}</span>)}
                  </div>
                  <span className="card-link">Open playlist →</span>
                </div>
              </Link>
            ))}
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
              Send one focused submission. BVSS FVM proposes likely playlist fits for the curator to review; placement is
              never automatic or guaranteed.
            </p>
            <div className="actions"><Link className="button" href="/submit">Submit music</Link></div>
          </div>
        </div>
      </section>
    </main>
  );
}
