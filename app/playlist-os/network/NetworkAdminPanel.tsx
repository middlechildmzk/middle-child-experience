'use client';

import { useEffect, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);

export default function NetworkAdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setStatus('Sending secure sign-in link…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/playlist-os/network' },
    });
    setStatus(error ? error.message : 'Check your email for the sign-in link.');
  }

  async function load() {
    if (!session) return;
    const response = await fetch(playlistApiBase + '/bvss-network-admin', {
      headers: { Authorization: 'Bearer ' + session.access_token },
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok) {
      setData(null);
      setStatus(body.error || 'Admin access required.');
      return;
    }
    setData(body);
  }

  useEffect(() => { if (session) load(); }, [session]);

  async function act(body: Record<string, unknown>) {
    if (!session) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch(playlistApiBase + '/bvss-network-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Action failed.');
        return;
      }
      await load();
      setStatus('Saved.');
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="card curator-auth-card">
        <p className="eyebrow">BVSS FVM admin</p>
        <h3>Curator network control center</h3>
        <div className="field">
          <label htmlFor="network-admin-email">Email</label>
          <input id="network-admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <button className="button" onClick={signIn}>Email me a sign-in link</button>
        {status && <p className="muted">{status}</p>}
      </div>
    );
  }

  if (!data) return <div className="card">{status || 'Loading network admin…'}</div>;

  const pendingCurators = data.curators.filter((c: any) => c.status === 'pending');
  const approvedCurators = data.curators.filter((c: any) => c.status === 'approved');
  const pendingClaims = data.claims.filter((claim: any) => claim.status === 'pending');

  return (
    <div className="playlist-os">
      <div className="os-toolbar">
        <div>
          <p className="eyebrow">BVSS FVM internal</p>
          <h1>Curator Network</h1>
        </div>
        <div className="actions">
          <a className="button button-secondary" href="/playlist-os">Playlist OS</a>
          <button className="button button-secondary" onClick={load}>Refresh</button>
          <button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      <div className="os-metrics-grid">
        <div className="os-metric"><span>Pending curators</span><strong>{pendingCurators.length}</strong></div>
        <div className="os-metric"><span>Approved curators</span><strong>{approvedCurators.length}</strong></div>
        <div className="os-metric"><span>Pending playlist claims</span><strong>{pendingClaims.length}</strong></div>
        <div className="os-metric"><span>Open reports</span><strong>{data.reports.length}</strong></div>
      </div>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Applications</p><h2>Curator approval queue</h2></div></div>
        <div className="os-review-grid">
          {pendingCurators.length ? pendingCurators.map((curator: any) => (
            <article className="os-review-card" key={curator.id}>
              <div className="os-review-head">
                <div>
                  <span className="eyebrow">{curator.handle}</span>
                  <h3>{curator.display_name}</h3>
                  <p>{curator.contact_email}</p>
                </div>
                <span className="status-pill">{curator.status}</span>
              </div>
              <p>{curator.bio || 'No bio supplied.'}</p>
              <div className="chip-row">{(curator.genres || []).map((g: string) => <span className="chip" key={g}>{g}</span>)}</div>
              <div className="actions">
                {curator.spotify_profile_url && <a className="button button-secondary button-small" href={curator.spotify_profile_url} target="_blank" rel="noreferrer">Spotify</a>}
                {curator.website_url && <a className="button button-secondary button-small" href={curator.website_url} target="_blank" rel="noreferrer">Website</a>}
                <button className="button button-small" disabled={busy} onClick={() => act({ action: 'approve_curator', curator_id: curator.id })}>Approve</button>
                <button className="button button-secondary button-small" disabled={busy} onClick={() => act({ action: 'reject_curator', curator_id: curator.id, notes: 'Rejected during beta review.' })}>Reject</button>
              </div>
            </article>
          )) : <p className="muted">No curator applications waiting.</p>}
        </div>
      </section>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Ownership</p><h2>Playlist verification queue</h2></div></div>
        <div className="os-review-grid">
          {pendingClaims.length ? pendingClaims.map((claim: any) => (
            <article className="os-review-card" key={claim.id}>
              <div className="os-review-head">
                <div>
                  <span className="eyebrow">{claim.bvss_curator_profiles?.display_name}</span>
                  <h3>{claim.bvss_playlists?.canonical_name}</h3>
                  <p>{claim.bvss_playlists?.primary_genre}</p>
                </div>
                <span className="status-pill">{claim.verification_code}</span>
              </div>
              <p className="muted">
                Verify that the Spotify playlist description currently contains the exact code above and that the applicant controls the playlist.
              </p>
              <div className="actions">
                <a className="button button-secondary button-small" href={claim.bvss_playlists?.spotify_url} target="_blank" rel="noreferrer">Open Spotify playlist</a>
                <button className="button button-small" disabled={busy} onClick={() => act({ action: 'verify_claim', claim_id: claim.id })}>Verify + activate</button>
                <button className="button button-secondary button-small" disabled={busy} onClick={() => act({ action: 'reject_claim', claim_id: claim.id, notes: 'Ownership could not be verified.' })}>Reject</button>
              </div>
            </article>
          )) : <p className="muted">No playlist claims waiting.</p>}
        </div>
      </section>

      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Transparent network facts</p><h2>Curator operations</h2></div>
          <p className="muted">No composite or opaque curator quality score.</p>
        </div>
        <div className="os-table-wrap">
          <table className="os-table">
            <thead><tr><th>Curator</th><th>Status</th><th>Verified playlists</th><th>Reviews</th><th>Accepted</th><th>Rejected</th><th>Median response</th><th>Active placements</th></tr></thead>
            <tbody>
              {(data.facts || []).map((fact: any) => (
                <tr key={fact.curator_id}>
                  <td><strong>{fact.display_name}</strong></td>
                  <td>{fact.status}</td>
                  <td>{fact.verified_playlist_count}</td>
                  <td>{fact.reviews_completed}</td>
                  <td>{fact.accepted_count}</td>
                  <td>{fact.rejected_count}</td>
                  <td>{fact.median_response_hours == null ? '—' : Math.round(fact.median_response_hours) + 'h'}</td>
                  <td>{fact.active_placements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Moderation</p><h2>Open network reports</h2></div></div>
        <div className="os-review-grid">
          {data.reports.length ? data.reports.map((report: any) => (
            <article className="os-review-card" key={report.id}>
              <span className="status-pill">{report.category}</span>
              <h3>{report.detail}</h3>
              <p className="muted">{new Date(report.created_at).toLocaleString()}</p>
              <div className="actions">
                <button className="button button-small" disabled={busy} onClick={() => act({ action: 'resolve_report', report_id: report.id, status: 'resolved' })}>Resolve</button>
                <button className="button button-secondary button-small" disabled={busy} onClick={() => act({ action: 'resolve_report', report_id: report.id, status: 'dismissed' })}>Dismiss</button>
              </div>
            </article>
          )) : <p className="muted">No open reports.</p>}
        </div>
      </section>

      {status && <p className="muted" role="status">{status}</p>}
    </div>
  );
}
