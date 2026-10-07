'use client';

import Link from 'next/link';
import { useId, useMemo, useRef, useState } from 'react';
import {
  describeReasons,
  fitVocabulary,
  matchPlaylists,
  MAX_MOODS,
  moodsForGenre,
  taxonomyKey,
  TOP_RESULTS,
  type FitInput,
  type FitPlaylist,
  type FitResult,
} from '../../../lib/playlist-fit';

export const FIT_DISCLOSURE =
  'Playlist fit is based on the genre, mood and listening context you selected. It is not a quality rating and does not predict whether a curator will place the track.';

function curatorName(playlist: FitPlaylist) {
  if (playlist.network_owner_type === 'partner') {
    return 'CuratorOS' + (playlist.bvss_curator_profiles?.display_name ? ' · ' + playlist.bvss_curator_profiles.display_name : '');
  }
  return 'BVSS FVM';
}

function ResultCard({ result }: { result: FitResult }) {
  const { playlist } = result;
  const headingId = 'fit-' + playlist.slug;
  return (
    <li className="fit-result" aria-labelledby={headingId}>
      {playlist.cover_asset_url
        ? <img src={playlist.cover_asset_url} alt="" loading="lazy" width={88} height={88} />
        : <div className="playlist-art-placeholder" aria-hidden="true" />}
      <div className="fit-result-body">
        <p className={'fit-label fit-label-' + result.label.split(' ')[0].toLowerCase()}>{result.label}</p>
        <h3 id={headingId}>{playlist.canonical_name}</h3>
        <p className="fit-result-meta">
          Curated by {curatorName(playlist)} · Open for submissions
        </p>
        <p className="fit-result-why"><strong>Why it fits:</strong> {describeReasons(result.reasons)}</p>
        {!result.reasons.some((reason) => reason.kind === 'primaryGenre' || reason.kind === 'secondaryGenre') && (
          <p className="fit-result-note">Different genre: this playlist’s primary genre is {playlist.primary_genre}. Listen first to check it suits your song.</p>
        )}
        <div className="playlist-card-actions">
          <Link className="button button-small" href={'/submit?playlist=' + encodeURIComponent(playlist.slug)}>
            Submit to this playlist<span className="visually-hidden">: {playlist.canonical_name}</span>
          </Link>
          <Link className="button button-small button-secondary" href={'/playlists/' + playlist.slug}>
            View playlist<span className="visually-hidden">: {playlist.canonical_name}</span>
          </Link>
        </div>
      </div>
    </li>
  );
}

export default function FitChecker({ playlists }: { playlists: FitPlaylist[] }) {
  const ids = useId();
  const genreRef = useRef<HTMLSelectElement>(null);
  const [genre, setGenre] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [activity, setActivity] = useState('');
  const [releaseState, setReleaseState] = useState<'' | 'released' | 'unreleased'>('');
  const [showAll, setShowAll] = useState(false);

  const vocab = useMemo(() => fitVocabulary(playlists), [playlists]);
  const suggested = useMemo(() => {
    const relevant = moodsForGenre(playlists, genre);
    return (relevant.length ? relevant : vocab.moods).slice(0, 14);
  }, [playlists, genre, vocab.moods]);
  const more = useMemo(
    () => vocab.moods.filter((mood) => !suggested.some((value) => taxonomyKey(value) === taxonomyKey(mood))),
    [vocab.moods, suggested],
  );

  const results = useMemo(() => {
    if (!genre) return [];
    const input: FitInput = { genre, moods, activity: activity || undefined, releaseState: releaseState || undefined };
    return matchPlaylists(playlists, input);
  }, [playlists, genre, moods, activity, releaseState]);
  const shown = showAll ? results : results.slice(0, TOP_RESULTS);

  function update<T>(setter: (value: T) => void) {
    return (value: T) => { setter(value); setShowAll(false); };
  }

  function toggleMood(mood: string) {
    setShowAll(false);
    setMoods((current) => {
      if (current.some((value) => taxonomyKey(value) === taxonomyKey(mood))) {
        return current.filter((value) => taxonomyKey(value) !== taxonomyKey(mood));
      }
      return current.length >= MAX_MOODS ? current : [...current, mood];
    });
  }

  function reset() {
    setGenre(''); setMoods([]); setActivity(''); setReleaseState(''); setShowAll(false);
    genreRef.current?.focus();
  }

  function broaden() {
    setMoods([]); setActivity(''); setReleaseState(''); setShowAll(false);
    genreRef.current?.focus();
  }

  const status = !genre
    ? 'Choose a primary genre to see playlists that fit.'
    : results.length
      ? results.length === 1
        ? '1 playlist fits what you described.'
        : results.length + ' playlists fit what you described.'
          + (results.length > TOP_RESULTS && !showAll ? ' Showing the strongest ' + TOP_RESULTS + '.' : '')
      : 'No playlists match these inputs.';

  const moodButton = (mood: string) => {
    const selected = moods.some((value) => taxonomyKey(value) === taxonomyKey(mood));
    const full = !selected && moods.length >= MAX_MOODS;
    return (
      <button
        type="button"
        key={mood}
        className={selected ? 'chip taxonomy-chip selected' : 'chip taxonomy-chip'}
        aria-pressed={selected}
        disabled={full}
        onClick={() => toggleMood(mood)}
      >
        {mood}
      </button>
    );
  };

  if (!vocab.genres.length) {
    return (
      <div className="card fit-unavailable" role="status">
        <h2>The playlist list is not available right now.</h2>
        <p>Please try again shortly, or <Link className="inline-link" href="/playlists">browse every playlist</Link>.</p>
      </div>
    );
  }

  return (
    <div className="fit-checker">
      <form className="fit-form card" onSubmit={(event) => event.preventDefault()} aria-labelledby={ids + 'form-title'}>
        <h2 id={ids + 'form-title'}>Describe your song</h2>
        <p className="muted">Released or unreleased. No Spotify link, login or email needed.</p>

        <div className="field">
          <label htmlFor={ids + 'genre'}>Primary genre <span className="muted">(required)</span></label>
          <select
            id={ids + 'genre'}
            ref={genreRef}
            required
            aria-required="true"
            value={genre}
            onChange={(event) => update(setGenre)(event.target.value)}
          >
            <option value="">Choose the closest genre…</option>
            {vocab.genres.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <small className="muted">The genre a listener would hear, not the one you hope to reach.</small>
        </div>

        <fieldset className="field taxonomy-field">
          <legend>Moods <span className="muted">(optional, up to {MAX_MOODS})</span></legend>
          <div className="chip-row taxonomy-chips">{suggested.map(moodButton)}</div>
          {!!more.length && (
            <details className="taxonomy-more">
              <summary>More moods</summary>
              <div className="chip-row taxonomy-chips">{more.map(moodButton)}</div>
            </details>
          )}
          <small className="muted" aria-live="polite">
            {moods.length ? moods.length + ' of ' + MAX_MOODS + ' selected: ' + moods.join(', ') : 'None selected'}
          </small>
        </fieldset>

        <div className="form-grid">
          <div className="field">
            <label htmlFor={ids + 'activity'}>Listening moment <span className="muted">(optional)</span></label>
            <select id={ids + 'activity'} value={activity} onChange={(event) => update(setActivity)(event.target.value)}>
              <option value="">Any moment</option>
              {vocab.activities.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids + 'release'}>Is it out yet? <span className="muted">(optional)</span></label>
            <select
              id={ids + 'release'}
              value={releaseState}
              onChange={(event) => update(setReleaseState)(event.target.value as '' | 'released' | 'unreleased')}
            >
              <option value="">Not sure</option>
              <option value="released">Released</option>
              <option value="unreleased">Unreleased</option>
            </select>
          </div>
        </div>

        <button type="button" className="text-button" onClick={reset}>Reset</button>
      </form>

      <section className="fit-results" aria-labelledby={ids + 'results-title'}>
        <h2 id={ids + 'results-title'}>Playlists that fit</h2>
        <p className="fit-disclosure">{FIT_DISCLOSURE}</p>
        <p className="fit-status" role="status" aria-live="polite">{status}</p>

        {genre && results.length > 0 && (
          <>
            <ol className="fit-result-list">
              {shown.map((result) => <ResultCard key={result.playlist.id} result={result} />)}
            </ol>
            {results.length > TOP_RESULTS && (
              <button type="button" className="button button-secondary button-small" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>
                {showAll ? 'Show the strongest ' + TOP_RESULTS : 'Show all ' + results.length + ' matches'}
              </button>
            )}
          </>
        )}

        {genre && !results.length && (
          <div className="card fit-empty">
            <h3>Nothing in our network clearly fits this description.</h3>
            <p>We would rather say so than suggest playlists that do not suit your song.</p>
            <ul>
              <li>Remove a mood, the listening moment or the release status, or choose a broader genre.</li>
              <li>Browse every playlist and read what each one is looking for.</li>
            </ul>
            <div className="actions">
              {(moods.length > 0 || activity || releaseState) && (
                <button type="button" className="button button-small" onClick={broaden}>Keep the genre, clear the rest</button>
              )}
              <Link className="button button-small button-secondary" href="/playlists">Browse all playlists</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
