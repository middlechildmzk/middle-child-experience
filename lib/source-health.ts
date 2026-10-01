// UI-facing source-health helpers. The rules themselves live in
// supabase/functions/_shared/source-health.ts and are shared with the sync.
//
// Assessments are recomputed at render time from the provider measurement
// timestamp, so a value keeps aging between sync runs instead of freezing at
// whatever state the last run wrote.

import {
  type Confidence,
  type FreshnessState,
  type MetricAssessment,
  type RequestStatus,
  type ValueState,
  assessMetric,
  trustworthyDelta,
} from '../supabase/functions/_shared/source-health';

export * from '../supabase/functions/_shared/source-health';

/** Public-safe projection of bvss_playlist_source_status (followers). */
export type FollowerHealth = {
  last_request_status: RequestStatus;
  last_provider_measured_at: string | null;
  last_value: number | null;
  previous_provider_measured_at: string | null;
  previous_value: number | null;
  consecutive_unchanged_measurements: number;
  freshness_state: FreshnessState;
  confidence: Confidence;
  value_state: ValueState;
  /** Admin-only; null in the public projection. */
  last_attempt_at: string | null;
};

export type FollowerFields = {
  current_follower_count: number | null;
  follower_count_observed_at: string | null;
  follower_count_source?: string | null;
  follower_health?: FollowerHealth | null;
};

const sameInstant = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && new Date(a).getTime() === new Date(b).getTime();

export function assessPlaylistFollowers(playlist: FollowerFields, now: Date = new Date()): MetricAssessment {
  const health = playlist.follower_health;
  const matches = health && sameInstant(health.last_provider_measured_at, playlist.follower_count_observed_at);
  return assessMetric({
    value: playlist.current_follower_count,
    measuredAt: playlist.follower_count_observed_at,
    previousValue: matches ? health!.previous_value : null,
    previousMeasuredAt: matches ? health!.previous_provider_measured_at : null,
    requestStatus: health?.last_request_status,
    consecutiveUnchanged: matches ? health!.consecutive_unchanged_measurements : 0,
  }, now);
}

export function formatMeasuredDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export type FollowerDisplay = {
  /** Headline: a count, or "Measuring". Never a count we cannot stand behind. */
  value: string;
  /** Headline including the unit, for single-line placements. */
  label: string;
  /** Provenance line: when it was measured and how current that is. */
  detail: string;
  state: ValueState;
  freshness: FreshnessState;
};

export function describeFollowers(playlist: FollowerFields, now: Date = new Date()): FollowerDisplay {
  const assessment = assessPlaylistFollowers(playlist, now);
  const when = formatMeasuredDate(playlist.follower_count_observed_at);
  const base = { state: assessment.valueState, freshness: assessment.freshness };
  if (assessment.displayValue === null) {
    return {
      ...base,
      value: 'Measuring',
      label: 'Followers measuring',
      detail: assessment.valueState === 'unmeasured_zero' ? 'Follower count not confirmed yet' : 'Follower data not available yet',
    };
  }
  const count = assessment.displayValue.toLocaleString('en-US');
  const detail =
    assessment.valueState === 'stale' ? `Last measured ${when} · may be out of date`
    : assessment.valueState === 'anomalous' ? `Measured ${when} · recent change being verified`
    : assessment.freshness === 'delayed' ? `Last measured ${when}`
    : `Measured ${when}`;
  return { ...base, value: count, label: `${count} followers`, detail };
}

export type NetworkFollowerTotals = {
  total: number;
  /** Playlists whose current (fresh or delayed) value is included. */
  counted: number;
  monitored: number;
  /** e.g. "10,432 followers across 16 of 24 playlists". Empty when nothing counts. */
  label: string;
};

/**
 * Network totals include only current, displayable measurements (fresh or
 * delayed; measured or flagged). Stale values, unconfirmed zeros and missing
 * data are left out and the coverage is always stated.
 */
export function networkFollowerTotals(playlists: FollowerFields[], now: Date = new Date()): NetworkFollowerTotals {
  let total = 0;
  let counted = 0;
  for (const playlist of playlists) {
    const a = assessPlaylistFollowers(playlist, now);
    if (a.displayValue !== null && (a.valueState === 'measured' || a.valueState === 'anomalous')) {
      total += a.displayValue;
      counted += 1;
    }
  }
  const label = counted
    ? `${total.toLocaleString('en-US')} followers across ${counted} of ${playlists.length} playlists`
    : '';
  return { total, counted, monitored: playlists.length, label };
}

/** Growth delta that refuses untrustworthy endpoints (stale, unconfirmed or zero). */
export function followerDelta(playlist: FollowerFields, baseline: number | null | undefined, now: Date = new Date()): number | null {
  return trustworthyDelta(assessPlaylistFollowers(playlist, now).deltaEligibleValue, baseline);
}

/**
 * Public-site variant (D2). Soundcharts public-display rights are unconfirmed,
 * so public pages carry only freshness-derived state labels: no measurement
 * dates and no provider history. The count itself stays at its existing
 * public exposure. Admin surfaces keep describeFollowers (with dates).
 */
const PUBLIC_DETAIL: Record<ValueState, string> = {
  measured: '',
  unmeasured_zero: 'Follower count not confirmed yet',
  stale: 'May be out of date',
  anomalous: 'Recent change being verified',
  unavailable: 'Follower data not available yet',
};

export function describeFollowersPublic(playlist: FollowerFields, now: Date = new Date()): FollowerDisplay {
  const full = describeFollowers(playlist, now);
  const detail = full.state === 'measured' && full.freshness === 'delayed' ? 'Update pending' : PUBLIC_DETAIL[full.state];
  return { ...full, detail };
}
