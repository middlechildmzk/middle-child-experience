import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlaylists } from '../../../../lib/playlist-os';
import {
  getPlaylistCollection,
  playlistsInCollection,
  relatedCollections,
} from '../../../../lib/playlist-collections';
import { siteUrl } from '../../../../lib/site-url';
import { describeFollowersPublic } from '../../../../lib/source-health';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = getPlaylistCollection(slug);
  if (!collection) return { title: 'Playlist collection not found' };
  return {
    title: collection.seoTitle,
    description: collection.description,
    alternates: { canonical: '/playlists/collections/' + collection.slug },
    keywords: collection.intent.split(',').map((value) => value.trim()),
    openGraph: {
      title: collection.seoTitle,
      description: collection.description,
      url: '/playlists/collections/' + collection.slug,
      type: 'website',
    },
  };
}

export default async function PlaylistCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getPlaylistCollection(slug);
  if (!collection) notFound();

  const playlists = await getPlaylists();
  const active = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  const network = active.length ? active : playlists;
  const matches = playlistsInCollection(collection, network);
  const related = relatedCollections(collection);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': siteUrl + '/playlists/collections/' + collection.slug + '#collection',
    name: collection.title,
    description: collection.description,
    url: siteUrl + '/playlists/collections/' + collection.slug,
    isPartOf: { '@type': 'WebSite', '@id': siteUrl + '/#website' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: matches.length,
      itemListElement: matches.map((playlist, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: playlist.canonical_name,
        url: siteUrl + '/playlists/' + playlist.slug,
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BVSS FVM', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Playlists', item: siteUrl + '/playlists' },
      { '@type': 'ListItem', position: 3, name: 'Collections', item: siteUrl + '/playlists/collections' },
      { '@type': 'ListItem', position: 4, name: collection.eyebrow, item: siteUrl + '/playlists/collections/' + collection.slug },
    ],
  };

  const faq = [
    {
      question: 'What is included in this playlist collection?',
      answer: collection.description + ' Each playlist keeps its own curator, editorial lane and Spotify destination.',
    },
    {
      question: 'Are these playlists human curated?',
      answer: 'Yes. The network combines BVSS FVM playlists and verified CuratorOS playlists. Playlist fit and placement decisions remain human editorial decisions.',
    },
    {
      question: 'Can independent artists submit music to these playlists?',
      answer: 'Yes, when a playlist is marked open for submissions. Use the playlist page to submit directly to that lane or use the main submission form for broader matching.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="shell page-hero collection-detail-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">BVSS FVM</Link><span>›</span><Link href="/playlists">Playlists</Link><span>›</span>
          <Link href="/playlists/collections">Collections</Link><span>›</span><span>{collection.eyebrow}</span>
        </nav>
        <p className="eyebrow">{collection.eyebrow}</p>
        <h1>{collection.title}</h1>
        <p className="lead">{collection.description}</p>
        <p className="collection-intro">{collection.intro}</p>
        <div className="actions">
          <a className="button" href="#playlists">Explore {matches.length} playlists</a>
          <Link className="button button-secondary" href="/submit">Submit music</Link>
          <Link className="button button-secondary" href="/playlists/collections">All collections</Link>
        </div>
      </section>

      <section className="proof-strip" aria-label="Collection facts">
        <div className="shell proof-grid">
          <div><span>Collection</span><strong>{matches.length} curated playlists</strong></div>
          <div><span>Network</span><strong>BVSS FVM + CuratorOS</strong></div>
          <div><span>Discovery</span><strong>Genre, mood & activity intent</strong></div>
        </div>
      </section>

      <section className="section" id="playlists">
        <div className="shell">
          <p className="eyebrow">Inside this collection</p>
          <h2>Choose the specific lane.</h2>
          <p className="playlist-network-intro">{collection.intent}</p>
          <div className="playlist-grid">
            {matches.map((playlist) => {
              const curatorName = playlist.network_owner_type === 'partner' && playlist.bvss_curator_profiles?.display_name
                ? playlist.bvss_curator_profiles.display_name
                : 'BVSS FVM';
              const followers = describeFollowersPublic(playlist);
              return (
                <Link className="playlist-card" href={'/playlists/' + playlist.slug} key={playlist.id}>
                  {playlist.cover_asset_url ? (
                    <img src={playlist.cover_asset_url} alt={playlist.canonical_name + ' playlist cover'} loading="lazy" />
                  ) : <div className="playlist-art-placeholder" aria-hidden="true" />}
                  <div className="playlist-card-body">
                    <p className="eyebrow">{playlist.primary_genre} · {curatorName}</p>
                    <h3>{playlist.canonical_name}</h3>
                    <p>{playlist.description}</p>
                    <div className="chip-row">
                      {playlist.moods.slice(0, 3).map((mood) => <span className="chip" key={mood}>{mood}</span>)}
                    </div>
                    <div className="playlist-card-proof">
                      <strong data-follower-state={followers.state} title={followers.detail || undefined}>{followers.label}</strong>
                      <span>{playlist.current_track_count != null ? playlist.current_track_count.toLocaleString() + ' tracks' : 'Track count syncing'}</span>
                    </div>
                    <span className="card-link">Open playlist →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section collection-editorial">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Listening guide</p>
            <h2>Broad intent. Specific playlists.</h2>
          </div>
          <div>
            <p className="lead compact-lead">{collection.intro}</p>
            <p className="muted">
              The goal of this page is discovery, not duplication. Each playlist remains the canonical home
              for its own curation, Spotify embed, editorial criteria and direct submission route.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Related collections</p>
          <h2>Keep exploring.</h2>
          <div className="collection-related-grid">
            {related.map((item) => (
              <Link className="card collection-related-card" href={'/playlists/collections/' + item.slug} key={item.slug}>
                <p className="eyebrow">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="card-link">Explore collection →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Playlist FAQ</p>
          <div className="editorial-columns">
            {faq.map((item) => (
              <article className="card" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
