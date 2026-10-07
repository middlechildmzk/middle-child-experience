'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PlaylistRecord } from '../../lib/playlist-os';
import { taxonomyKey, uniqueTaxonomy } from '../../lib/playlist-fit';
import { playlistCuratorName } from '../../lib/playlist-identity';
import { describeFollowersPublic } from '../../lib/source-health';


// mode 'submit' (used by /free-spotify-playlist-submission) keeps the same
// registry and filters but gives every card a direct, free submit action that
// pre-selects the playlist in the existing /submit flow.
export default function PlaylistBrowser({
  playlists,
  mode = 'browse',
}: {
  playlists: PlaylistRecord[];
  mode?: 'browse' | 'submit';
}) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [mood, setMood] = useState('all');
  const [activity, setActivity] = useState('all');
  const [curator, setCurator] = useState('all');

  const genres = useMemo(
    () => uniqueTaxonomy(playlists.flatMap((p) => [p.primary_genre, ...p.secondary_genres])),
    [playlists],
  );
  const moods = useMemo(() => uniqueTaxonomy(playlists.flatMap((p) => p.moods)), [playlists]);
  const activities = useMemo(() => uniqueTaxonomy(playlists.flatMap((p) => p.activities)), [playlists]);
  const curators = useMemo(
    () => Array.from(new Set(playlists.map(playlistCuratorName))).sort((a, b) => a.localeCompare(b)),
    [playlists],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return playlists.filter((p) => {
      const genreValues = [p.primary_genre, ...p.secondary_genres].map(taxonomyKey);
      const moodValues = p.moods.map(taxonomyKey);
      const activityValues = p.activities.map(taxonomyKey);
      const curatorName = playlistCuratorName(p);
      const haystack = [
        p.canonical_name,
        p.subtitle,
        p.description,
        p.primary_genre,
        ...p.secondary_genres,
        ...p.moods,
        ...p.activities,
        ...p.anchor_artists,
        curatorName,
      ].join(' ').toLowerCase();

      return (!q || haystack.includes(q))
        && (genre === 'all' || genreValues.includes(taxonomyKey(genre)))
        && (mood === 'all' || moodValues.includes(taxonomyKey(mood)))
        && (activity === 'all' || activityValues.includes(taxonomyKey(activity)))
        && (curator === 'all' || curatorName === curator);
    });
  }, [playlists, query, genre, mood, activity, curator]);

  function reset() {
    setQuery('');
    setGenre('all');
    setMood('all');
    setActivity('all');
    setCurator('all');
  }

  return (
    <div className="playlist-browser">
      <div className="playlist-browser-controls" aria-label="Filter BVSS FVM playlists">
        <div className="field playlist-search-field">
          <label htmlFor="playlist-search">Find your sound</label>
          <input
            id="playlist-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: night drive, trance, emotional, gaming…"
          />
        </div>
        <div className="field">
          <label htmlFor="playlist-genre">Genre</label>
          <select id="playlist-genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="all">All genres</option>
            {genres.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="playlist-mood">Mood</label>
          <select id="playlist-mood" value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="all">All moods</option>
            {moods.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="playlist-activity">Moment</label>
          <select id="playlist-activity" value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="all">Any moment</option>
            {activities.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="playlist-curator">Curator</label>
          <select id="playlist-curator" value={curator} onChange={(e) => setCurator(e.target.value)}>
            <option value="all">All curators</option>
            {curators.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </div>

      <div className="playlist-browser-summary" aria-live="polite">
        <span><strong>{filtered.length}</strong> of {playlists.length} playlists</span>
        {(query || genre !== 'all' || mood !== 'all' || activity !== 'all' || curator !== 'all') && (
          <button className="text-button" type="button" onClick={reset}>Clear filters</button>
        )}
      </div>

      {filtered.length ? (
        <div className="playlist-grid">
          {filtered.map((playlist) => mode === 'submit' ? (
            <article className="playlist-card playlist-card-submit" key={playlist.id}>
              {playlist.cover_asset_url ? (
                <img
                  src={playlist.cover_asset_url}
                  alt={playlist.canonical_name + ' playlist cover'}
                  loading="lazy"
                />
              ) : <div className="playlist-art-placeholder" aria-hidden="true" />}
              <div className="playlist-card-body">
                <p className="eyebrow">
                  {playlist.primary_genre}
                  {playlist.network_owner_type === 'partner' && playlist.bvss_curator_profiles?.display_name
                    ? ' · ' + playlist.bvss_curator_profiles.display_name
                    : ''}
                </p>
                <h3>{playlist.canonical_name}</h3>
                <p>{playlist.description}</p>
                <div className="chip-row">
                  {playlist.moods.slice(0, 3).map((value) => <span className="chip" key={value}>{value}</span>)}
                </div>
                <div className="playlist-card-proof">
                  <strong title={describeFollowersPublic(playlist).detail || undefined} data-follower-state={describeFollowersPublic(playlist).state}>
                    {describeFollowersPublic(playlist).label}
                  </strong>
                  <span>
                    {playlist.current_track_count != null
                      ? playlist.current_track_count.toLocaleString() + ' tracks'
                      : 'Track count syncing'}
                  </span>
                </div>
                <p className="playlist-card-meta">
                  Updated {playlist.update_cadence} · Submissions {playlist.submission_status}
                </p>
                {!!playlist.anchor_artists.length && (
                  <small className="playlist-card-sounds">
                    Sounds like: {playlist.anchor_artists.slice(0, 3).join(', ')}
                  </small>
                )}
                <div className="playlist-card-actions">
                  {playlist.submission_status === 'open' ? (
                    <Link className="button button-small" href={'/submit?playlist=' + encodeURIComponent(playlist.slug)}>
                      Submit free
                    </Link>
                  ) : (
                    <span className="playlist-card-closed">Submissions {playlist.submission_status}</span>
                  )}
                  <Link className="button button-small button-secondary" href={'/playlists/' + playlist.slug}>View playlist</Link>
                </div>
              </div>
            </article>
          ) : (
            <Link className="playlist-card" href={'/playlists/' + playlist.slug} key={playlist.id}>
              {playlist.cover_asset_url ? (
                <img
                  src={playlist.cover_asset_url}
                  alt={playlist.canonical_name + ' playlist cover'}
                  loading="lazy"
                />
              ) : <div className="playlist-art-placeholder" aria-hidden="true" />}
              <div className="playlist-card-body">
                <p className="eyebrow">
                  {playlist.primary_genre}
                  {playlist.network_owner_type === 'partner' && playlist.bvss_curator_profiles?.display_name
                    ? ' · ' + playlist.bvss_curator_profiles.display_name
                    : ''}
                </p>
                <h3>{playlist.canonical_name}</h3>
                <p>{playlist.description}</p>
                <div className="chip-row">
                  {playlist.moods.slice(0, 3).map((value) => <span className="chip" key={value}>{value}</span>)}
                </div>
                <div className="playlist-card-proof">
                  <strong title={describeFollowersPublic(playlist).detail || undefined} data-follower-state={describeFollowersPublic(playlist).state}>
                    {describeFollowersPublic(playlist).label}
                  </strong>
                  <span>
                    {playlist.current_track_count != null
                      ? playlist.current_track_count.toLocaleString() + ' tracks'
                      : 'Track count syncing'}
                  </span>
                </div>
                <p className="playlist-card-meta">
                  Updated {playlist.update_cadence} · Submissions {playlist.submission_status}
                </p>
                {!!playlist.anchor_artists.length && (
                  <small className="playlist-card-sounds">
                    Sounds like: {playlist.anchor_artists.slice(0, 3).join(', ')}
                  </small>
                )}
                <span className="card-link">Open playlist →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card playlist-empty">
          <h3>No playlist matches those filters yet.</h3>
          <p>Clear one filter or try a broader sound, mood or listening moment.</p>
          <button className="button button-secondary" type="button" onClick={reset}>Show all playlists</button>
        </div>
      )}
    </div>
  );
}
