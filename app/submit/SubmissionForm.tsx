
'use client';

import { FormEvent, useMemo, useState } from 'react';
import { playlistApiBase, PlaylistRecord } from '../../lib/playlist-os';

type Result = {
  ok: boolean;
  submission?: { id: string; status: string };
  suggested_playlists?: { slug: string; name: string; score: number; reasons: string[] }[];
  editorial_notice?: string;
  error?: string;
  message?: string;
};

export default function SubmissionForm({
  playlists,
  initialPlaylist,
}: {
  playlists: PlaylistRecord[];
  initialPlaylist?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const initial = useMemo(() => initialPlaylist ? [initialPlaylist] : [], [initialPlaylist]);
  const [preferred, setPreferred] = useState<string[]>(initial);

  function toggle(slug: string) {
    setPreferred((current) => current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug].slice(0, 6));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      artist_name: form.get('artist_name'),
      email: form.get('email'),
      song_title: form.get('song_title'),
      spotify_url: form.get('spotify_url'),
      release_date: form.get('release_date') || null,
      genre: form.get('genre'),
      moods: String(form.get('moods') || '').split(',').map((v) => v.trim()).filter(Boolean),
      comparable_artists: String(form.get('comparable_artists') || '').split(',').map((v) => v.trim()).filter(Boolean),
      is_explicit: form.get('is_explicit') === 'on',
      notes: form.get('notes') || null,
      preferred_playlists: preferred,
      origin_playlist: initialPlaylist || null,
      website: form.get('website'),
    };
    try {
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

      const response = await fetch(playlistApiBase + '/bvss-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      setResult(body);
      if (response.ok) event.currentTarget.reset();
    } catch {
      setResult({ ok: false, error: 'network_error', message: 'Submission could not be sent. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="submission-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="field"><label htmlFor="artist_name">Artist</label><input id="artist_name" name="artist_name" required maxLength={160} /></div>
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={254} /></div>
        <div className="field"><label htmlFor="song_title">Song title</label><input id="song_title" name="song_title" required maxLength={200} /></div>
        <div className="field"><label htmlFor="release_date">Release date</label><input id="release_date" name="release_date" type="date" /></div>
        <div className="field span-2"><label htmlFor="spotify_url">Spotify track URL</label><input id="spotify_url" name="spotify_url" type="url" required placeholder="https://open.spotify.com/track/…" /></div>
        <div className="field"><label htmlFor="genre">Primary genre</label><input id="genre" name="genre" required placeholder="Melodic bass" /></div>
        <div className="field"><label htmlFor="moods">Moods</label><input id="moods" name="moods" placeholder="emotional, euphoric, cinematic" /></div>
        <div className="field span-2"><label htmlFor="comparable_artists">Comparable artists</label><input id="comparable_artists" name="comparable_artists" placeholder="Dabin, San Holo, ODESZA" /></div>
        <div className="field span-2 honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className="field span-2 checkbox-field"><label><input name="is_explicit" type="checkbox" /> Explicit lyrics/content</label></div>
        <div className="field span-2"><label htmlFor="notes">Notes for the curator</label><textarea id="notes" name="notes" maxLength={4000} placeholder="What makes this record a fit?" /></div>
      </div>

      <fieldset className="playlist-selector">
        <legend>Preferred playlists <span>(optional · choose up to 6)</span></legend>
        <p className="muted">You do not need to guess perfectly. The routing system also proposes likely fits from your genre, moods and comparable artists.</p>
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

      <div className="submission-policy">
        <strong>Editorial independence</strong>
        <p>Submitting does not guarantee review, feedback or placement. BVSS FVM does not sell guaranteed playlist placement. Every decision remains editorial.</p>
      </div>

      <button className="button" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for consideration'}</button>

      {result && (
        <div className={result.ok ? 'submission-result success' : 'submission-result error'} role="status">
          {result.ok ? (
            <>
              <h3>Submission received.</h3>
              <p>Your track is in the BVSS FVM review queue.</p>
              {!!result.suggested_playlists?.length && (
                <div>
                  <strong>Likely review lanes</strong>
                  <ul>{result.suggested_playlists.map((item) => <li key={item.slug}>{item.name} — {item.reasons.join(', ')}</li>)}</ul>
                </div>
              )}
              <p className="muted">{result.editorial_notice}</p>
            </>
          ) : (
            <>
              <h3>Submission not sent.</h3>
              <p>{result.message || (result.error === 'duplicate_submission' ? 'This track has already been submitted from this email.' : 'Please check the form and try again.')}</p>
            </>
          )}
        </div>
      )}
    </form>
  );
}
