'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PlaylistRecord } from '../../lib/playlist-os';
import { describeFollowersPublic } from '../../lib/source-health';

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function PlaylistBrowser({ playlists }: { playlists: PlaylistRecord[] }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [mood, setMood] = useState('all');
  const [activity, setActivity] = useState('all');
  const [curator, setCurator] = useState('all');

  const genres = useMemo(
    () => unique(playlists.flatMap((p) => [p.primary_genre, ...p.secondary_genres])),
    [playlists],
  );
  const moods = useMemo(() => unique(playlists.flatMap((p) => p.moods)), [playlists]);
  const activities = useMemo(() => unique(playlists.flatMap((p) => p.activities)), [playlists]);
  const curators = useMemo(
    () => unique(playlists.map((p) =>
      p.network_owner_type === 'partner' && p.bvss_curator_profiles?.display_name
        ? p.bvss_curator_profiles.display_name
        : 'BVSS FVM',
    )),
    [playlists],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return playlists.filter((p) => {
      const genreValues = [p.primary_genre, ...p.secondary_genres].map((v) => v.toLowerCase());
      const moodValues = p.moods.map((v) => v.toLowerCase());
      const activityValues = p.activities.map((v) => v.toLowerCase());
      const curatorName = p.network_owner_type === 'partner' && p.bvss_curator_profiles?.display_name
        ? p.bvss_curator_profiles.display_name
        : 'BVSS FVM';
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
        && (genre === 'all' || genreValues.includes(genre.toLowerCase()))
        && (mood === 'all' || moodValues.includes(mood.toLowerCase()))
        && (activity === 'all' || activityValues.includes(activity.toLowerCase()))
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
          {filtered.map((playlist) => (
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
