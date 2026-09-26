'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  playlistApiBase,
  PlaylistRecord,
  supabasePublishableKey,
  supabaseUrl,
} from '../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const audioBucket = 'bvss-submission-audio';

type Result = {
  ok: boolean;
  submission?: { id: string; status: string };
  status_token?: string;
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

export default function SubmissionForm({
  playlists,
  initialPlaylist,
}: {
  playlists: PlaylistRecord[];
  initialPlaylist?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const initial = useMemo(() => initialPlaylist ? [initialPlaylist] : [], [initialPlaylist]);
  const [preferred, setPreferred] = useState<string[]>(initial);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [downloadPermission, setDownloadPermission] = useState(false);
  const [networkOptIn, setNetworkOptIn] = useState(false);

  function toggle(slug: string) {
    setPreferred((current) =>
      current.includes(slug)
        ? current.filter((value) => value !== slug)
        : [...current, slug].slice(0, 8),
    );
  }

  async function uploadMaster(file: File) {
    setStage('Preparing private audio upload…');
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

    setStage('Uploading master securely…');
    const { error } = await supabase.storage
      .from(audioBucket)
      .uploadToSignedUrl(slot.path, slot.token, file, {
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;
    return slot.path as string;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setBusy(true);
    setStage('Validating submission…');
    setResult(null);

    try {
      const form = new FormData(formEl);
      let downloadObjectPath: string | null = null;

      if (audioFile) {
        if (!downloadPermission) {
          setResult({
            ok: false,
            error: 'download_permission_required',
            message: 'Check the download-permission box before uploading a master.',
          });
          return;
        }
        downloadObjectPath = await uploadMaster(audioFile);
      }

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
        private_stream_url: form.get('private_stream_url') || null,
        download_external_url: form.get('download_external_url') || null,
        download_object_path: downloadObjectPath,
        download_permission: downloadPermission,
        network_opt_in: networkOptIn,
        artist_socials: {
          instagram: form.get('instagram_url') || null,
          tiktok: form.get('tiktok_url') || null,
          soundcloud: form.get('soundcloud_url') || null,
          website: form.get('artist_website') || null,
        },
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

      setStage('Routing to likely playlist fits…');
      const response = await fetch(playlistApiBase + '/bvss-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      setResult(body);

      if (response.ok) {
        formEl.reset();
        setPreferred(initial);
        setAudioFile(null);
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

  return (
    <form className="submission-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="artist_name">Artist</label>
          <input id="artist_name" name="artist_name" required maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required maxLength={254} />
        </div>
        <div className="field">
          <label htmlFor="song_title">Song title</label>
          <input id="song_title" name="song_title" required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="release_date">Release date</label>
          <input id="release_date" name="release_date" type="date" />
        </div>
        <div className="field span-2">
          <label htmlFor="spotify_url">Spotify track URL</label>
          <input id="spotify_url" name="spotify_url" type="url" required placeholder="https://open.spotify.com/track/…" />
        </div>
        <div className="field">
          <label htmlFor="genre">Primary genre</label>
          <input id="genre" name="genre" required placeholder="Melodic bass" />
        </div>
        <div className="field">
          <label htmlFor="moods">Moods</label>
          <input id="moods" name="moods" placeholder="emotional, euphoric, cinematic" />
        </div>
        <div className="field span-2">
          <label htmlFor="comparable_artists">Comparable artists</label>
          <input id="comparable_artists" name="comparable_artists" placeholder="Dabin, San Holo, ODESZA" />
        </div>
        <div className="field">
          <label htmlFor="instagram_url">Instagram <span className="muted">(optional)</span></label>
          <input id="instagram_url" name="instagram_url" type="url" placeholder="https://instagram.com/…" />
        </div>
        <div className="field">
          <label htmlFor="tiktok_url">TikTok <span className="muted">(optional)</span></label>
          <input id="tiktok_url" name="tiktok_url" type="url" placeholder="https://tiktok.com/@…" />
        </div>
        <div className="field">
          <label htmlFor="soundcloud_url">SoundCloud <span className="muted">(optional)</span></label>
          <input id="soundcloud_url" name="soundcloud_url" type="url" placeholder="https://soundcloud.com/…" />
        </div>
        <div className="field">
          <label htmlFor="artist_website">Artist website <span className="muted">(optional)</span></label>
          <input id="artist_website" name="artist_website" type="url" placeholder="https://…" />
        </div>
        <div className="field span-2 checkbox-field">
          <label><input name="is_explicit" type="checkbox" /> Explicit lyrics/content</label>
        </div>
        <div className="field span-2">
          <label htmlFor="notes">Notes for the curator</label>
          <textarea id="notes" name="notes" maxLength={4000} placeholder="What makes this record a fit?" />
        </div>
        <div className="field span-2 honeypot" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      <fieldset className="playlist-selector">
        <legend>Preferred playlists <span>(optional · choose up to 8)</span></legend>
        <p className="muted">
          You do not need to guess perfectly. Routing uses genre, mood, comparable artists and your preferences to suggest likely fits.
        </p>
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

      <fieldset className="playlist-selector">
        <legend>Private delivery <span>(optional)</span></legend>
        <p className="muted">
          Spotify remains the required listening link. You can also provide a private stream or a downloadable master for approved curators.
        </p>
        <div className="form-grid compact-form-grid">
          <div className="field span-2">
            <label htmlFor="private_stream_url">Private stream link</label>
            <input id="private_stream_url" name="private_stream_url" type="url" placeholder="Private SoundCloud, Disco, Dropbox preview, etc." />
          </div>
          <div className="field span-2">
            <label htmlFor="master_file">Upload WAV / MP3 / FLAC <span className="muted">(max 100 MB)</span></label>
            <input
              id="master_file"
              type="file"
              accept=".wav,.mp3,.flac,.m4a,.aac,audio/*"
              onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
            />
          </div>
          <div className="field span-2">
            <label htmlFor="download_external_url">Or external download link</label>
            <input id="download_external_url" name="download_external_url" type="url" placeholder="https://…" />
          </div>
          <div className="field span-2 checkbox-field">
            <label>
              <input
                type="checkbox"
                checked={downloadPermission}
                onChange={(event) => setDownloadPermission(event.target.checked)}
              />
              I grant approved BVSS FVM/network curators permission to download the supplied master for review and playlist operations.
            </label>
          </div>
        </div>
      </fieldset>

      <div className="network-opt-in">
        <label className="network-opt-in-control">
          <input
            type="checkbox"
            checked={networkOptIn}
            onChange={(event) => setNetworkOptIn(event.target.checked)}
          />
          <span>
            <strong>Curator Network Beta</strong>
            <small>
              Allow BVSS FVM to route this submission to approved independent curators when their verified playlist is a strong fit.
              This is optional and never guarantees placement.
            </small>
          </span>
        </label>
      </div>

      <div className="submission-policy">
        <strong>Editorial independence</strong>
        <p>
          Submission, matching, network routing, or paid third-party review never guarantees placement. Every playlist decision remains editorial.
        </p>
      </div>

      <button className="button" type="submit" disabled={busy}>
        {busy ? (stage || 'Submitting…') : 'Submit for consideration'}
      </button>

      {result && (
        <div className={result.ok ? 'submission-result success' : 'submission-result error'} role="status">
          {result.ok ? (
            <>
              <h3>Submission received.</h3>
              <p>Your track is in the BVSS FVM review system.</p>
              {result.routed_to && (
                <p>
                  Routed to <strong>{result.routed_to.bvss}</strong> BVSS FVM lane{result.routed_to.bvss === 1 ? '' : 's'}
                  {networkOptIn && <> and <strong>{result.routed_to.partner_curators}</strong> approved partner curator lane{result.routed_to.partner_curators === 1 ? '' : 's'}</>}.
                </p>
              )}
              {!!result.suggested_playlists?.length && (
                <div>
                  <strong>Likely fits</strong>
                  <ul>
                    {result.suggested_playlists.map((item) => (
                      <li key={item.slug}>
                        {item.name} — {item.reasons.join(', ')}
                        {item.network_owner_type === 'partner' ? ' · independent curator' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.status_url && (
                <p>
                  <a className="button button-secondary" href={result.status_url}>View private submission status</a>
                </p>
              )}
              <p className="muted">{result.editorial_notice}</p>
            </>
          ) : (
            <>
              <h3>Submission not sent.</h3>
              <p>
                {result.message ||
                  (result.error === 'duplicate_submission'
                    ? 'This track has already been submitted from this email.'
                    : 'Please check the form and try again.')}
              </p>
            </>
          )}
        </div>
      )}
    </form>
  );
}
