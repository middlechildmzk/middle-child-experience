
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);

type Dashboard = {
  totals: Record<string, number>;
  playlists: any[];
  queue: any[];
  integrations: any[];
  metrics_history?: Record<string, { metric_date: string; followers: number | null; track_count: number | null; source: string; observed_at: string }[]>;
};

function delta(current: number | null, historic: number | null) {
  return current == null || historic == null ? null : current - historic;
}

function Metric({ label, value, note }: { label: string; value: number | string | null; note?: string }) {
  return <div className="os-metric"><span>{label}</span><strong>{value == null ? '—' : typeof value === 'number' ? value.toLocaleString() : value}</strong>{note && <small>{note}</small>}</div>;
}

function Sparkline({ points }: { points: { metric_date: string; followers: number | null; source: string }[] }) {
  const measured = points.filter((point) => point.followers != null);
  if (measured.length < 2) return <span className="sparkline-empty">Awaiting history</span>;
  const values = measured.map((point) => Number(point.followers));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const width = 126;
  const height = 34;
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  return (
    <div className="sparkline-wrap" title={measured[measured.length - 1]?.source || 'Follower history'}>
      <svg className="sparkline" viewBox={'0 0 ' + width + ' ' + height} role="img" aria-label="Follower growth over the last 90 days">
        <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <small>{measured.length} measured points</small>
    </div>
  );
}

function ReviewCard({ submission, playlists, token, refresh }: { submission: any; playlists: any[]; token: string; refresh: () => void }) {
  const suggestions = submission.suggested_matches || [];
  const suggestedPlaylist = suggestions[0]?.bvss_playlists?.slug || '';
  const [playlist, setPlaylist] = useState(suggestedPlaylist);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function review(decision: 'hold' | 'accept' | 'reject') {
    if (decision === 'accept' && !playlist) return;
    setBusy(true);
    await fetch(playlistApiBase + '/bvss-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'review', submission_id: submission.id, decision, playlist_slug: playlist || null, review_notes: notes || null }),
    });
    setBusy(false);
    refresh();
  }

  return (
    <article className="os-review-card">
      <div className="os-review-head">
        <div><span className="eyebrow">{submission.genre}</span><h3>{submission.song_title}</h3><p>{submission.artist_name} · {submission.email}</p></div>
        <a className="button button-secondary button-small" href={submission.spotify_url} target="_blank" rel="noreferrer">Listen</a>
      </div>
      <div className="chip-row">{(submission.moods || []).map((m: string) => <span className="chip" key={m}>{m}</span>)}</div>
      {submission.notes && <p>{submission.notes}</p>}
      {!!suggestions.length && <p className="muted">Routing: {suggestions.map((m: any) => (m.bvss_playlists?.canonical_name || 'Playlist') + ' (' + m.score + ')').join(' · ')}</p>}
      <div className="os-review-controls">
        <select value={playlist} onChange={(e) => setPlaylist(e.target.value)}>
          <option value="">Assign playlist…</option>
          {playlists.map((p) => <option value={p.slug} key={p.slug}>{p.canonical_name}</option>)}
        </select>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review / rotation notes" />
        <button disabled={busy} onClick={() => review('accept')}>Accept</button>
        <button disabled={busy} onClick={() => review('hold')}>Hold</button>
        <button disabled={busy} onClick={() => review('reject')}>Reject</button>
      </div>
    </article>
  );
}

export default function PlaylistOSAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setStatus('Sending sign-in link…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/playlist-os' },
    });
    setStatus(error ? error.message : 'Check your email for the secure sign-in link.');
  }

  async function load() {
    if (!session) return;
    setError('');
    const response = await fetch(playlistApiBase + '/bvss-admin', {
      headers: { Authorization: 'Bearer ' + session.access_token },
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok) {
      setData(null);
      setError(body.error === 'not_authorized'
        ? 'This signed-in account has not been provisioned as a BVSS FVM Playlist OS admin yet.'
        : 'Dashboard data could not be loaded.');
      return;
    }
    setData(body);
  }

  useEffect(() => { if (session) load(); }, [session]);

  const totals = data?.totals || {};
  const playlistRows = useMemo(() => data?.playlists || [], [data]);

  if (!session) {
    return (
      <div className="os-login card">
        <p className="eyebrow">Secure admin</p>
        <h2>Playlist OS sign in</h2>
        <p className="muted">Use a Supabase-authenticated admin account. The public site cannot read artist emails, review notes or decisions.</p>
        <div className="field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <button className="button" onClick={signIn}>Email me a sign-in link</button>
        {status && <p className="muted">{status}</p>}
      </div>
    );
  }

  if (error) {
    return <div className="card"><h3>Admin access required</h3><p>{error}</p><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div>;
  }

  if (!data) return <div className="card">Loading Playlist OS…</div>;

  return (
    <div className="playlist-os">
      <div className="os-toolbar"><div><p className="eyebrow">BVSS FVM internal</p><h1>Playlist OS</h1></div><div className="actions"><button className="button button-secondary" onClick={load}>Refresh</button><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div></div>

      <div className="os-metrics-grid">
        <Metric label="Active playlists" value={totals.playlists || 0} />
        <Metric
          label="Measured followers"
          value={totals.followers_known_playlists ? totals.followers : null}
          note={(totals.followers_known_playlists || 0) + ' / ' + (totals.playlists || 0) + ' playlists connected'}
        />
        <Metric label="Waiting submissions" value={data.queue.length} />
        <Metric label="Active placements" value={totals.active_placements || 0} note={(totals.own_artist_placements || 0) + ' Middle Child / SUBFLOWER tracks'} />
        <Metric label="30d pageviews" value={totals.pageviews_30d || 0} />
        <Metric label="30d Spotify clicks" value={totals.spotify_clicks_30d || 0} />
        <Metric label="Search impressions" value={totals.search_impressions_30d || 0} />
        <Metric label="Search clicks" value={totals.search_clicks_30d || 0} />
      </div>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Network</p><h2>Playlist operating view</h2></div><p className="muted">Missing metrics render as missing — never estimated.</p></div>
        <div className="os-table-wrap">
          <table className="os-table">
            <thead><tr><th>Playlist</th><th>Followers</th><th>90d growth</th><th>7d</th><th>30d</th><th>90d</th><th>Tracks</th><th>Queue</th><th>Placements</th><th>Own artists</th><th>Traffic 30d</th><th>Search 30d</th><th>Data health</th></tr></thead>
            <tbody>{playlistRows.map((p) => {
              const d7=delta(p.current_follower_count,p.followers_7d_ago);
              const d30=delta(p.current_follower_count,p.followers_30d_ago);
              const d90=delta(p.current_follower_count,p.followers_90d_ago);
              const health=p.current_follower_count==null?'Follower feed pending':(d7!=null&&d7<0?'Follower decline':'Measured');
              return <tr key={p.playlist_id}>
                <td><strong>{p.canonical_name}</strong></td>
                <td>{p.current_follower_count?.toLocaleString() ?? '—'}</td>
                <td><Sparkline points={data.metrics_history?.[p.playlist_id] || []} /></td>
                <td>{d7==null?'—':(d7>0?'+':'')+d7}</td>
                <td>{d30==null?'—':(d30>0?'+':'')+d30}</td>
                <td>{d90==null?'—':(d90>0?'+':'')+d90}</td>
                <td>{p.current_track_count ?? '—'}</td>
                <td>{p.submissions_waiting}</td>
                <td>{p.active_placements}</td>
                <td>{p.own_artist_placements ?? 0}</td>
                <td>{p.pageviews_30d} / {p.spotify_clicks_30d}</td>
                <td>{p.search_impressions_30d} / {p.search_clicks_30d}</td>
                <td><span className="status-pill">{health}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Review queue</p><h2>{data.queue.length} submissions waiting</h2></div></div>
        <div className="os-review-grid">{data.queue.length ? data.queue.map((s) => <ReviewCard key={s.id} submission={s} playlists={playlistRows} token={session.access_token} refresh={load} />) : <p className="muted">Queue clear.</p>}</div>
      </section>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Data connections</p><h2>Integration truth</h2></div></div>
        <div className="integration-grid">{data.integrations.map((i) => <article className="card" key={i.provider}><span className="status-pill">{i.status}</span><h3>{i.provider}</h3><p>{i.notes}</p><small>{(i.capabilities || []).join(' · ')}</small></article>)}</div>
      </section>
    </div>
  );
}
