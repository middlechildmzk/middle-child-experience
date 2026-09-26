
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlaylist, getPlaylists, relatedPlaylists } from '../../../lib/playlist-os';
import { siteUrl } from '../../../lib/site-url';
import PlaylistAnalytics from '../PlaylistAnalytics';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPlaylist(slug);
  if (!result) return { title: 'Playlist not found' };
  const p = result.playlist;
  const title = p.canonical_name + ' — Spotify Playlist';
  const description = p.description;
  return {
    title,
    description,
    keywords: p.seo_keywords,
    alternates: { canonical: '/playlists/' + p.slug },
    openGraph: {
      title,
      description,
      url: '/playlists/' + p.slug,
      type: 'website',
      images: p.cover_asset_url ? [{ url: p.cover_asset_url, alt: p.canonical_name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: p.cover_asset_url ? [p.cover_asset_url] : undefined,
    },
  };
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPlaylist(slug);
  if (!result) notFound();

  const { playlist, highlights } = result;
  const all = await getPlaylists();
  const related = relatedPlaylists(playlist, all);
  const updated = playlist.last_editorial_update_at || playlist.updated_at;
  const updatedLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(updated));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    '@id': siteUrl + '/playlists/' + playlist.slug + '#playlist',
    name: playlist.canonical_name,
    description: playlist.description,
    url: siteUrl + '/playlists/' + playlist.slug,
    image: playlist.cover_asset_url || undefined,
    genre: [playlist.primary_genre, ...playlist.secondary_genres],
    numTracks: playlist.current_track_count || highlights.length || undefined,
    track: highlights.map((track, index) => ({
      '@type': 'MusicRecording',
      position: track.position ?? index + 1,
      name: track.track_name || undefined,
      byArtist: track.artists.map((name) => ({ '@type': 'MusicGroup', name })),
      url: track.spotify_url || undefined,
    })),
    creator: { '@type': 'Organization', name: 'BVSS FVM', url: siteUrl },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="shell playlist-detail-hero">
        <div>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">BVSS FVM</Link><span>›</span><Link href="/playlists">Playlists</Link><span>›</span><span>{playlist.primary_genre}</span>
          </nav>
          <p className="eyebrow">{playlist.primary_genre}</p>
          <h1>{playlist.canonical_name}</h1>
          <p className="lead">{playlist.subtitle}</p>
          <p className="playlist-editorial">{playlist.description}</p>
          <div className="chip-row">
            {[...playlist.secondary_genres, ...playlist.moods].slice(0, 8).map((tag) => <span className="chip" key={tag}>{tag}</span>)}
          </div>
          <div className="actions">
            <PlaylistAnalytics slug={playlist.slug} spotifyUrl={playlist.spotify_url} />
            {playlist.submission_status === 'open' && <Link className="button button-secondary" href={'/submit?playlist=' + playlist.slug}>Submit a track</Link>}
          </div>
          <p className="muted playlist-updated">Curated by BVSS FVM · {playlist.update_cadence} updates · Page updated {updatedLabel}</p>
        </div>
        <div className="playlist-player-stack">
          {playlist.cover_asset_url && <img className="playlist-detail-cover" src={playlist.cover_asset_url} alt={'Cover for ' + playlist.canonical_name} />}
          <iframe
            className="spotify-embed"
            title={playlist.canonical_name + ' on Spotify'}
            src={'https://open.spotify.com/embed/playlist/' + playlist.spotify_playlist_id}
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      </section>

      <section className="section">
        <div className="shell editorial-columns">
          <article className="card">
            <p className="eyebrow">Curation philosophy</p>
            <h3>What belongs here</h3>
            <p>{playlist.curation_philosophy}</p>
            <p><strong>Anchor artists:</strong> {playlist.anchor_artists.join(', ')}</p>
          </article>
          <article className="card">
            <p className="eyebrow">Listener intent</p>
            <h3>When this playlist works</h3>
            <div className="chip-row">{playlist.activities.map((activity) => <span className="chip" key={activity}>{activity}</span>)}</div>
            <p><strong>Moods:</strong> {playlist.moods.join(', ')}</p>
          </article>
          <article className="card">
            <p className="eyebrow">Artist submissions</p>
            <h3>Selection criteria</h3>
            <p>{playlist.submission_criteria}</p>
            <Link className="card-link" href={'/submit?playlist=' + playlist.slug}>Submit for consideration →</Link>
          </article>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="section">
          <div className="shell">
            <p className="eyebrow">Current highlights</p>
            <h2>Inside the rotation.</h2>
            <div className="track-list">
              {highlights.map((track, index) => (
                <a href={track.spotify_url || '#'} target="_blank" rel="noreferrer" key={track.spotify_track_id}>
                  <span>{String(track.position ?? index + 1).padStart(2, '0')}</span>
                  <strong>{track.track_name || 'Spotify track'}</strong>
                  <small>{track.artists.join(', ')}</small>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Related BVSS FVM playlists</p>
          <div className="related-playlists">
            {related.map((item) => (
              <Link className="card" href={'/playlists/' + item.slug} key={item.id}>
                <p className="eyebrow">{item.primary_genre}</p>
                <h3>{item.canonical_name}</h3>
                <p>{item.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
