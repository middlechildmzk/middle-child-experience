'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);

type Dashboard = {
  profile: any;
  playlists: any[];
  claims: any[];
  routes: any[];
  facts: any;
};

export default function CuratorPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setStatus('Sending sign-in link…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/curator' },
    });
    setStatus(error ? error.message : 'Check your email for the secure sign-in link.');
  }

  async function load() {
    if (!session) return;
    const response = await fetch(playlistApiBase + '/bvss-curator', {
      headers: { Authorization: 'Bearer ' + session.access_token },
      cache: 'no-store',
    });
    const body = await response.json();
    setData(response.ok ? body : null);
    if (!response.ok) setStatus(body.error || 'Curator portal unavailable.');
  }

  useEffect(() => { if (session) load(); }, [session]);

  async function post(body: Record<string, unknown>) {
    if (!session) return null;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch(playlistApiBase + '/bvss-curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Request failed.');
        return null;
      }
      await load();
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function addPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await post({
      action: 'add_playlist',
      spotify_url: form.get('spotify_url'),
      canonical_name: form.get('canonical_name'),
      subtitle: form.get('subtitle'),
      description: form.get('description'),
      primary_genre: form.get('primary_genre'),
      secondary_genres: String(form.get('secondary_genres') || '').split(',').map((v) => v.trim()).filter(Boolean),
      moods: String(form.get('moods') || '').split(',').map((v) => v.trim()).filter(Boolean),
      activities: String(form.get('activities') || '').split(',').map((v) => v.trim()).filter(Boolean),
      anchor_artists: String(form.get('anchor_artists') || '').split(',').map((v) => v.trim()).filter(Boolean),
      update_cadence: form.get('update_cadence') || 'weekly',
      curation_philosophy: form.get('curation_philosophy'),
      submission_criteria: form.get('submission_criteria'),
    });
    if (result) {
      event.currentTarget.reset();
      setStatus(result.instructions || 'Playlist added for verification.');
    }
  }

  async function review(routeId: string, decision: 'accept' | 'hold' | 'reject') {
    const notes = window.prompt(decision === 'accept' ? 'Optional placement/review notes:' : 'Optional private review notes:') || '';
    await post({ action: 'review_route', route_id: routeId, decision, notes });
  }

  async function download(submissionId: string) {
    if (!session) return;
    setStatus('Preparing secure download…');
    const response = await fetch(playlistApiBase + '/bvss-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ action: 'download', submission_id: submissionId }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error || 'Download unavailable.');
      return;
    }
    window.open(result.url, '_blank', 'noopener,noreferrer');
    setStatus('Short-lived download link opened.');
  }

  if (!session) {
    return (
      <div className="card curator-auth-card">
        <p className="eyebrow">Curator portal</p>
        <h3>Secure sign in.</h3>
        <div className="field">
          <label htmlFor="portal-email">Email</label>
          <input id="portal-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <button className="button" onClick={signIn}>Email me a sign-in link</button>
        {status && <p className="muted">{status}</p>}
      </div>
    );
  }

  if (!data) return <div className="card">{status || 'Loading curator portal…'}</div>;

  if (!data.profile) {
    return (
      <div className="card curator-auth-card">
        <p className="eyebrow">Application required</p>
        <h3>No curator profile is attached to this login.</h3>
        <p>Apply for the beta before adding playlists or receiving submissions.</p>
        <a className="button" href="/curators/apply">Apply as a curator</a>
      </div>
    );
  }

  const profile = data.profile;

  return (
    <div className="curator-portal">
      <div className="os-toolbar">
        <div>
          <p className="eyebrow">Curator portal · {profile.status}</p>
          <h1>{profile.display_name}</h1>
        </div>
        <div className="actions">
          {profile.status === 'approved' && <a className="button button-secondary" href={'/curators/' + profile.handle}>Public profile</a>}
          <button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      <div className="os-metrics-grid">
        <div className="os-metric"><span>Verified playlists</span><strong>{data.facts?.verified_playlist_count ?? 0}</strong></div>
        <div className="os-metric"><span>Reviews completed</span><strong>{data.facts?.reviews_completed ?? 0}</strong></div>
        <div className="os-metric"><span>Active placements</span><strong>{data.facts?.active_placements ?? 0}</strong></div>
        <div className="os-metric">
          <span>Median response</span>
          <strong>{data.facts?.median_response_hours == null ? '—' : Math.round(data.facts.median_response_hours) + 'h'}</strong>
        </div>
      </div>

      {profile.status !== 'approved' && (
        <div className="submission-policy">
          <strong>{profile.status === 'pending' ? 'Application pending' : 'Curator account not active'}</strong>
          <p>
            Playlist verification and submission routing remain disabled until BVSS FVM approves the curator account.
          </p>
        </div>
      )}

      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Your playlists</p><h2>Ownership + verification</h2></div>
        </div>
        {data.playlists.length ? (
          <div className="integration-grid">
            {data.playlists.map((playlist) => {
              const claim = data.claims.find((item) => item.playlist_id === playlist.id);
              return (
                <article className="card" key={playlist.id}>
                  <span className="status-pill">{playlist.verification_status}</span>
                  <h3>{playlist.canonical_name}</h3>
                  <p>{playlist.primary_genre} · submissions {playlist.submission_status}</p>
                  <a className="card-link" href={playlist.spotify_url} target="_blank" rel="noreferrer">Open on Spotify →</a>
                  {claim?.status === 'pending' && (
                    <div className="verification-box">
                      <strong>Verification code: {claim.verification_code}</strong>
                      <p>Add this code temporarily to the Spotify playlist description, save it, then request verification.</p>
                      <button
                        className="button button-secondary button-small"
                        disabled={busy}
                        onClick={() => post({ action: 'request_verification', playlist_id: playlist.id })}
                      >
                        Request verification
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : <p className="muted">No playlists added yet.</p>}
      </section>

      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Add playlist</p><h2>Register a playlist you control</h2></div>
        </div>
        <form className="card submission-form" onSubmit={addPlaylist}>
          <div className="form-grid">
            <div className="field span-2"><label>Spotify playlist URL</label><input name="spotify_url" type="url" required /></div>
            <div className="field"><label>Playlist name</label><input name="canonical_name" required /></div>
            <div className="field"><label>Subtitle</label><input name="subtitle" placeholder="Optional positioning line" /></div>
            <div className="field span-2"><label>Description</label><textarea name="description" maxLength={800} /></div>
            <div className="field"><label>Primary genre</label><input name="primary_genre" required /></div>
            <div className="field"><label>Secondary genres</label><input name="secondary_genres" placeholder="comma separated" /></div>
            <div className="field"><label>Moods</label><input name="moods" placeholder="emotional, euphoric" /></div>
            <div className="field"><label>Listening moments</label><input name="activities" placeholder="late night, workout" /></div>
            <div className="field span-2"><label>Anchor artists</label><input name="anchor_artists" placeholder="3–6 useful reference artists" /></div>
            <div className="field"><label>Update cadence</label><select name="update_cadence"><option>weekly</option><option>biweekly</option><option>monthly</option></select></div>
            <div className="field span-2"><label>Curation philosophy</label><textarea name="curation_philosophy" maxLength={1200} /></div>
            <div className="field span-2"><label>Submission criteria</label><textarea name="submission_criteria" maxLength={1200} /></div>
          </div>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Add playlist for verification'}</button>
        </form>
      </section>

      {profile.status === 'approved' && (
        <section className="os-section">
          <div className="os-section-head">
            <div><p className="eyebrow">Matched submissions</p><h2>{data.routes.length} active inbox items</h2></div>
            <p className="muted">Matching is routing assistance, never a placement recommendation.</p>
          </div>
          <div className="os-review-grid">
            {data.routes.length ? data.routes.map((route) => {
              const submission = route.bvss_submissions;
              return (
                <article className="os-review-card" key={route.id}>
                  <div className="os-review-head">
                    <div>
                      <span className="eyebrow">{submission?.genre} · match {route.match_score ?? '—'}</span>
                      <h3>{submission?.song_title}</h3>
                      <p>{submission?.artist_name} · routed to {route.bvss_playlists?.canonical_name}</p>
                    </div>
                    <a className="button button-secondary button-small" href={submission?.spotify_url} target="_blank" rel="noreferrer">Listen on Spotify</a>
                  </div>
                  <div className="chip-row">{(submission?.moods || []).map((m: string) => <span className="chip" key={m}>{m}</span>)}</div>
                  {route.match_reasons?.length ? <p className="muted">Routing reasons: {route.match_reasons.join(' · ')}</p> : null}
                  {submission?.notes && <p>{submission.notes}</p>}
                  <div className="actions">
                    {submission?.download_permission && (
                      <button className="button button-secondary button-small" onClick={() => download(submission.id)}>Download permitted master</button>
                    )}
                    <button className="button button-small" onClick={() => review(route.id, 'accept')}>Accept</button>
                    <button className="button button-secondary button-small" onClick={() => review(route.id, 'hold')}>Hold</button>
                    <button className="button button-secondary button-small" onClick={() => review(route.id, 'reject')}>Reject</button>
                  </div>
                </article>
              );
            }) : <p className="muted">No matched submissions waiting.</p>}
          </div>
        </section>
      )}

      {status && <p className="muted" role="status">{status}</p>}
    </div>
  );
}
