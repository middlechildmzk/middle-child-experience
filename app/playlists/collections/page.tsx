import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlaylists } from '../../../lib/playlist-os';
import { playlistCollections, playlistsInCollection } from '../../../lib/playlist-collections';
import { siteUrl } from '../../../lib/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Playlist Collections | Genres, Moods & Activities',
  description:
    'Browse curated Spotify playlist collections by genre, mood and activity: electronic, house, indie, workout, focus, study, sleep, late night, pop and global music.',
  alternates: { canonical: '/playlists/collections' },
  openGraph: {
    title: 'Playlist Collections | BVSS FVM + CuratorOS',
    description:
      'Browse human-curated playlist collections for electronic music, house, indie, workouts, focus, moods, late nights and global pop.',
    url: '/playlists/collections',
    type: 'website',
  },
};

export default async function PlaylistCollectionsPage() {
  const playlists = await getPlaylists();
  const active = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  const network = active.length ? active : playlists;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': siteUrl + '/playlists/collections#collection',
    name: 'BVSS FVM Playlist Collections',
    description: 'Curated playlist hubs organized around genres, moods, activities and listening moments.',
    url: siteUrl + '/playlists/collections',
    isPartOf: { '@type': 'WebSite', '@id': siteUrl + '/#website' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: playlistCollections.length,
      itemListElement: playlistCollections.map((collection, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: collection.title,
        url: siteUrl + '/playlists/collections/' + collection.slug,
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="shell page-hero collection-index-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">BVSS FVM</Link><span>›</span><Link href="/playlists">Playlists</Link><span>›</span><span>Collections</span>
        </nav>
        <p className="eyebrow">Playlist collections</p>
        <h1>Start with the feeling, sound or moment.</h1>
        <p className="lead">
          Eight curated entry points into the BVSS FVM + CuratorOS network. Browse by genre, activity or
          listening intent instead of scrolling through every playlist at once.
        </p>
        <div className="actions">
          <Link className="button" href="/playlists">Browse all playlists</Link>
          <Link className="button button-secondary" href="/submit">Submit music</Link>
        </div>
      </section>

      <section className="section collection-index-section">
        <div className="shell">
          <div className="collection-hub-grid">
            {playlistCollections.map((collection) => {
              const matches = playlistsInCollection(collection, network);
              const covers = matches.filter((playlist) => playlist.cover_asset_url).slice(0, 4);
              return (
                <Link
                  className="collection-hub-card"
                  href={'/playlists/collections/' + collection.slug}
                  key={collection.slug}
                >
                  <div className="collection-cover-stack" aria-hidden="true">
                    {covers.map((playlist) => (
                      <img src={playlist.cover_asset_url || ''} alt="" key={playlist.id} loading="lazy" />
                    ))}
                  </div>
                  <div className="collection-hub-copy">
                    <p className="eyebrow">{collection.eyebrow}</p>
                    <h2>{collection.title}</h2>
                    <p>{collection.description}</p>
                    <div className="collection-hub-meta">
                      <strong>{matches.length} playlists</strong>
                      <span>BVSS FVM + CuratorOS</span>
                    </div>
                    <span className="card-link">Explore collection →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section growth-principles">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Why collections</p>
            <h2>Better discovery without duplicate playlists.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              Collections connect related playlists into useful listening paths. The underlying playlists
              keep their own editorial identity while the hubs make it easier to move from a broad search
              like workout music or indie playlists into a specific lane.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
