'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import {
  playlistApiBase,
  supabasePublishableKey,
  supabaseUrl,
} from '../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const SHORTLIST_KEY = 'bvss-one-campaign-shortlist-v1';

type Target = {
  id: string;
  target_source: 'bvss_playlist' | 'bvss_partner_playlist';
  name: string;
  url?: string | null;
  channel: string;
  genres: string[];
  moods: string[];
  audience_count?: number | null;
  audience_label?: string | null;
  submission_rules?: string | null;
  status: string;
  playlist_id: string;
  network_owner_type: 'bvss' | 'partner';
  verification_status: string;
  follower_count_source?: string | null;
  follower_count_observed_at?: string | null;
  updated_at?: string | null;
  eligibility: 'eligible' | 'blocked';
  blockers: string[];
  fit_reasons: string[];
  alignment_score: number;
  score_basis: string;
  authority: string;
  provenance: string;
};

type SourceHealth = {
  system: string;
  status: string;
  detail: string;
};

type Conflict = {
  severity: 'info' | 'warning';
  code: string;
  title: string;
  detail: string;
};

type CampaignData = {
  generated_at: string;
  mode: 'read_only';
  write_actions_enabled: false;
  artist: any;
  releases: any[];
  release: any;
  campaign: any | null;
  campaign_authority: {
    source_system: string;
    verdict: string;
    note: string;
  };
  conflicts: Conflict[];
  summary: Record<string, number>;
  source_health: SourceHealth[];
  targets: Target[];
  external_targets: any[];
  external_target_state: { status: string; reason: string };
  evidence: any[];
  placements: any[];
  native_lifecycle: {
    campaign_targets: any[];
    campaign_submissions: any[];
  };
};

type FilterKey = 'all' | 'eligible' | 'blocked' | 'shortlist';

function n(value: number | null | undefined) {
  return value == null ? '—' : Number(value).toLocaleString();
}

function date(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (['authoritative', 'eligible', 'ready', 'verified'].includes(normalized)) return 'ready';
  if (['partial', 'warning'].includes(normalized)) return 'warning';
  return '';
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string | null | undefined;
  note?: string;
}) {
  return (
    <div className="oc-metric">
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value ?? '—'}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function TargetRow({
  target,
  compared,
  shortlisted,
  onCompare,
  onShortlist,
}: {
  target: Target;
  compared: boolean;
  shortlisted: boolean;
  onCompare: () => void;
  onShortlist: () => void;
}) {
  return (
    <tr>
      <td>
        <div className="oc-target-name">
          <strong>{target.name}</strong>
          <small>{target.target_source === 'bvss_partner_playlist' ? 'Partner playlist' : 'BVSS playlist'}</small>
        </div>
      </td>
      <td>
        <span className={'status-pill ' + statusClass(target.eligibility)}>{target.eligibility}</span>
      </td>
      <td>
        <div className="oc-score">
          <strong>{target.alignment_score}</strong>
          <span>/100</span>
        </div>
      </td>
      <td>{n(target.audience_count)}</td>
      <td>
        <div className="oc-tags">
          {target.genres.slice(0, 3).map((item) => <span className="chip" key={item}>{item}</span>)}
        </div>
      </td>
      <td>
        <div className="oc-signal-list">
          {(target.eligibility === 'eligible' ? target.fit_reasons : target.blockers).slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </td>
      <td>
        <div className="oc-row-actions">
          <button
            type="button"
            className={'oc-action-toggle ' + (shortlisted ? 'active' : '')}
            onClick={onShortlist}
          >
            {shortlisted ? 'Shortlisted' : 'Shortlist'}
          </button>
          <button
            type="button"
            className={'oc-action-toggle ' + (compared ? 'active' : '')}
            onClick={onCompare}
          >
            {compared ? 'Comparing' : 'Compare'}
          </button>
          {target.url && (
            <a href={target.url} target="_blank" rel="noreferrer" className="oc-open-link">
              Spotify ↗
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function OneCampaignWorkbench() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('dan@bvssfvm.com');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SHORTLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setShortlistIds(parsed.filter((item) => typeof item === 'string'));
      }
    } catch {
      // Browser-only convenience state. A corrupt local value is safe to ignore.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlistIds));
    } catch {
      // Shortlist intentionally remains local-only in this read-only tranche.
    }
  }, [shortlistIds]);

  async function signIn() {
    if (!email.trim() || !password) {
      setAuthStatus('Enter your admin email and password.');
      return;
    }
    setSigningIn(true);
    setAuthStatus('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSigningIn(false);
    if (error) {
      setAuthStatus(error.message === 'Invalid login credentials'
        ? 'Email or password is incorrect.'
        : error.message);
    }
  }

  async function load(releaseId?: string) {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const suffix = releaseId ? '?release_id=' + encodeURIComponent(releaseId) : '';
      const response = await fetch(playlistApiBase + '/bvss-one-campaign' + suffix, {
        headers: { Authorization: 'Bearer ' + session.access_token },
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) {
        setData(null);
        setError(
          body.error === 'not_authorized'
            ? 'This signed-in account is not provisioned as a BVSS FVM admin.'
            : body.detail || body.error || 'One Campaign data could not be loaded.',
        );
        return;
      }
      setData(body);
      setCompareIds([]);
    } catch {
      setData(null);
      setError('One Campaign could not connect to its read layer.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) load();
  }, [session]);

  const shortlistSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  const filteredTargets = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.targets.filter((target) => {
      if (filter === 'eligible' && target.eligibility !== 'eligible') return false;
      if (filter === 'blocked' && target.eligibility !== 'blocked') return false;
      if (filter === 'shortlist' && !shortlistSet.has(target.id)) return false;
      if (!needle) return true;
      const haystack = [
        target.name,
        target.genres.join(' '),
        target.moods.join(' '),
        target.fit_reasons.join(' '),
        target.blockers.join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [data, filter, query, shortlistSet]);

  const comparedTargets = useMemo(
    () => (data?.targets || []).filter((target) => compareSet.has(target.id)),
    [data, compareSet],
  );

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  function toggleShortlist(id: string) {
    setShortlistIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  if (!session) {
    return (
      <form className="os-login card oc-login" onSubmit={(event) => { event.preventDefault(); signIn(); }}>
        <p className="eyebrow">BVSS FVM internal</p>
        <h1>One Campaign</h1>
        <p className="muted">Sign in with the same BVSS FVM admin account you use for Playlist OS.</p>
        <div className="field">
          <label htmlFor="campaign-email">Email</label>
          <input id="campaign-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="campaign-password">Password</label>
          <input id="campaign-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="button" type="submit" disabled={signingIn}>
          {signingIn ? 'Signing in…' : 'Sign in'}
        </button>
        {authStatus && <p className="muted" role="status">{authStatus}</p>}
      </form>
    );
  }

  if (error) {
    return (
      <div className="card oc-error">
        <p className="eyebrow">One Campaign</p>
        <h2>Read layer unavailable</h2>
        <p>{error}</p>
        <div className="actions">
          <button className="button" type="button" onClick={() => load()}>Retry</button>
          <button className="button button-secondary" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  if (!data) return <div className="card oc-loading">{loading ? 'Loading One Campaign…' : 'Preparing campaign workspace…'}</div>;

  const campaign = data.campaign;
  const release = data.release;
  const summary = data.summary;

  return (
    <div className="one-campaign">
      <div className="oc-toolbar">
        <div>
          <p className="eyebrow">BVSS FVM internal · read-only pilot</p>
          <h1>One Campaign</h1>
        </div>
        <div className="actions">
          <a className="button button-secondary" href="/playlist-os">Playlist OS</a>
          <button className="button button-secondary" type="button" disabled={loading} onClick={() => load(release.id)}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      <div className="oc-readonly-banner">
        <span className="status-pill ready">read only</span>
        <div>
          <strong>Safe test build</strong>
          <p>No outreach, routing, submission, placement, or campaign write can be triggered from this screen. Shortlist and compare are browser-local only.</p>
        </div>
      </div>

      <section className="oc-hero card">
        <div className="oc-hero-copy">
          <p className="eyebrow">Middle Child · release command center</p>
          <div className="oc-title-row">
            <h2>{release.title}</h2>
            <span className="status-pill">{release.status || 'unknown'}</span>
          </div>
          <p className="oc-campaign-name">{campaign?.name || 'No ArtistOS campaign record'}</p>
          <p className="muted">{campaign?.goals || 'No campaign goal is stored for this release.'}</p>
          <div className="oc-identity-strip">
            <span><b>ISRC</b> {release.isrc || '—'}</span>
            <span><b>Release</b> {date(release.release_date)}</span>
            <span><b>Label</b> {release.label || '—'}</span>
            <span><b>Campaign</b> {campaign?.status || 'missing'}</span>
          </div>
          <div className="actions">
            {release.spotify_url && <a className="button button-small" href={release.spotify_url} target="_blank" rel="noreferrer">Open release ↗</a>}
            {campaign && <span className="oc-authority">Authority: {data.campaign_authority.verdict}</span>}
          </div>
        </div>

        <div className="oc-release-picker">
          <label htmlFor="campaign-release">Release</label>
          <select
            id="campaign-release"
            value={release.id}
            onChange={(event) => load(event.target.value)}
            disabled={loading}
          >
            {data.releases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}{item.release_date ? ' · ' + item.release_date : ''}
              </option>
            ))}
          </select>
          <small>Switching releases only changes the read projection. It does not create or edit a campaign.</small>
        </div>
      </section>

      <div className="oc-metrics-grid">
        <Metric label="Target universe" value={summary.internal_targets} note="active BVSS playlists" />
        <Metric label="Eligible now" value={summary.eligible_internal_targets} note="all hard gates pass" />
        <Metric label="External targets" value={summary.external_targets} note="CuratorFit design-dormant" />
        <Metric label="Evidence" value={summary.evidence_records} note={summary.verified_evidence_records + ' verified'} />
        <Metric label="Placements" value={summary.placements} note={summary.live_placements + ' currently live'} />
        <Metric label="Native pitches" value={summary.native_campaign_submissions} note="ArtistOS campaign submissions" />
      </div>

      <section className="oc-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Source health</p><h2>What One Campaign actually knows</h2></div>
          <p className="muted">Generated {new Date(data.generated_at).toLocaleString()} · no guessed rows</p>
        </div>
        <div className="oc-source-grid">
          {data.source_health.map((source) => (
            <article className="card" key={source.system}>
              <span className={'status-pill ' + statusClass(source.status)}>{source.status}</span>
              <h3>{source.system}</h3>
              <p className="muted">{source.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {!!data.conflicts.length && (
        <section className="oc-section">
          <div className="os-section-head">
            <div><p className="eyebrow">Conflict ledger</p><h2>Facts that do not cleanly agree</h2></div>
            <p className="muted">Surfaced, never auto-corrected.</p>
          </div>
          <div className="oc-conflict-grid">
            {data.conflicts.map((conflict) => (
              <article className={'card oc-conflict ' + conflict.severity} key={conflict.code}>
                <span className={'status-pill ' + statusClass(conflict.severity)}>{conflict.severity}</span>
                <h3>{conflict.title}</h3>
                <p>{conflict.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="oc-section" id="targets">
        <div className="os-section-head oc-target-head">
          <div>
            <p className="eyebrow">Target workbench</p>
            <h2>Internal playlist universe</h2>
            <p className="muted">Alignment score is deterministic: ArtistOS artist-tag overlap + BVSS eligibility/readiness signals. It is not an ML prediction or placement guarantee.</p>
          </div>
          <div className="oc-target-controls">
            <input
              type="search"
              placeholder="Search target, genre, reason…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search campaign targets"
            />
            <div className="oc-filter-tabs" aria-label="Target filters">
              {([
                ['all', 'All'],
                ['eligible', 'Eligible'],
                ['blocked', 'Blocked'],
                ['shortlist', 'Shortlist'],
              ] as [FilterKey, string][]).map(([key, label]) => (
                <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="oc-workbench-meta">
          <span>{filteredTargets.length} shown</span>
          <span>{shortlistIds.filter((id) => data.targets.some((target) => target.id === id)).length} shortlisted locally</span>
          <span>{compareIds.length}/4 compare slots</span>
        </div>

        <div className="os-table-wrap">
          <table className="os-table oc-target-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Gate</th>
                <th>Alignment</th>
                <th>Followers</th>
                <th>Genres</th>
                <th>Why / blocker</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {filteredTargets.map((target) => (
                <TargetRow
                  key={target.id}
                  target={target}
                  compared={compareSet.has(target.id)}
                  shortlisted={shortlistSet.has(target.id)}
                  onCompare={() => toggleCompare(target.id)}
                  onShortlist={() => toggleShortlist(target.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {!filteredTargets.length && <div className="card oc-empty">No targets match this view.</div>}
      </section>

      {!!comparedTargets.length && (
        <section className="oc-section oc-compare">
          <div className="os-section-head">
            <div><p className="eyebrow">Compare tray</p><h2>{comparedTargets.length} targets side by side</h2></div>
            <button className="button button-secondary" type="button" onClick={() => setCompareIds([])}>Clear compare</button>
          </div>
          <div className="oc-compare-grid">
            {comparedTargets.map((target) => (
              <article className="card" key={target.id}>
                <div className="oc-compare-top">
                  <span className={'status-pill ' + statusClass(target.eligibility)}>{target.eligibility}</span>
                  <strong>{target.alignment_score}/100</strong>
                </div>
                <h3>{target.name}</h3>
                <p className="muted">{target.audience_label || 'Followers unmeasured'} · {target.verification_status}</p>
                <div className="oc-tags">{target.genres.map((item) => <span className="chip" key={item}>{item}</span>)}</div>
                <div className="oc-signal-list">
                  {(target.eligibility === 'eligible' ? target.fit_reasons : target.blockers).map((item) => <span key={item}>{item}</span>)}
                </div>
                <small>Observed {date(target.follower_count_observed_at || target.updated_at)} · {target.follower_count_source || 'BVSS registry'}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="oc-section">
        <div className="os-section-head">
          <div><p className="eyebrow">External universe</p><h2>CuratorFit targets</h2></div>
          <span className="status-pill">{data.external_target_state.status}</span>
        </div>
        <div className="card oc-empty oc-external-empty">
          <strong>0 external targets by design.</strong>
          <p>{data.external_target_state.reason}</p>
          <small>One Campaign will not fill this area with mock curators or guessed contacts.</small>
        </div>
      </section>

      <section className="oc-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Evidence trail</p><h2>Release + artist evidence</h2></div>
          <p className="muted">{data.evidence.length} source records</p>
        </div>
        {data.evidence.length ? (
          <div className="os-table-wrap">
            <table className="os-table oc-evidence-table">
              <thead><tr><th>Observed</th><th>Evidence</th><th>Source</th><th>Confidence</th><th>Verification</th><th>Conflict</th></tr></thead>
              <tbody>
                {data.evidence.slice(0, 40).map((row) => (
                  <tr key={row.id}>
                    <td>{date(row.observed_at)}</td>
                    <td><strong>{row.evidence_type}</strong></td>
                    <td>{row.source_type}{row.source_uri ? ' · linked' : ''}</td>
                    <td>{row.confidence_score == null ? row.confidence || '—' : Math.round(Number(row.confidence_score) * 100) + '%'}</td>
                    <td><span className={'status-pill ' + statusClass(row.verification_status)}>{row.verification_status}</span></td>
                    <td>{row.contradiction_state || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="card oc-empty">No evidence records are attached to this artist or release.</div>}
      </section>

      <section className="oc-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Observed outcomes</p><h2>Playlist placements</h2></div>
          <p className="muted">ArtistOS placement evidence · not inferred from BVSS targets</p>
        </div>
        {data.placements.length ? (
          <div className="os-table-wrap">
            <table className="os-table oc-placement-table">
              <thead><tr><th>Playlist</th><th>Position</th><th>Added</th><th>State</th><th>Confidence</th><th>Last verified</th></tr></thead>
              <tbody>
                {data.placements.slice(0, 60).map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.playlist_name}</strong></td>
                    <td>{row.track_position ?? '—'}</td>
                    <td>{date(row.added_at)}</td>
                    <td><span className={'status-pill ' + statusClass(row.verification_state)}>{row.verification_state || 'unknown'}</span></td>
                    <td>{row.confidence == null ? '—' : Math.round(Number(row.confidence) * 100) + '%'}</td>
                    <td>{date(row.last_verified_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="card oc-empty">No ArtistOS placement rows exist for this release.</div>}
      </section>

      <section className="oc-section oc-native">
        <div className="os-section-head">
          <div><p className="eyebrow">Native lifecycle</p><h2>ArtistOS pitch state</h2></div>
          <p className="muted">Kept separate from BVSS playlist eligibility.</p>
        </div>
        <div className="oc-source-grid">
          <article className="card">
            <strong className="oc-big-number">{summary.native_campaign_targets}</strong>
            <h3>Campaign targets</h3>
            <p className="muted">Native ArtistOS campaign_targets rows for this campaign.</p>
          </article>
          <article className="card">
            <strong className="oc-big-number">{summary.native_campaign_submissions}</strong>
            <h3>Campaign submissions</h3>
            <p className="muted">Native ArtistOS campaign_submissions rows. One Campaign does not synthesize them.</p>
          </article>
          <article className="card">
            <span className="status-pill">writes disabled</span>
            <h3>Action boundary</h3>
            <p className="muted">This build stops at review, compare and local shortlist. Routing/outreach comes only after the read experience is accepted.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
