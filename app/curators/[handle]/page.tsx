import { curatorOwnership } from '../../../lib/network-ownership';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCurator } from '../../../lib/curator-network';
import { siteUrl } from '../../../lib/site-url';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const result = await getPublicCurator(handle);
  if (!result) return { title: 'Curator not found' };
  return {
    title: result.curator.display_name + ' — Playlist Curator',
    description: result.curator.bio || 'Curator in the BVSS FVM network.',
    alternates: { canonical: '/curators/' + result.curator.handle },
  };
}

export default async function CuratorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const result = await getPublicCurator(handle);
  if (!result) notFound();
  const { curator, playlists } = result;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': siteUrl + '/curators/' + curator.handle + '#profile',
    url: siteUrl + '/curators/' + curator.handle,
    name: curator.display_name + ' — BVSS FVM Curator',
    mainEntity: {
      '@type': curatorOwnership(curator.handle) === 'in_house' ? 'Organization' : 'Person',
      name: curator.display_name,
      description: curator.bio || undefined,
      url: curator.website_url || siteUrl + '/curators/' + curator.handle,
      sameAs: [curator.spotify_profile_url, ...Object.values(curator.social_links || {})].filter(Boolean),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="shell page-hero curator-profile-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">BVSS FVM</Link><span>›</span><Link href="/curators">Curators</Link><span>›</span><span>{curator.display_name}</span>
        </nav>
        <p className="eyebrow">{curatorOwnership(curator.handle) === 'in_house' ? 'In-house curation team · operates alongside BVSS FVM' : 'Independent curator · BVSS FVM network'}</p>
        <h1>{curator.display_name}</h1>
        <p className="lead">{curator.bio || 'Curator in the BVSS FVM network.'}</p>
        <div className="chip-row">
          {[...curator.genres, ...curator.moods].slice(0, 10).map((value) => <span className="chip" key={value}>{value}</span>)}
        </div>
        <div className="actions">
          {curator.spotify_profile_url && <a className="button" href={curator.spotify_profile_url} target="_blank" rel="noreferrer">Spotify profile</a>}
          {curator.website_url && <a className="button button-secondary" href={curator.website_url} target="_blank" rel="noreferrer">Website</a>}
        </div>
      </section>

      <section className="proof-strip">
        <div className="shell proof-grid">
          <div><span>Verified playlists</span><strong>{curator.verified_playlist_count}</strong></div>
          <div><span>Completed reviews</span><strong>{curator.reviews_completed}</strong></div>
          <div><span>Median response</span><strong>{curator.median_response_hours == null ? 'Building history' : Math.round(curator.median_response_hours) + ' hours'}</strong></div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Verified playlists</p>
          <h2>Open curator lanes.</h2>
          {playlists.length ? (
            <div className="playlist-grid">
              {playlists.map((playlist) => (
                <Link className="playlist-card" href={'/playlists/' + playlist.slug} key={playlist.id}>
                  {playlist.cover_asset_url ? (
                    <img src={playlist.cover_asset_url} alt={playlist.canonical_name + ' playlist cover'} />
                  ) : <div className="playlist-art-placeholder" />}
                  <div className="playlist-card-body">
                    <p className="eyebrow">{playlist.primary_genre}</p>
                    <h3>{playlist.canonical_name}</h3>
                    <p>{playlist.description}</p>
                    <div className="chip-row">{playlist.moods.slice(0, 3).map((mood) => <span className="chip" key={mood}>{mood}</span>)}</div>
                    <span className="card-link">View playlist →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="muted">No public verified playlists yet.</p>}
        </div>
      </section>
    </main>
  );
}
