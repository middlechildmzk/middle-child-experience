
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlaylist, getPlaylists, relatedPlaylists } from '../../../lib/playlist-os';
import { describeFollowersPublic } from '../../../lib/source-health';
import { siteUrl } from '../../../lib/site-url';
import PlaylistAnalytics from '../PlaylistAnalytics';
import PlaylistShareButton from '../PlaylistShareButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPlaylist(slug);
  if (!result) return { title: 'Playlist not found' };
  const p = result.playlist;
  const shortName = p.canonical_name.split('|')[0].trim();
  const title = shortName + ' Spotify Playlist';
  const secondary = p.secondary_genres.slice(0, 2).join(' & ');
  const moments = p.activities.slice(0, 2).join(' & ').toLowerCase();
  const description = [
    'Listen to ' + shortName + ': human-curated ' + p.primary_genre.toLowerCase(),
    secondary ? secondary : null,
    moments ? 'for ' + moments : null,
    'Updated ' + p.update_cadence + '.',
  ].filter(Boolean).join(', ').replace(', Updated', '. Updated');
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

  const curator = playlist.network_owner_type === 'partner' ? playlist.bvss_curator_profiles : null;
  const curatorLabel = curator?.display_name || 'BVSS FVM';
  const curatorHref = curator?.handle ? '/curators/' + curator.handle : null;
  const anchorNames = playlist.anchor_artists.slice(0, 6);
  const anchorReference = anchorNames.length
    ? ' and uses artists such as ' + anchorNames.slice(0, 5).join(', ') + ' as reference points'
    : '';
  const adjacentGenres = playlist.secondary_genres.slice(0, 4);
  const adjacentPhrase = adjacentGenres.length ? ' with adjacent shades of ' + adjacentGenres.join(', ') : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    '@id': siteUrl + '/playlists/' + playlist.slug + '#playlist',
    name: playlist.canonical_name,
    description: playlist.description,
    url: siteUrl + '/playlists/' + playlist.slug,
    sameAs: playlist.spotify_url,
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
    creator: curator?.handle
      ? { '@type': 'Person', name: curator.display_name, url: siteUrl + '/curators/' + curator.handle }
      : { '@id': siteUrl + '/#organization' },
  };

  const faq = [
    {
      question: 'What kind of music is on ' + playlist.canonical_name + '?',
      answer: 'This playlist centers on ' + [playlist.primary_genre, ...playlist.secondary_genres].join(', ') + '. The curation leans ' + playlist.moods.join(', ') + anchorReference + ' while leaving room for emerging records.',
    },
    {
      question: 'When is this playlist updated?',
      answer: curatorLabel + ' reviews and refreshes this playlist on a ' + playlist.update_cadence + ' cadence. Tracks can move in or out as the lane evolves, and placement is based on editorial fit rather than guaranteed rotation.',
    },
    {
      question: 'Can independent artists submit music for this playlist?',
      answer: playlist.submission_status === 'open'
        ? 'Yes. Independent artists can submit one Spotify track through the BVSS FVM submission form. The system may suggest likely playlist fits, but a human curator makes the final decision.'
        : 'Submissions for this playlist are currently paused. BVSS FVM only accepts music for playlists whose submission status is open.',
    },
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BVSS FVM', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Playlists', item: siteUrl + '/playlists' },
      { '@type': 'ListItem', position: 3, name: playlist.canonical_name, item: siteUrl + '/playlists/' + playlist.slug },
    ],
  };

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
          <div className="playlist-live-proof" aria-label="Current playlist facts">
            <div>
              <span>Followers</span>
              <strong data-follower-state={describeFollowersPublic(playlist).state}>{describeFollowersPublic(playlist).value}</strong>
              {describeFollowersPublic(playlist).detail && <small className="follower-provenance">{describeFollowersPublic(playlist).detail}</small>}
            </div>
            <div>
              <span>Tracks</span>
              <strong>{playlist.current_track_count != null ? playlist.current_track_count.toLocaleString() : 'Syncing'}</strong>
            </div>
            <div>
              <span>Updates</span>
              <strong>{playlist.update_cadence}</strong>
            </div>
          </div>
          <div className="actions">
            <PlaylistAnalytics slug={playlist.slug} spotifyUrl={playlist.spotify_url} />
            <PlaylistShareButton slug={playlist.slug} name={playlist.canonical_name} />
            {playlist.submission_status === 'open' && <Link className="button button-secondary" href={'/submit?playlist=' + playlist.slug}>Submit a track</Link>}
          </div>
          <p className="muted playlist-updated">
            Curated by {curatorHref ? <Link href={curatorHref}>{curatorLabel}</Link> : curatorLabel} · follower source {playlist.follower_count_source || 'pending'} · page updated {updatedLabel}
          </p>
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
            {!!playlist.anchor_artists.length && <p><strong>Anchor artists:</strong> {playlist.anchor_artists.join(', ')}</p>}
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
            {playlist.submission_status === 'open'
              ? <Link className="card-link" href={'/submit?playlist=' + playlist.slug}>Submit for consideration →</Link>
              : <span className="muted">Submissions are currently {playlist.submission_status}.</span>}
          </article>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Inside the lane</p>
            <h2>A playlist with a specific point of view.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              {playlist.canonical_name} is built around {playlist.primary_genre.toLowerCase()}{adjacentPhrase}.
              The goal is not to collect every release in the lane; it is to create a coherent listening experience that feels {playlist.moods.slice(0, 4).join(', ').toLowerCase()} from front to back.
            </p>
            <p className="playlist-editorial">
              It is curated for moments like {playlist.activities.slice(0, 5).join(', ').toLowerCase()}. {anchorNames.length
                ? 'Artists such as ' + anchorNames.join(', ') + ' help define the lane, while independent and emerging records'
                : 'Independent and emerging records'} are judged on the same core question: does the track strengthen the experience of this playlist?
            </p>
          </div>
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
          <p className="eyebrow">Playlist FAQ</p>
          <h2>Before you listen or submit.</h2>
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

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Related playlists</p>
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
