'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  playlistApiBase,
  PlaylistRecord,
  supabasePublishableKey,
  supabaseUrl,
} from '../../lib/playlist-os';
import { taxonomyKey, uniqueTaxonomy } from '../../lib/playlist-fit';
import { CURATOROS_DESCRIPTION, ownershipLabel, playlistOwnership } from '../../lib/network-ownership';

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const audioBucket = 'bvss-submission-audio';

type TrackIdentity = {
  source: 'spotify';
  spotify_track_id: string;
  spotify_url: string;
  title: string | null;
  artist_name: string | null;
  artwork_url: string | null;
  release_date: string | null;
  is_explicit: boolean | null;
  album_name?: string | null;
};

type Result = {
  ok: boolean;
  submission?: { id: string; status: string; release_state?: 'released' | 'unreleased' };
  status_url?: string;
  routed_to?: { bvss: number; partner_curators: number };
  suggested_playlists?: {
    slug: string;
    name: string;
    score: number;
    reasons: string[];
    network_owner_type?: 'bvss' | 'partner';
  }[];
  editorial_notice?: string;
  error?: string;
  message?: string;
};

function isSpotifyTrackUrl(value: string) {
  return /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/[A-Za-z0-9]{22}(?:\?.*)?$/i.test(value.trim());
}

export default function SubmissionForm({
  playlists,
  initialPlaylist,
  spotifyTextSearchConfigured = false,
}: {
  playlists: PlaylistRecord[];
  initialPlaylist?: string;
  spotifyTextSearchConfigured?: boolean;
}) {
  const initial = useMemo(() => initialPlaylist ? [initialPlaylist] : [], [initialPlaylist]);
  const initialTarget = useMemo(
    () => playlists.find((playlist) => playlist.slug === initialPlaylist) || null,
    [initialPlaylist, playlists],
  );
  const [mode, setMode] = useState<'released' | 'unreleased'>('released');
  const [query, setQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<TrackIdentity | null>(null);
  const [searchResults, setSearchResults] = useState<TrackIdentity[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [genre, setGenre] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [preferred, setPreferred] = useState<string[]>(initial);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [privateLink, setPrivateLink] = useState('');
  const [downloadPermission, setDownloadPermission] = useState(false);
  const [networkOptIn, setNetworkOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  // Ownership-aware opt-in wording: only mention independent curators if one exists.
  const hasExternalCurators = useMemo(
    () => playlists.some((playlist) => playlist.submission_status === 'open' && playlistOwnership(playlist) === 'external'),
    [playlists],
  );

  const genreOptions = useMemo(
    () => uniqueTaxonomy(
      playlists
        .filter((playlist) => playlist.submission_status === 'open' && playlist.lifecycle_state === 'active')
        .flatMap((playlist) => [playlist.primary_genre, ...(playlist.secondary_genres || [])]),
    ),
    [playlists],
  );

  const allMoodOptions = useMemo(
    () => uniqueTaxonomy(
      playlists
        .filter((playlist) => playlist.submission_status === 'open' && playlist.lifecycle_state === 'active')
        .flatMap((playlist) => playlist.moods || []),
    ),
    [playlists],
  );

  const suggestedMoods = useMemo(() => {
    if (!genre) return allMoodOptions.slice(0, 14);
    const key = taxonomyKey(genre);
    const matched = playlists.filter((playlist) =>
      [playlist.primary_genre, ...(playlist.secondary_genres || [])]
        .some((value) => taxonomyKey(value) === key),
    );
    const relevant = uniqueTaxonomy(matched.flatMap((playlist) => playlist.moods || []));
    return (relevant.length ? relevant : allMoodOptions).slice(0, 14);
  }, [genre, playlists, allMoodOptions]);

  const extraMoods = useMemo(
    () => allMoodOptions.filter((mood) => !suggestedMoods.some((value) => taxonomyKey(value) === taxonomyKey(mood))),
    [allMoodOptions, suggestedMoods],
  );

  useEffect(() => {
    if (mode !== 'released') return;
    const value = query.trim();
    if (!value || isSpotifyTrackUrl(value)) return;

    if (!spotifyTextSearchConfigured) {
      setSearchResults([]);
      setSearchMessage(value.length >= 2 ? 'Paste the Spotify track link and we will recognize it automatically.' : '');
      return;
    }

    if (value.length < 2) {
      setSearchResults([]);
      setSearchMessage('');
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchMessage('');
      try {
        const response = await fetch(
          playlistApiBase + '/bvss-track-lookup?q=' + encodeURIComponent(value),
          { cache: 'no-store' },
        );
        const body = await response.json();
        if (response.ok) {
          setSearchResults(body.results || []);
          setSearchMessage((body.results || []).length ? '' : 'No Spotify tracks found. You can paste the track URL instead.');
        } else if (body.error === 'spotify_search_unconfigured') {
          setSearchResults([]);
          setSearchMessage('Song-name search is being activated. For now, paste the Spotify track link and we will recognize it automatically.');
        } else {
          setSearchResults([]);
          setSearchMessage('Could not search Spotify. Paste the track URL instead.');
        }
      } catch {
        setSearchResults([]);
        setSearchMessage('Could not search Spotify. Paste the track URL instead.');
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [mode, query, spotifyTextSearchConfigured]);

  function chooseTrack(track: TrackIdentity) {
    setSelectedTrack(track);
    setArtist(track.artist_name || '');
    setTitle(track.title || '');
    setReleaseDate((track.release_date || '').slice(0, 10));
    setIsExplicit(Boolean(track.is_explicit));
    setQuery(track.spotify_url);
    setSearchResults([]);
    setSearchMessage('');
  }

  async function resolveSpotifyUrl(value: string) {
    if (!isSpotifyTrackUrl(value)) return;
    setSearching(true);
    setSearchMessage('');
    try {
      const response = await fetch(
        playlistApiBase + '/bvss-track-lookup?url=' + encodeURIComponent(value.trim()),
        { cache: 'no-store' },
      );
      const body = await response.json();
      if (!response.ok || !body.track) {
        setSearchMessage('We could not recognize that Spotify link. Check the URL and try again.');
        return;
      }
      chooseTrack(body.track);
    } catch {
      setSearchMessage('We could not recognize that Spotify link. Check the URL and try again.');
    } finally {
      setSearching(false);
    }
  }

  function changeMode(next: 'released' | 'unreleased') {
    setMode(next);
    setResult(null);
    setSearchMessage('');
    setSearchResults([]);
    setSelectedTrack(null);
    setQuery('');
    setArtist('');
    setTitle('');
    setReleaseDate('');
    setIsExplicit(false);
    setAudioFile(null);
    setPrivateLink('');
    setDownloadPermission(false);
  }

  function toggle(slug: string) {
    setPreferred((current) =>
      current.includes(slug)
        ? current.filter((value) => value !== slug)
        : [...current, slug].slice(0, 8),
    );
  }

  async function uploadMaster(file: File) {
    setStage('Uploading your private master…');
    const init = await fetch(playlistApiBase + '/bvss-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init_upload',
        filename: file.name,
        content_type: file.type,
        size: file.size,
      }),
    });
    const slot = await init.json();
    if (!init.ok) throw new Error(slot.error || 'upload_slot_failed');

    const { error } = await supabase.storage
      .from(audioBucket)
      .uploadToSignedUrl(slot.path, slot.token, file, {
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;
    return slot.path as string;
  }

  function toggleMood(mood: string) {
    setSelectedMoods((current) => {
      const exists = current.some((value) => taxonomyKey(value) === taxonomyKey(mood));
      if (exists) return current.filter((value) => taxonomyKey(value) !== taxonomyKey(mood));
      if (current.length >= 8) return current;
      return [...current, mood];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setBusy(true);
    setStage('Preparing submission…');
    setResult(null);

    try {
      if (mode === 'released' && !selectedTrack?.spotify_url) {
        setResult({ ok: false, error: 'track_required', message: 'Choose a Spotify track or paste its Spotify URL first.' });
        return;
      }

      if (mode === 'unreleased' && !audioFile && !privateLink.trim()) {
        setResult({ ok: false, error: 'delivery_required', message: 'Add a private file or listening link for an unreleased song.' });
        return;
      }

      const canonicalGenre = genreOptions.find((value) => taxonomyKey(value) === taxonomyKey(genre));
      if (!canonicalGenre) {
        setResult({ ok: false, error: 'unknown_genre', message: 'Choose a genre from the approved list so we can route the track correctly.' });
        return;
      }

      const form = new FormData(formEl);
      let downloadObjectPath: string | null = null;

      if (audioFile) {
        downloadObjectPath = await uploadMaster(audioFile);
      }

      const externalLink = privateLink.trim() || null;
      const explicitlySelectedPartner = preferred.some((slug) =>
        playlists.some((playlist) => playlist.slug === slug && playlist.network_owner_type === 'partner'),
      );
      const directTargetSelected = Boolean(initialPlaylist && preferred.includes(initialPlaylist));

      const payload = {
        release_state: mode,
        artist_name: artist,
        email: form.get('email'),
        song_title: title,
        spotify_url: mode === 'released' ? selectedTrack?.spotify_url : null,
        release_date: releaseDate || null,
        genre: canonicalGenre,
        moods: selectedMoods,
        comparable_artists: String(form.get('comparable_artists') || '').split(',').map((v) => v.trim()).filter(Boolean),
        is_explicit: isExplicit,
        notes: form.get('notes') || null,
        preferred_playlists: preferred,
        origin_playlist: initialPlaylist || null,
        private_stream_url: externalLink && !downloadPermission ? externalLink : null,
        download_external_url: externalLink && downloadPermission ? externalLink : null,
        download_object_path: downloadObjectPath,
        download_permission: Boolean(audioFile) || (Boolean(externalLink) && downloadPermission),
        network_opt_in: networkOptIn || explicitlySelectedPartner,
        route_mode: directTargetSelected ? 'selected_only' : 'matched',
        artwork_url: selectedTrack?.artwork_url || null,
        identified_track: selectedTrack || {},
        artist_socials: {},
        website: form.get('website'),
      };

      fetch(playlistApiBase + '/bvss-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'submit_start',
          path: '/submit',
          playlist_slug: initialPlaylist || null,
          referrer: document.referrer || null,
          utm: Object.fromEntries(new URLSearchParams(window.location.search)),
        }),
      }).catch(() => undefined);

      setStage('Matching playlist fit…');
      const response = await fetch(playlistApiBase + '/bvss-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      setResult(body);

      if (response.ok) {
        formEl.reset();
        setGenre('');
        setSelectedMoods([]);
        setPreferred(initial);
        setAudioFile(null);
        setPrivateLink('');
        setDownloadPermission(false);
        setNetworkOptIn(false);
      }
    } catch (error) {
      setResult({
        ok: false,
        error: 'network_error',
        message: error instanceof Error ? error.message : 'Submission could not be sent. Please try again.',
      });
    } finally {
      setStage('');
      setBusy(false);
    }
  }

  const readyForDetails = mode === 'unreleased' ? Boolean(artist && title && (audioFile || privateLink.trim())) : Boolean(selectedTrack);

  return (
    <form className="submission-form submission-form-v3" onSubmit={submit}>
      {initialTarget && initialTarget.submission_status === 'open' && preferred.includes(initialTarget.slug) && (
        <div className="selected-playlist-panel" role="note" aria-label="Selected playlist">
          {initialTarget.cover_asset_url
            ? <img src={initialTarget.cover_asset_url} alt="" width={56} height={56} />
            : <div className="playlist-art-placeholder" aria-hidden="true" />}
          <div>
            <p className="eyebrow">Submitting to</p>
            <strong>{initialTarget.canonical_name}</strong>
            <small>{initialTarget.primary_genre}{initialTarget.moods.length ? ' · ' + initialTarget.moods.slice(0, 2).join(', ') : ''}</small>
          </div>
          <button type="button" className="text-button" onClick={() => toggle(initialTarget.slug)}>Remove</button>
        </div>
      )}
      <section className="song-source-card">
        <div className="source-tabs" role="group" aria-label="Is the song released?">
          <button type="button" aria-pressed={mode === 'released'} className={mode === 'released' ? 'source-tab active' : 'source-tab'} onClick={() => changeMode('released')}>
            Released
          </button>
          <button type="button" aria-pressed={mode === 'unreleased'} className={mode === 'unreleased' ? 'source-tab active' : 'source-tab'} onClick={() => changeMode('unreleased')}>
            Unreleased
          </button>
        </div>

        {mode === 'released' ? (
          <>
            <label className="song-search-label" htmlFor="song-search">What song are you submitting?</label>
            <div className="song-search-wrap">
              <input
                id="song-search"
                className="song-search-input"
                value={query}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery(value);
                  if (selectedTrack && value !== selectedTrack.spotify_url) setSelectedTrack(null);
                  if (isSpotifyTrackUrl(value)) resolveSpotifyUrl(value);
                }}
                onPaste={(event) => {
                  const value = event.clipboardData.getData('text');
                  if (isSpotifyTrackUrl(value)) window.setTimeout(() => resolveSpotifyUrl(value), 0);
                }}
                placeholder={spotifyTextSearchConfigured ? 'Search song + artist, or paste a Spotify link' : 'Paste a Spotify track link'}
                autoComplete="off"
              />
              {searching && <span className="song-search-state">Searching…</span>}
            </div>

            {!!searchResults.length && (
              <div className="song-search-results">
                {searchResults.map((track) => (
                  <button type="button" className="song-search-result" key={track.spotify_track_id} onClick={() => chooseTrack(track)}>
                    {track.artwork_url ? <img src={track.artwork_url} alt="" /> : <span className="song-art-placeholder" />}
                    <span><strong>{track.title}</strong><small>{track.artist_name}{track.album_name ? ' · ' + track.album_name : ''}</small></span>
                    <em>Choose</em>
                  </button>
                ))}
              </div>
            )}

            {!spotifyTextSearchConfigured && !query && (
              <p className="song-search-message">Paste a Spotify track link and the song card fills itself in automatically.</p>
            )}
            {searchMessage && (
              <p className="song-search-message">
                {searchMessage}
                {query && !isSpotifyTrackUrl(query) && (
                  <> <a href={'https://open.spotify.com/search/' + encodeURIComponent(query)} target="_blank" rel="noreferrer">Search Spotify ↗</a></>
                )}
              </p>
            )}

            {selectedTrack && (
              <div className="selected-song-card">
                {selectedTrack.artwork_url ? <img src={selectedTrack.artwork_url} alt="" /> : <span className="song-art-placeholder" />}
                <div>
                  <span className="eyebrow">Recognized on Spotify</span>
                  <strong>{title || selectedTrack.title}</strong>
                  <small>{artist || selectedTrack.artist_name || 'Artist name needed below'}</small>
                </div>
                <button type="button" className="text-button" onClick={() => { setSelectedTrack(null); setQuery(''); setArtist(''); setTitle(''); }}>Change</button>
              </div>
            )}

            {selectedTrack && (!artist || !title) && (
              <div className="identity-fallback">
                <div className="field"><label htmlFor="released_artist">Artist</label><input id="released_artist" value={artist} onChange={(e) => setArtist(e.target.value)} required /></div>
                <div className="field"><label htmlFor="released_title">Song title</label><input id="released_title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="unreleased-heading">
              <div><span className="eyebrow">Private submission</span><h3>Share an unreleased song.</h3></div>
              <p>Upload the audio or paste a private SoundCloud, Dropbox, Google Drive, DISCO or similar link.</p>
            </div>

            <div className="form-grid compact-form-grid">
              <div className="field"><label htmlFor="unreleased_artist">Artist</label><input id="unreleased_artist" value={artist} onChange={(e) => setArtist(e.target.value)} required /></div>
              <div className="field"><label htmlFor="unreleased_title">Song title</label><input id="unreleased_title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="field span-2 private-delivery-choice">
                <label htmlFor="master_file">Upload audio <span className="muted">WAV, MP3, FLAC, M4A · max 100 MB</span></label>
                <input
                  id="master_file"
                  type="file"
                  accept=".wav,.mp3,.flac,.m4a,.aac,audio/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setAudioFile(file);
                    if (file) setDownloadPermission(true);
                  }}
                />
              </div>
              <div className="delivery-or"><span>or</span></div>
              <div className="field span-2">
                <label htmlFor="private_link">Private listening / download link</label>
                <input
                  id="private_link"
                  type="url"
                  value={privateLink}
                  onChange={(event) => setPrivateLink(event.target.value)}
                  placeholder="SoundCloud, Dropbox, Google Drive, DISCO…"
                />
              </div>
              {audioFile ? (
                <p className="field span-2 song-search-message">
                  Uploading this master grants approved curators private access to it for review. Access is logged and delivered with short-lived links.
                </p>
              ) : privateLink ? (
                <div className="field span-2 checkbox-field compact-consent">
                  <label>
                    <input
                      type="checkbox"
                      checked={downloadPermission}
                      onChange={(event) => setDownloadPermission(event.target.checked)}
                    />
                    This private link may also be downloaded by approved curators.
                  </label>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      {readyForDetails && (
        <section className="submission-details-card">
          <div className="submission-details-heading">
            <div><span className="eyebrow">Almost done</span><h3>Help us route it.</h3></div>
            <p>Only email and genre are required here.</p>
          </div>

          <div className="form-grid">
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={254} /></div>
            <div className="field">
              <label htmlFor="genre">Primary genre</label>
              <select
                id="genre"
                value={genre}
                onChange={(event) => {
                  setGenre(event.target.value);
                  setSelectedMoods([]);
                }}
                required
              >
                <option value="">Choose the closest genre…</option>
                {genreOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <small className="muted">Uses the same approved genre vocabulary as our live playlist routing.</small>
            </div>
            <div className="field span-2 taxonomy-field">
              <label>Moods <span className="muted">(optional · choose up to 8)</span></label>
              <div className="chip-row taxonomy-chips">
                {suggestedMoods.map((mood) => {
                  const selected = selectedMoods.some((value) => taxonomyKey(value) === taxonomyKey(mood));
                  return (
                    <button
                      key={mood}
                      type="button"
                      className={selected ? 'chip taxonomy-chip selected' : 'chip taxonomy-chip'}
                      aria-pressed={selected}
                      onClick={() => toggleMood(mood)}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>
              {!!extraMoods.length && (
                <details className="taxonomy-more">
                  <summary>More moods</summary>
                  <div className="chip-row taxonomy-chips">
                    {extraMoods.map((mood) => {
                      const selected = selectedMoods.some((value) => taxonomyKey(value) === taxonomyKey(mood));
                      return (
                        <button
                          key={mood}
                          type="button"
                          className={selected ? 'chip taxonomy-chip selected' : 'chip taxonomy-chip'}
                          aria-pressed={selected}
                          onClick={() => toggleMood(mood)}
                        >
                          {mood}
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
            <div className="field span-2"><label htmlFor="comparable_artists">Sounds like <span className="muted">(optional)</span></label><input id="comparable_artists" name="comparable_artists" placeholder="Dabin, San Holo" /></div>
          </div>

          {initialTarget?.network_owner_type === 'partner' ? (
            <div className="submission-policy">
              <strong>Direct playlist submission</strong>
              <p>
                {playlistOwnership(initialTarget) === 'in_house'
                  ? 'This playlist is programmed by ' + CURATOROS_DESCRIPTION + '. Your track goes to that team for review; placement is never guaranteed.'
                  : 'This playlist is programmed by ' + ownershipLabel('external', initialTarget.bvss_curator_profiles?.display_name) + '. Your track goes to that curator for review; placement is never guaranteed.'}
              </p>
            </div>
          ) : (
            <label className="network-opt-in-control compact-network-opt-in">
              <input type="checkbox" checked={networkOptIn} onChange={(event) => setNetworkOptIn(event.target.checked)} />
              {hasExternalCurators ? (
                <span><strong>Also send to matching CuratorOS and independent curator playlists</strong><small>CuratorOS is {CURATOROS_DESCRIPTION}; independent curators run their own playlists. Optional. No guaranteed placement.</small></span>
              ) : (
                <span><strong>Also send to matching CuratorOS playlists</strong><small>Reviewed by {CURATOROS_DESCRIPTION}. Optional. No guaranteed placement.</small></span>
              )}
            </label>
          )}

          <details className="submission-more">
            <summary>Optional details</summary>
            <div className="submission-more-body">
              <div className="form-grid">
                <div className="field"><label htmlFor="release_date">Release date</label><input id="release_date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} /></div>
                <div className="field checkbox-field"><label><input type="checkbox" checked={isExplicit} onChange={(e) => setIsExplicit(e.target.checked)} /> Explicit lyrics/content</label></div>
                <div className="field span-2"><label htmlFor="notes">Note for curators</label><textarea id="notes" name="notes" maxLength={4000} placeholder="Anything useful about the record or fit." /></div>
              </div>

              <fieldset className="playlist-selector compact-playlist-selector">
                <legend>Preferred playlists <span>(optional)</span></legend>
                <div className="playlist-choice-grid">
                  {playlists.filter((p) => p.submission_status === 'open').map((playlist) => (
                    <label className={preferred.includes(playlist.slug) ? 'playlist-choice selected' : 'playlist-choice'} key={playlist.id}>
                      <input type="checkbox" checked={preferred.includes(playlist.slug)} onChange={() => toggle(playlist.slug)} />
                      <strong>{playlist.canonical_name}</strong>
                      <small>{playlist.subtitle}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </details>

          <div className="field honeypot" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <button className="button submit-primary" type="submit" disabled={busy}>
            {busy ? (stage || 'Submitting…') : 'Submit track'}
          </button>
          <p className="submission-microcopy">Human reviewed. Editorial decisions only. No guaranteed placement.</p>
        </section>
      )}

      {result && (
        <div className={result.ok ? 'submission-result success' : 'submission-result error'} role="status">
          {result.ok ? (
            <>
              <h3>Submission received.</h3>
              <p>Your track is now in the BVSS FVM review system.</p>
              {result.routed_to && (
                <p>
                  Routed to <strong>{result.routed_to.bvss}</strong> BVSS FVM lane{result.routed_to.bvss === 1 ? '' : 's'}
                  {networkOptIn && <> and <strong>{result.routed_to.partner_curators}</strong> partner-curator lane{result.routed_to.partner_curators === 1 ? '' : 's'}</>}.
                </p>
              )}
              {result.status_url && <a className="button button-secondary" href={result.status_url}>View submission status</a>}
            </>
          ) : (
            <>
              <h3>Submission not sent.</h3>
              <p>{result.message || (result.error === 'duplicate_submission' ? 'This song has already been submitted from this email.' : 'Please check the submission and try again.')}</p>
            </>
          )}
        </div>
      )}
    </form>
  );
}
