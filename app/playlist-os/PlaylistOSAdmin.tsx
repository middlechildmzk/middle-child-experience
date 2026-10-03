
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../lib/playlist-os';
import { FRESHNESS_LABEL, VALUE_STATE_LABEL, assessPlaylistFollowers, describeFollowers, summarizeCoverage } from '../../lib/source-health';

const supabase = createClient(supabaseUrl, supabasePublishableKey);

type Dashboard = {
  totals: Record<string, number>;
  playlists: any[];
  queue: any[];
  integrations: any[];
  metrics_history?: Record<string, { metric_date: string; followers: number | null; track_count: number | null; source: string; observed_at: string }[]>;
  actions?: {
    priority: 'high' | 'medium' | 'low';
    type: string;
    playlist_slug: string | null;
    playlist_name: string | null;
    title: string;
    detail: string;
  }[];
  playlist_attribution?: any[];
  traffic_sources?: any[];
  submission_sources?: any[];
  legacy_playlists?: any[];
  track_events?: any[];
  sync_runs?: any[];
};

function delta(current: number | null, historic: number | null) {
  return current == null || historic == null ? null : current - historic;
}

/** Current follower value usable for growth math: fresh or delayed, measured, not flagged. */
function growthCurrent(playlist: any): number | null {
  return assessPlaylistFollowers(playlist).deltaEligibleValue;
}

/** A zero or missing baseline is never trusted for growth. */
function growthBaseline(value: number | null | undefined): number | null {
  return value == null || Number(value) === 0 ? null : Number(value);
}

function pct(value: number | null | undefined) {
  return value == null ? '—' : (value * 100).toFixed(1) + '%';
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


type RangeKey = '7D' | '30D' | '90D' | '1Y' | 'ALL';
type ChartPoint = { date: string; value: number; coverage?: number };

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '1Y': 365,
  'ALL': null,
};

function formatDelta(value: number | null) {
  if (value == null) return '—';
  return (value > 0 ? '+' : '') + value.toLocaleString();
}

function growthPercent(current: number | null, historic: number | null) {
  if (current == null || historic == null || historic <= 0) return null;
  return (current - historic) / historic;
}

function filterRange(points: ChartPoint[], range: RangeKey) {
  const days = RANGE_DAYS[range];
  if (days == null || !points.length) return points;
  const cutoff = Date.now() - days * 86400000;
  return points.filter((point) => Date.parse(point.date + 'T00:00:00Z') >= cutoff);
}

function buildNetworkSeries(history: Dashboard['metrics_history'], allowedPlaylistIds?: Set<string>): ChartPoint[] {
  const dayChanges = new Map<string, Map<string, number>>();
  Object.entries(history || {}).forEach(([playlistId, points]) => {
    if (allowedPlaylistIds && !allowedPlaylistIds.has(playlistId)) return;
    const latestByDay = new Map<string, { value: number; observed: string }>();
    for (const point of points || []) {
      if (point.followers == null) continue;
      const previous = latestByDay.get(point.metric_date);
      if (!previous || String(point.observed_at) >= previous.observed) {
        latestByDay.set(point.metric_date, { value: Number(point.followers), observed: String(point.observed_at || '') });
      }
    }
    latestByDay.forEach((point, date) => {
      const changes = dayChanges.get(date) || new Map<string, number>();
      changes.set(playlistId, point.value);
      dayChanges.set(date, changes);
    });
  });

  const latest = new Map<string, number>();
  return Array.from(dayChanges.keys()).sort().map((date) => {
    dayChanges.get(date)?.forEach((value, playlistId) => latest.set(playlistId, value));
    return {
      date,
      value: Array.from(latest.values()).reduce((sum, value) => sum + value, 0),
      coverage: latest.size,
    };
  });
}

function aggregateGrowth(playlists: any[], historicKey: string) {
  let current = 0;
  let historic = 0;
  let coverage = 0;
  for (const playlist of playlists) {
    const now = growthCurrent(playlist);
    const then = growthBaseline(playlist[historicKey]);
    if (now == null || then == null) continue;
    current += Number(now);
    historic += Number(then);
    coverage += 1;
  }
  return coverage ? {
    delta: current - historic,
    pct: historic > 0 ? (current - historic) / historic : null,
    coverage,
  } : { delta: null, pct: null, coverage: 0 };
}

function nextMilestone(current: number | null | undefined) {
  if (current == null) return null;
  const levels = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const target = levels.find((level) => level > current) || Math.ceil((current + 1) / 100000) * 100000;
  const previous = [...levels].reverse().find((level) => level <= current) || 0;
  return {
    target,
    remaining: Math.max(0, target - current),
    progress: target === previous ? 1 : Math.max(0, Math.min(1, (current - previous) / (target - previous))),
  };
}

function HistoryChart({ points, label }: { points: ChartPoint[]; label: string }) {
  if (points.length < 2) {
    return <div className="os-chart-empty"><strong>History starts with the first two observations.</strong><span>Once daily snapshots arrive, {label.toLowerCase()} will chart here automatically.</span></div>;
  }
  const width = 820;
  const height = 230;
  const padX = 14;
  const padY = 18;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y = height - padY - ((point.value - min) / span) * (height - padY * 2);
    return { x, y, point };
  });
  const path = coords.map((coord, index) => (index ? 'L' : 'M') + coord.x.toFixed(1) + ' ' + coord.y.toFixed(1)).join(' ');
  const latest = points[points.length - 1];
  return (
    <div className="os-history-chart">
      <div className="os-chart-scale"><span>{max.toLocaleString()}</span><span>{min.toLocaleString()}</span></div>
      <svg viewBox={'0 0 ' + width + ' ' + height} role="img" aria-label={label + ' history'}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="os-chart-axis"><span>{points[0].date}</span><strong>{latest.value.toLocaleString()}</strong><span>{latest.date}</span></div>
    </div>
  );
}

function NetworkIntelligence({ data, playlists }: { data: Dashboard; playlists: any[] }) {
  const [range, setRange] = useState<RangeKey>('30D');
  const [focus, setFocus] = useState('network');
  const history = data.metrics_history || {};
  const activePlaylistIds = useMemo(() => new Set(playlists.map((playlist) => String(playlist.playlist_id))), [playlists]);
  const networkAll = useMemo(() => buildNetworkSeries(history, activePlaylistIds), [history, activePlaylistIds]);
  const focusedPlaylist = playlists.find((playlist) => playlist.playlist_id === focus) || null;
  const playlistAll: ChartPoint[] = focusedPlaylist
    ? (history[focusedPlaylist.playlist_id] || [])
      .filter((point) => point.followers != null)
      .map((point) => ({ date: point.metric_date, value: Number(point.followers), coverage: 1 }))
    : [];
  const series = filterRange(focusedPlaylist ? playlistAll : networkAll, range);

  const d1 = aggregateGrowth(playlists, 'followers_1d_ago');
  const d7 = aggregateGrowth(playlists, 'followers_7d_ago');
  const d30 = aggregateGrowth(playlists, 'followers_30d_ago');
  const d90 = aggregateGrowth(playlists, 'followers_90d_ago');
  const followerProvider = data.integrations.find((integration) =>
    ['soundcharts', 'spotontrack', 'chartmetric'].includes(integration.provider) && integration.status === 'ready'
  );
  const coverage = summarizeCoverage(playlists.map((playlist) => ({
    assessment: assessPlaylistFollowers(playlist),
    requestStatus: playlist.follower_health?.last_request_status,
  })));
  const measured = Number(data.totals.followers_known_playlists || 0);
  const totalPlaylists = Number(data.totals.playlists || 0);
  const ranking7 = playlists
    .map((playlist) => ({ playlist, value: delta(growthCurrent(playlist), growthBaseline(playlist.followers_7d_ago)) }))
    .filter((row) => row.value != null)
    .sort((a, b) => Number(b.value) - Number(a.value));
  const ranking30 = playlists
    .map((playlist) => ({ playlist, value: delta(growthCurrent(playlist), growthBaseline(playlist.followers_30d_ago)) }))
    .filter((row) => row.value != null)
    .sort((a, b) => Number(b.value) - Number(a.value));
  const milestone = nextMilestone(focusedPlaylist ? assessPlaylistFollowers(focusedPlaylist).displayValue : null);

  return (
    <section className="os-section os-intelligence" id="growth">
      <div className="os-section-head">
        <div><p className="eyebrow">Playlist Growth Engine</p><h2>Network growth</h2></div>
        <div className="os-source-state">
          <span className={'status-pill ' + (coverage.monitored && coverage.fresh === coverage.monitored ? 'ready' : '')}>
            {coverage.fresh}/{coverage.monitored} fresh
          </span>
          <small>
            {followerProvider
              ? (followerProvider.provider === 'soundcharts' ? 'Soundcharts' : followerProvider.provider) + ' feed: '
                + coverage.delayed + ' delayed, ' + coverage.stale + ' stale, ' + coverage.unmeasuredZero + ' unconfirmed zero, '
                + coverage.requestFailures + ' request failures. A successful request is not a fresh measurement.'
              : 'Manual snapshots are live; automated follower data is not configured yet.'}
          </small>
        </div>
      </div>

      <div className="os-intelligence-grid">
        <Metric
          label="Total followers"
          value={measured ? data.totals.followers : null}
          note={measured + ' / ' + totalPlaylists + ' playlists measured'}
        />
        <Metric label="Today" value={d1.delta == null ? null : formatDelta(d1.delta)} note={d1.coverage + ' playlists with comparable history'} />
        <Metric label="Last 7 days" value={d7.delta == null ? null : formatDelta(d7.delta)} note={d7.pct == null ? d7.coverage + ' comparable' : pct(d7.pct) + ' · ' + d7.coverage + ' comparable'} />
        <Metric label="Last 30 days" value={d30.delta == null ? null : formatDelta(d30.delta)} note={d30.pct == null ? d30.coverage + ' comparable' : pct(d30.pct) + ' · ' + d30.coverage + ' comparable'} />
        <Metric label="Last 90 days" value={d90.delta == null ? null : formatDelta(d90.delta)} note={d90.pct == null ? d90.coverage + ' comparable' : pct(d90.pct) + ' · ' + d90.coverage + ' comparable'} />
      </div>

      <article className="card os-chart-card">
        <div className="os-chart-toolbar">
          <div>
            <p className="eyebrow">{focusedPlaylist ? 'Playlist history' : 'Measured network history'}</p>
            <h3>{focusedPlaylist ? focusedPlaylist.canonical_name : 'BVSS FVM Network'}</h3>
            <p className="muted">{focusedPlaylist ? 'Follower observations from the permanent snapshot ledger.' : 'Active-playlist follower history only. Earlier dates include only playlists Soundcharts was already tracking; coverage expands as new playlists begin accumulating history.'}</p>
          </div>
          <div className="os-chart-controls">
            <select value={focus} onChange={(event) => setFocus(event.target.value)} aria-label="Chart playlist">
              <option value="network">Entire network</option>
              {playlists.map((playlist) => <option key={playlist.playlist_id} value={playlist.playlist_id}>{playlist.canonical_name}</option>)}
            </select>
            <div className="os-range-tabs" aria-label="Chart date range">
              {(Object.keys(RANGE_DAYS) as RangeKey[]).map((item) => (
                <button key={item} type="button" className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>
              ))}
            </div>
          </div>
        </div>
        <HistoryChart points={series} label={focusedPlaylist ? focusedPlaylist.canonical_name : 'BVSS FVM network followers'} />
        {focusedPlaylist && (
          <div className="os-playlist-detail-strip">
            <div><span>Followers</span><strong data-follower-state={describeFollowers(focusedPlaylist).state}>{describeFollowers(focusedPlaylist).value}</strong><small>{describeFollowers(focusedPlaylist).detail}</small></div>
            <div><span>30d</span><strong>{formatDelta(delta(growthCurrent(focusedPlaylist), growthBaseline(focusedPlaylist.followers_30d_ago)))}</strong></div>
            <div><span>30d growth</span><strong>{pct(growthPercent(growthCurrent(focusedPlaylist), growthBaseline(focusedPlaylist.followers_30d_ago)))}</strong></div>
            <div><span>Tracks</span><strong>{focusedPlaylist.current_track_count ?? '—'}</strong></div>
            <div>
              <span>Next milestone</span>
              <strong>{milestone ? milestone.target.toLocaleString() : '—'}</strong>
              {milestone && <small>{milestone.remaining.toLocaleString()} to go · {Math.round(milestone.progress * 100)}%</small>}
            </div>
          </div>
        )}
      </article>

      <div className="os-leaderboard">
        <article className="card">
          <p className="eyebrow">7-day leaders</p>
          <h3>Fastest growth</h3>
          {ranking7.length ? ranking7.slice(0, 5).map((row, index) => (
            <div className="os-rank-row" key={row.playlist.playlist_id}><span>{index + 1}</span><strong>{row.playlist.canonical_name}</strong><b>{formatDelta(row.value)}</b></div>
          )) : <p className="muted">Needs at least two observations seven days apart.</p>}
        </article>
        <article className="card">
          <p className="eyebrow">30-day leaders</p>
          <h3>Monthly momentum</h3>
          {ranking30.length ? ranking30.slice(0, 5).map((row, index) => (
            <div className="os-rank-row" key={row.playlist.playlist_id}><span>{index + 1}</span><strong>{row.playlist.canonical_name}</strong><b>{formatDelta(row.value)}</b></div>
          )) : <p className="muted">Monthly rankings will appear when 30-day history exists.</p>}
        </article>
        <article className="card">
          <p className="eyebrow">Metric integrity</p>
          <h3>What we will not fake</h3>
          <p className="muted">Spotify does not provide a clean playlist-listener or playlist-stream count here. Followers, first-party traffic, Spotify outbound clicks, track changes and defensible provider reach stay separate.</p>
          <small>{(data.track_events || []).length} track-change events stored · {(data.sync_runs || []).length} sync runs stored</small>
        </article>
      </div>
    </section>
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

  async function download() {
    setBusy(true);
    try {
      const response = await fetch(playlistApiBase + '/bvss-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'download', submission_id: submission.id }),
      });
      const body = await response.json();
      if (response.ok && body.url) window.open(body.url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="os-review-card">
      <div className="os-review-head">
        <div>
          <span className="eyebrow">{submission.release_state === 'unreleased' ? 'unreleased · ' : ''}{submission.genre}</span>
          <h3>{submission.song_title}</h3>
          <p>{submission.artist_name} · {submission.email}</p>
        </div>
        <div className="actions">
          {submission.spotify_url ? (
            <a className="button button-secondary button-small" href={submission.spotify_url} target="_blank" rel="noreferrer">Listen on Spotify</a>
          ) : submission.private_stream_url ? (
            <a className="button button-secondary button-small" href={submission.private_stream_url} target="_blank" rel="noreferrer">Open private stream</a>
          ) : null}
          {submission.download_permission && (
            <button className="button button-secondary button-small" disabled={busy} onClick={download}>Download master</button>
          )}
        </div>
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

function QuickUpdate({
  playlists,
  token,
  refresh,
}: {
  playlists: any[];
  token: string;
  refresh: () => void;
}) {
  const [slug, setSlug] = useState('');
  const [followers, setFollowers] = useState('');
  const [trackCount, setTrackCount] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = playlists.find((p) => p.slug === slug);

  useEffect(() => {
    if (!slug && playlists.length) {
      const firstMissing = playlists.find((p) => p.current_follower_count == null || p.current_track_count == null) || playlists[0];
      setSlug(firstMissing.slug);
    }
  }, [playlists, slug]);

  useEffect(() => {
    if (!selected) return;
    setFollowers(selected.current_follower_count == null ? '' : String(selected.current_follower_count));
    setTrackCount(selected.current_track_count == null ? '' : String(selected.current_track_count));
  }, [selected?.playlist_id]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch(playlistApiBase + '/bvss-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Update failed.');
        return;
      }
      setStatus('Saved. History and operating view are updated.');
      refresh();
    } catch {
      setStatus('Update failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function recordMetric() {
    if (!slug) return;
    if (!followers.trim() && !trackCount.trim()) {
      setStatus('Enter a follower count, track count, or both.');
      return;
    }
    post({
      action: 'record_metric',
      playlist_slug: slug,
      followers: followers.trim() || null,
      track_count: trackCount.trim() || null,
    });
  }

  function markUpdated() {
    if (!slug) return;
    post({ action: 'mark_updated', playlist_slug: slug });
  }

  return (
    <article className="card">
      <p className="eyebrow">Quick update</p>
      <h3>Record what you can measure today</h3>
      <p className="muted">
        Use this until automated providers are connected. Every entry becomes a dated snapshot, so history starts now instead of waiting on an API.
      </p>
      <div className="os-review-controls">
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {playlists.map((p) => <option value={p.slug} key={p.slug}>{p.canonical_name}</option>)}
        </select>
        <input
          inputMode="numeric"
          min="0"
          type="number"
          value={followers}
          onChange={(e) => setFollowers(e.target.value)}
          placeholder="Followers"
          aria-label="Observed follower count"
        />
        <input
          inputMode="numeric"
          min="0"
          type="number"
          value={trackCount}
          onChange={(e) => setTrackCount(e.target.value)}
          placeholder="Track count"
          aria-label="Observed track count"
        />
        <button disabled={busy} onClick={recordMetric}>{busy ? 'Saving…' : 'Record snapshot'}</button>
        <button disabled={busy} onClick={markUpdated}>Mark playlist refreshed</button>
      </div>
      {selected && (
        <p className="muted">
          Current stored values: {selected.current_follower_count ?? 'no follower baseline'} followers ({describeFollowers(selected).detail}) · {selected.current_track_count ?? 'no track baseline'} tracks.
        </p>
      )}
      {status && <p className="muted" role="status">{status}</p>}
    </article>
  );
}

export default function PlaylistOSAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('dan@bvssfvm.com');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    if (!email.trim() || !password) {
      setStatus('Enter your admin email and password.');
      return;
    }
    setSigningIn(true);
    setStatus('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSigningIn(false);
    if (error) {
      setStatus(error.message === 'Invalid login credentials'
        ? 'Email or password is incorrect.'
        : error.message);
    }
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
  const automatedFollowerFeed = Boolean(data?.integrations?.some((integration) =>
    ['soundcharts', 'spotontrack', 'chartmetric'].includes(integration.provider) && integration.status === 'ready'
  ));

  if (!session) {
    return (
      <form className="os-login card" onSubmit={(event) => { event.preventDefault(); signIn(); }}>
        <p className="eyebrow">Secure admin</p>
        <h2>Playlist OS sign in</h2>
        <p className="muted">Sign in with your BVSS FVM admin account. Magic-link email is not required.</p>
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="button" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'}</button>
        {status && <p className="muted" role="status">{status}</p>}
      </form>
    );
  }

  if (error) {
    return <div className="card"><h3>Admin access required</h3><p>{error}</p><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div>;
  }

  if (!data) return <div className="card">Loading Playlist OS…</div>;

  return (
    <div className="playlist-os">
      <div className="os-toolbar"><div><p className="eyebrow">BVSS FVM internal</p><h1>Playlist OS</h1></div><div className="actions"><a className="button button-secondary" href="/one-campaign">One Campaign</a><a className="button button-secondary" href="#growth">Growth</a><a className="button button-secondary" href="/playlists" target="_blank" rel="noreferrer">Public network</a><a className="button button-secondary" href="/playlist-os/network">Curator network</a><button className="button button-secondary" onClick={load}>Refresh</button><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div></div>

      <div className="os-metrics-grid">
        <Metric label="Active playlists" value={totals.playlists || 0} />
        <Metric
          label="Measured followers"
          value={totals.followers_known_playlists ? totals.followers : null}
          note={(totals.followers_known_playlists || 0) + ' / ' + (totals.playlists || 0) + ' playlists with current measurements'
            + (totals.followers_unconfirmed_playlists ? ' · ' + totals.followers_unconfirmed_playlists + ' unconfirmed or stale' : '')}
        />
        <Metric label="Waiting submissions" value={data.queue.length} />
        <Metric label="Active placements" value={totals.active_placements || 0} note={(totals.own_artist_placements || 0) + ' Middle Child / SUBFLOWER tracks'} />
        <Metric label="30d pageviews" value={totals.pageviews_30d || 0} />
        <Metric label="30d Spotify clicks" value={totals.spotify_clicks_30d || 0} />
        <Metric label="Search impressions" value={totals.search_impressions_30d || 0} />
        <Metric label="Search clicks" value={totals.search_clicks_30d || 0} />
      </div>

      <NetworkIntelligence data={data} playlists={playlistRows} />

      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Next actions</p><h2>What needs attention now</h2></div>
          <p className="muted">Deterministic operating flags only — no invented health score.</p>
        </div>
        <div className="integration-grid">
          {(data.actions || []).slice(0, 12).map((action, index) => (
            <article className="card" key={action.type + ':' + (action.playlist_slug || 'network') + ':' + index}>
              <span className="status-pill">{action.priority}</span>
              <h3>{action.title}</h3>
              {action.playlist_name && <strong>{action.playlist_name}</strong>}
              <p>{action.detail}</p>
            </article>
          ))}
          {!(data.actions || []).length && <p className="muted">No operating actions are currently flagged.</p>}
        </div>
      </section>

      {!automatedFollowerFeed && (
        <section className="os-section">
          <div className="os-section-head">
            <div><p className="eyebrow">Baseline & maintenance</p><h2>Start the history now</h2></div>
          </div>
          <QuickUpdate playlists={playlistRows} token={session.access_token} refresh={load} />
        </section>
      )}

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Network</p><h2>Playlist operating view</h2></div><p className="muted">Missing metrics render as missing — never estimated.</p></div>
        <div className="os-table-wrap">
          <table className="os-table">
            <thead><tr><th>Playlist</th><th>Followers</th><th>Trend</th><th>1d</th><th>7d</th><th>30d</th><th>30d %</th><th>90d</th><th>Tracks</th><th>Queue</th><th>Placements</th><th>Own artists</th><th>Traffic 30d</th><th>Search 30d</th><th>Data health</th></tr></thead>
            <tbody>{playlistRows.map((p) => {
              const cur=growthCurrent(p);
              const d1=delta(cur,growthBaseline(p.followers_1d_ago));
              const d7=delta(cur,growthBaseline(p.followers_7d_ago));
              const d30=delta(cur,growthBaseline(p.followers_30d_ago));
              const d90=delta(cur,growthBaseline(p.followers_90d_ago));
              const p30=growthPercent(cur,growthBaseline(p.followers_30d_ago));
              const assessment=assessPlaylistFollowers(p);
              const shown=describeFollowers(p);
              const request=p.follower_health?.last_request_status;
              const health=p.current_follower_count==null
                ? 'Follower feed pending'
                : VALUE_STATE_LABEL[assessment.valueState] + ' · ' + FRESHNESS_LABEL[assessment.freshness]
                  + (request && request!=='ok' ? ' · last request ' + request.replace('_',' ') : '')
                  + (assessment.valueState==='measured' && d7!=null && d7<0 ? ' · decline' : '');
              return <tr key={p.playlist_id}>
                <td><strong>{p.canonical_name}</strong></td>
                <td title={shown.detail}><span data-follower-state={shown.state}>{shown.value}</span><br /><small className="muted">{shown.detail}</small></td>
                <td><Sparkline points={data.metrics_history?.[p.playlist_id] || []} /></td>
                <td>{formatDelta(d1)}</td>
                <td>{formatDelta(d7)}</td>
                <td>{formatDelta(d30)}</td>
                <td>{pct(p30)}</td>
                <td>{formatDelta(d90)}</td>
                <td>{p.current_track_count ?? '—'}</td>
                <td>{p.submissions_waiting}</td>
                <td>{p.active_placements}</td>
                <td>{p.own_artist_placements ?? 0}</td>
                <td>{p.pageviews_30d} / {p.spotify_clicks_30d}</td>
                <td>{p.search_impressions_30d} / {p.search_clicks_30d}</td>
                <td><span className={'status-pill ' + (assessment.valueState==='measured' && assessment.freshness==='fresh' ? 'ready' : '')} title={assessment.reason}>{health}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Growth attribution</p><h2>Which playlist lanes create action</h2></div>
          <p className="muted">30-day first-party events only. Rates stay blank until a real denominator exists.</p>
        </div>
        {(data.playlist_attribution || []).some((row) => row.views || row.spotify_clicks || row.submit_starts || row.submit_completes) ? (
          <div className="os-table-wrap">
            <table className="os-table">
              <thead><tr><th>Playlist</th><th>Views</th><th>Spotify clicks</th><th>Click rate</th><th>Submit starts</th><th>Submissions</th><th>Submission rate</th></tr></thead>
              <tbody>
                {(data.playlist_attribution || []).filter((row) => row.views || row.spotify_clicks || row.submit_starts || row.submit_completes).map((row) => (
                  <tr key={row.playlist_id}>
                    <td><strong>{row.canonical_name}</strong></td>
                    <td>{row.views}</td>
                    <td>{row.spotify_clicks}</td>
                    <td>{pct(row.spotify_ctr)}</td>
                    <td>{row.submit_starts}</td>
                    <td>{row.submit_completes}</td>
                    <td>{pct(row.submission_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No attributed playlist traffic yet. The instrumentation is live; this table will populate from real visitor activity.</p>}

        <div className="editorial-columns" style={{ marginTop: 18 }}>
          <article className="card">
            <p className="eyebrow">Traffic sources</p>
            <h3>Where visitors came from</h3>
            {(data.traffic_sources || []).length ? (
              <div className="track-list">
                {(data.traffic_sources || []).slice(0, 8).map((row) => (
                  <div key={row.source}><strong>{row.source}</strong><small>{row.events} events · {row.spotify_clicks} Spotify clicks</small></div>
                ))}
              </div>
            ) : <p className="muted">Awaiting first-party traffic events.</p>}
          </article>
          <article className="card">
            <p className="eyebrow">Submission sources</p>
            <h3>What generated artist intake</h3>
            {(data.submission_sources || []).length ? (
              <div className="track-list">
                {(data.submission_sources || []).slice(0, 8).map((row) => (
                  <div key={row.source}><strong>{row.source}</strong><small>{row.total} submissions · {row.accepted} accepted</small></div>
                ))}
              </div>
            ) : <p className="muted">No submissions recorded in the last 30 days.</p>}
          </article>
          <article className="card">
            <p className="eyebrow">Attribution rules</p>
            <h3>Traceable, not guessed</h3>
            <p className="muted">UTM source wins when present; otherwise the referrer host is used. Playlist-origin submissions are stored against their originating playlist page. Direct traffic stays labeled direct / unknown.</p>
          </article>
        </div>
      </section>


      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Playlist change history</p><h2>Track activity & sync receipts</h2></div>
          <p className="muted">The ledger is ready now; it only records observed changes from a real inventory source.</p>
        </div>
        {(data.track_events || []).length ? (
          <div className="os-table-wrap">
            <table className="os-table os-table-compact">
              <thead><tr><th>When</th><th>Playlist</th><th>Change</th><th>Spotify track</th><th>Position</th><th>Source</th></tr></thead>
              <tbody>{(data.track_events || []).slice(0, 50).map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.event_at).toLocaleString()}</td>
                  <td><strong>{event.bvss_playlists?.canonical_name || event.playlist_id}</strong></td>
                  <td>{event.event_type}</td>
                  <td>{event.spotify_track_id}</td>
                  <td>{event.old_position ?? '—'} → {event.new_position ?? '—'}</td>
                  <td>{event.source}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="card os-chart-empty">
            <strong>No track-change observations yet.</strong>
            <span>When Spotify or Soundcharts inventory sync is connected, additions, removals, moves and metadata changes will appear here without turning unknown data into zero.</span>
          </div>
        )}
        {!!(data.sync_runs || []).length && (
          <div className="os-sync-strip">
            {(data.sync_runs || []).slice(0, 8).map((run) => (
              <div key={run.id}><span>{run.provider} · {run.sync_type}</span><strong>{run.status}</strong><small>{run.records_written ?? 0} written · {new Date(run.requested_at).toLocaleString()}</small></div>
            ))}
          </div>
        )}
      </section>

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Review queue</p><h2>{data.queue.length} submissions waiting</h2></div></div>
        <div className="os-review-grid">{data.queue.length ? data.queue.map((s) => <ReviewCard key={s.id} submission={s} playlists={playlistRows} token={session.access_token} refresh={load} />) : <p className="muted">Queue clear.</p>}</div>
      </section>

      {!!data.legacy_playlists?.length && (
        <section className="os-section">
          <div className="os-section-head">
            <div><p className="eyebrow">Recovered archive</p><h2>{data.legacy_playlists.length} legacy BVSS FVM playlists found</h2></div>
            <p className="muted">Hidden from the public site until you explicitly choose to revive, merge or archive them.</p>
          </div>
          <div className="integration-grid">
            {data.legacy_playlists.map((p) => (
              <article className="card" key={p.id}>
                <span className="status-pill">legacy · monitored</span>
                <h3>{p.canonical_name}</h3>
                <p><strong data-follower-state={describeFollowers(p).state}>{describeFollowers(p).label}</strong> <small className="muted">{describeFollowers(p).detail}</small></p>
                <p>{p.description}</p>
                <a className="card-link" href={p.spotify_url} target="_blank" rel="noreferrer">Open on Spotify →</a>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="os-section">
        <div className="os-section-head"><div><p className="eyebrow">Data connections</p><h2>Integration truth</h2></div></div>
        <div className="integration-grid">{data.integrations.map((i) => <article className="card" key={i.provider}><span className="status-pill">{i.status}</span><h3>{i.provider}</h3><p>{i.notes}</p><small>{(i.capabilities || []).join(' · ')}</small></article>)}</div>
      </section>
    </div>
  );
}
