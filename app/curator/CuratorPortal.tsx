'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Structured decline reasons (Muse v1). Keys 1-8 toggle them in the composer.
const DECLINE_REASONS: [string, string][] = [
  ['energy_mismatch', 'Energy mismatch'],
  ['not_my_genre_lane', 'Not my genre lane'],
  ['production_not_ready', 'Production not there yet'],
  ['too_similar_to_recent_adds', 'Too similar to recent adds'],
  ['wrong_mood', 'Wrong mood for this playlist'],
  ['vocal_style', 'Vocal style'],
  ['mix_master', 'Mix/master'],
  ['other', 'Other'],
];
const FIT_LABEL: Record<string, string> = { strong_fit: 'Strong fit', worth_a_look: 'Worth a look', long_shot: 'Long shot' };
const PLACEMENT_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  pending_verification: 'Pending sync confirmation (≤24h)',
  live: 'Live',
  removed: 'Removed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const dateInDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

type Dashboard = {
  profile: any;
  playlists: any[];
  claims: any[];
  routes: any[];
  facts: any;
  entitlement?: any;
  usage?: any;
};

export default function CuratorPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [decisionDraft, setDecisionDraft] = useState<{ routeId: string; decision: 'accept' | 'hold' | 'reject' } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [declineReasons, setDeclineReasons] = useState<string[]>([]);
  const [holdUntil, setHoldUntil] = useState(dateInDays(7));

  useEffect(() => {
    setSelectedRoute((index) => Math.min(index, Math.max(0, (data?.routes.length || 0) - 1)));
  }, [data]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.ctrlKey || event.metaKey || event.altKey || target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { setDecisionDraft(null); return; }
      if (decisionDraft?.decision === 'reject' && !busy && /^[1-8]$/.test(event.key)) {
        event.preventDefault();
        const code = DECLINE_REASONS[Number(event.key) - 1][0];
        setDeclineReasons((current) => current.includes(code) ? current.filter((c) => c !== code) : [...current, code]);
        return;
      }
      if (busy || decisionDraft || !data?.routes.length) return;
      const key = event.key.toLowerCase();
      if (!['j', 'k', 'a', 'd', 'h'].includes(key)) return;
      event.preventDefault();
      if (key === 'j' || key === 'k') {
        setSelectedRoute((index) => Math.max(0, Math.min(data.routes.length - 1, index + (key === 'j' ? 1 : -1))));
      } else {
        const route = data.routes[selectedRoute];
        if (route.status === 'accepted') return;
        openDecision(route.id, key === 'a' ? 'accept' : key === 'd' ? 'reject' : 'hold');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, selectedRoute, busy, decisionDraft]);

  useEffect(() => {
    document.getElementById('review-' + data?.routes[selectedRoute]?.id)?.scrollIntoView({ block: 'nearest' });
  }, [selectedRoute]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setStatus('Sending sign-in link…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://bvssfvm.com/curator' },
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
    } catch {
      setStatus('Could not save. Check your connection and try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await post({
      action: 'update_profile',
      display_name: form.get('display_name'),
      bio: form.get('bio'),
      website_url: form.get('website_url') || null,
      spotify_profile_url: form.get('spotify_profile_url') || null,
      genres: String(form.get('genres') || '').split(',').map((v) => v.trim()).filter(Boolean),
      moods: String(form.get('moods') || '').split(',').map((v) => v.trim()).filter(Boolean),
    });
    if (result) setStatus('Curator profile updated.');
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

  function openDecision(routeId: string, decision: 'accept' | 'hold' | 'reject') {
    setDecisionNotes('');
    setDeclineReasons([]);
    setHoldUntil(dateInDays(7));
    setDecisionDraft({ routeId, decision });
  }

  async function review(routeId: string, decision: 'accept' | 'hold' | 'reject') {
    openDecision(routeId, decision);
  }

  async function confirmReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decisionDraft || busy) return;
    if (decisionDraft.decision === 'reject' && !declineReasons.length) return;
    const result = await post({
      action: 'review_route',
      route_id: decisionDraft.routeId,
      decision: decisionDraft.decision,
      notes: decisionNotes.trim(),
      reasons: decisionDraft.decision === 'reject' ? declineReasons : [],
      hold_until: decisionDraft.decision === 'hold' ? new Date(holdUntil + 'T23:59:00').toISOString() : null,
    });
    if (result) {
      setDecisionDraft(null);
      setStatus(
        result.idempotent ? 'That decision was already saved.'
          : decisionDraft.decision === 'accept' ? 'Accepted. Scheduled: add it in Spotify, then mark it added. It shows as placed once the playlist sync confirms it.'
          : decisionDraft.decision === 'hold' ? 'On hold until ' + holdUntil + '. It returns to your queue then.'
          : 'Declined. The artist sees your reason.',
      );
    }
  }

  async function reportAdded(placementId: string) {
    const result = await post({ action: 'report_added', placement_id: placementId });
    if (result) setStatus('Pending sync confirmation. It shows as placed once the playlist sync finds the track (usually within 24 hours).');
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
        <div className="os-metric">
          <span>Plan</span>
          <strong>{data.entitlement?.plan || profile.plan || 'beta'}</strong>
        </div>
        <div className="os-metric">
          <span>Playlist allowance</span>
          <strong>{data.usage?.registered_playlists ?? data.playlists.length} / {data.entitlement?.max_registered_playlists ?? 5}</strong>
        </div>
        <div className="os-metric">
          <span>Routes this month</span>
          <strong>{data.usage?.routes_this_month ?? 0} / {data.entitlement?.max_monthly_routes ?? 500}</strong>
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
          <div><p className="eyebrow">Profile settings</p><h2>How artists see your curation</h2></div>
        </div>
        <form className="card submission-form" onSubmit={updateProfile}>
          <div className="form-grid">
            <div className="field"><label>Display name</label><input name="display_name" defaultValue={profile.display_name} /></div>
            <div className="field"><label>Spotify curator profile</label><input name="spotify_profile_url" type="url" defaultValue={profile.spotify_profile_url || ''} /></div>
            <div className="field span-2"><label>Bio / curation philosophy</label><textarea name="bio" maxLength={1200} defaultValue={profile.bio || ''} /></div>
            <div className="field"><label>Genres</label><input name="genres" defaultValue={(profile.genres || []).join(', ')} /></div>
            <div className="field"><label>Moods</label><input name="moods" defaultValue={(profile.moods || []).join(', ')} /></div>
            <div className="field span-2"><label>Website</label><input name="website_url" type="url" defaultValue={profile.website_url || ''} /></div>
            {profile.status === 'approved' && (
              <div className="field span-2">
                <p className="muted">Approved curator profiles are public while participating in the network so artists can see who is reviewing submissions.</p>
              </div>
            )}
          </div>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save curator profile'}</button>
        </form>
      </section>

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
                  {playlist.verification_status === 'verified' && profile.status === 'approved' && (
                    <div className="actions">
                      <button
                        className="button button-secondary button-small"
                        disabled={busy}
                        onClick={() => post({
                          action: 'set_playlist_status',
                          playlist_id: playlist.id,
                          submission_status: playlist.submission_status === 'open' ? 'paused' : 'open',
                        })}
                      >
                        {playlist.submission_status === 'open' ? 'Pause submissions' : 'Open submissions'}
                      </button>
                    </div>
                  )}
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
            {data.routes.length ? data.routes.map((route, index) => {
              const submission = route.bvss_submissions;
              return (
                <article className="os-review-card" key={route.id} id={'review-' + route.id} onFocus={() => setSelectedRoute(index)} style={index === selectedRoute ? { outline: '2px solid currentColor', outlineOffset: 3 } : undefined}>
                  <div className="os-review-head">
                    <div>
                      <span className="eyebrow">{submission?.release_state === 'unreleased' ? 'unreleased · ' : ''}{submission?.genre}{route.fit_band ? ' · ' + FIT_LABEL[route.fit_band] : ''}{route.status === 'hold' && route.hold_until ? ' · on hold until ' + String(route.hold_until).slice(0, 10) : ''}</span>
                      <h3>{submission?.song_title}</h3>
                      <p>{submission?.artist_name} · routed to {route.bvss_playlists?.canonical_name}</p>
                    </div>
                    {submission?.spotify_url ? (
                      <a className="button button-secondary button-small" href={submission.spotify_url} target="_blank" rel="noreferrer">Listen on Spotify</a>
                    ) : submission?.private_stream_url ? (
                      <a className="button button-secondary button-small" href={submission.private_stream_url} target="_blank" rel="noreferrer">Open private stream</a>
                    ) : (
                      <span className="status-pill">unreleased upload</span>
                    )}
                  </div>
                  <div className="chip-row">{(submission?.moods || []).map((m: string) => <span className="chip" key={m}>{m}</span>)}</div>
                  {route.match_reasons?.length ? <p className="muted">Why you're seeing this: {route.match_reasons.join(' · ')}</p> : null}
                  {route.fit && (
                    <details>
                      <summary>Fit signal (inferred): {route.fit.label || 'Not enough evidence for a fit read'}</summary>
                      <ul>
                        {route.fit.signals.map((sig: any, i: number) => (
                          <li key={i}>{sig.kind === 'aligned' ? '✓' : '✕'} {sig.detail}{sig.material ? '' : ' (minor)'} · artist-attested vs curator-stated</li>
                        ))}
                        {route.fit.insufficient_reason && <li>{route.fit.insufficient_reason}</li>}
                      </ul>
                    </details>
                  )}
                  {submission?.notes && <p>{submission.notes}</p>}
                  <div className="actions">
                    {submission?.download_permission && (
                      <button className="button button-secondary button-small" onClick={() => download(submission.id)}>Download permitted master</button>
                    )}
                    {route.status === 'accepted' ? (
                      <>
                        <span className="status-pill">{PLACEMENT_LABEL[route.placement?.status] || 'Accepted'}</span>
                        {route.placement?.status === 'live' && route.placement.actual_position != null && <span className="muted">position {route.placement.actual_position + 1}</span>}
                        {route.bvss_playlists?.spotify_url && route.placement?.status === 'scheduled' && (
                          <a className="button button-secondary button-small" href={route.bvss_playlists.spotify_url} target="_blank" rel="noreferrer">Open playlist in Spotify</a>
                        )}
                        {route.placement?.status === 'scheduled' && (
                          <button className="button button-small" disabled={busy} onClick={() => reportAdded(route.placement.id)}>I've added it</button>
                        )}
                      </>
                    ) : (
                      <>
                        <button className="button button-small" disabled={busy} onClick={() => review(route.id, 'accept')}>Accept</button>
                        <button className="button button-secondary button-small" disabled={busy} onClick={() => review(route.id, 'hold')}>Hold</button>
                        <button className="button button-secondary button-small" disabled={busy} onClick={() => review(route.id, 'reject')}>Decline</button>
                      </>
                    )}
                  </div>
                </article>
              );
            }) : <p className="muted">No matched submissions waiting.</p>}
          </div>
        </section>
      )}

      {profile.status === 'approved' && <p className="muted">Keyboard: J next · K previous · A accept · D decline · H hold. Decisions require confirmation.</p>}
      {decisionDraft && (
        <section className="card" role="dialog" aria-modal="false" aria-labelledby="review-decision-title">
          <h3 id="review-decision-title">{decisionDraft.decision === 'reject' ? 'Decline' : decisionDraft.decision === 'accept' ? 'Accept' : 'Hold'} submission</h3>
          {decisionDraft.decision === 'accept' && <p>Accepting schedules a placement. It shows as placed only after the playlist sync finds the track.</p>}
          <form onSubmit={confirmReview}>
            {decisionDraft.decision === 'reject' && (
              <fieldset className="field">
                <legend>Why are you passing? Pick at least one (keys 1–8).</legend>
                <div className="chip-row">
                  {DECLINE_REASONS.map(([code, label], i) => (
                    <label className="chip" key={code}>
                      <input type="checkbox" checked={declineReasons.includes(code)} onChange={() => setDeclineReasons((c) => c.includes(code) ? c.filter((x) => x !== code) : [...c, code])} /> {i + 1}. {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {decisionDraft.decision === 'hold' && (
              <div className="field">
                <label htmlFor="hold-until">Revisit by</label>
                <input id="hold-until" type="date" min={dateInDays(1)} max={dateInDays(30)} value={holdUntil} onChange={(event) => setHoldUntil(event.target.value)} required />
              </div>
            )}
            <div className="field">
              <label htmlFor="decision-notes">{decisionDraft.decision === 'reject' ? 'Optional note to the artist (280 characters)' : 'Optional notes'}</label>
              <textarea id="decision-notes" autoFocus={decisionDraft.decision !== 'reject'} maxLength={decisionDraft.decision === 'reject' ? 280 : 2000} value={decisionNotes} onChange={(event) => setDecisionNotes(event.target.value)} />
            </div>
            <div className="actions">
              <button className="button" disabled={busy || (decisionDraft.decision === 'reject' && !declineReasons.length)}>{busy ? 'Saving…' : 'Confirm decision'}</button>
              <button type="button" className="button button-secondary" disabled={busy} onClick={() => setDecisionDraft(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {status && <p className="muted" role="status">{status}</p>}
    </div>
  );
}
