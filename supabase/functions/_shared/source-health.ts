// Source-health rules for provider-measured playlist metrics.
//
// Pure, dependency-free TypeScript shared by the Deno edge functions, the
// Next.js UI (via lib/source-health.ts) and the Node test suite.
//
// Four dimensions are kept separate and never collapsed into one field:
//   request status  did the provider request work?
//   freshness       how old is the PROVIDER'S OWN measurement?
//   confidence      should a person trust this number?
//   coverage        how much of the network is freshly measured right now?
//
// Rules this module enforces:
//   * Retrieval time is never measurement time. A missing, unparseable or
//     future provider timestamp makes the reading unavailable; it is never
//     replaced with "now".
//   * An older measurement never replaces a newer one.
//   * A zero is not authoritative unless it is fresh AND corroborated by an
//     earlier, distinct provider measurement that was also near zero.
//   * A failed request does not age or erase an existing measurement; the
//     measurement keeps aging by its own timestamp.

export type RequestStatus = 'ok' | 'not_found' | 'forbidden' | 'error' | 'auth_failed' | 'not_monitored';
export type FreshnessState = 'fresh' | 'delayed' | 'stale' | 'unavailable';
export type Confidence = 'high' | 'medium' | 'low' | 'none';
export type ValueState = 'measured' | 'unmeasured_zero' | 'stale' | 'anomalous' | 'unavailable';

export const FRESHNESS_POLICY = {
  /** Soundcharts crawls monitored playlists roughly daily. */
  freshMaxHours: 36,
  delayedMaxHours: 24 * 7,
  /** Provider timestamps more than this far in the future are rejected. */
  futureToleranceMinutes: 10,
  /** Zero is only corroborated by a previous distinct reading at or below this. */
  zeroCorroborationMax: 5,
  /** Day-over-day change beyond both thresholds is flagged anomalous. */
  anomalyMinAbsoluteChange: 50,
  anomalyMinRelativeChange: 0.4,
  /** Unchanged provider timestamps across this many runs lowers confidence. */
  unchangedRunsWarning: 3,
} as const;

const HOUR_MS = 3_600_000;

/**
 * Parse a provider measurement timestamp. Returns an ISO string, or null when
 * missing, unparseable or implausibly in the future. Never falls back to now.
 */
export function parseProviderTimestamp(value: unknown, now: Date): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() - now.getTime() > FRESHNESS_POLICY.futureToleranceMinutes * 60_000) return null;
  return parsed.toISOString();
}

/** Non-negative integer or null. Strings are accepted only if fully numeric. */
export function parseCount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function classifyHttpStatus(status: number): RequestStatus {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 404) return 'not_found';
  if (status === 401 || status === 403) return 'forbidden';
  return 'error';
}

export function isNewerMeasurement(incoming: string | null, existing: string | null | undefined): boolean {
  if (!incoming) return false;
  if (!existing) return true;
  return new Date(incoming).getTime() > new Date(existing).getTime();
}

/** Freshness depends only on the age of the provider's own measurement. */
export function classifyFreshness(measuredAt: string | null | undefined, now: Date): FreshnessState {
  if (!measuredAt) return 'unavailable';
  const ageHours = (now.getTime() - new Date(measuredAt).getTime()) / HOUR_MS;
  if (Number.isNaN(ageHours)) return 'unavailable';
  if (ageHours <= FRESHNESS_POLICY.freshMaxHours) return 'fresh';
  if (ageHours <= FRESHNESS_POLICY.delayedMaxHours) return 'delayed';
  return 'stale';
}

export interface MetricEvidence {
  /** Latest known provider value (the best measurement we hold). */
  value: number | null;
  /** Provider timestamp of that value. */
  measuredAt: string | null;
  /** The distinct measurement before it, if any. */
  previousValue?: number | null;
  previousMeasuredAt?: string | null;
  /** Result of the most recent request (does not change freshness). */
  requestStatus?: RequestStatus;
  /** Runs in a row where the provider returned the same measurement time. */
  consecutiveUnchanged?: number;
}

export interface MetricAssessment {
  freshness: FreshnessState;
  confidence: Confidence;
  valueState: ValueState;
  /** Value safe to display as a number, or null ("Measuring" / unavailable). */
  displayValue: number | null;
  /** Value safe to use as a growth-delta endpoint, or null. */
  deltaEligibleValue: number | null;
  reason: string;
}

export function isAnomalousChange(previous: number | null | undefined, current: number | null | undefined): boolean {
  if (previous === null || previous === undefined || current === null || current === undefined) return false;
  const change = Math.abs(current - previous);
  if (change < FRESHNESS_POLICY.anomalyMinAbsoluteChange) return false;
  const base = Math.max(previous, 1);
  return change / base > FRESHNESS_POLICY.anomalyMinRelativeChange;
}

export function assessMetric(evidence: MetricEvidence, now: Date): MetricAssessment {
  const { value, measuredAt } = evidence;
  const freshness = classifyFreshness(value === null ? null : measuredAt, now);

  if (value === null || freshness === 'unavailable') {
    const reason = evidence.requestStatus && evidence.requestStatus !== 'ok'
      ? `No usable measurement; last request ${evidence.requestStatus}.`
      : 'No provider measurement with a valid timestamp.';
    return { freshness: 'unavailable', confidence: 'none', valueState: 'unavailable', displayValue: null, deltaEligibleValue: null, reason };
  }

  if (value === 0) {
    const corroborated = freshness === 'fresh'
      && evidence.previousValue !== null && evidence.previousValue !== undefined
      && evidence.previousValue <= FRESHNESS_POLICY.zeroCorroborationMax
      && !!evidence.previousMeasuredAt && evidence.previousMeasuredAt !== measuredAt;
    if (!corroborated) {
      return {
        freshness,
        confidence: 'none',
        valueState: 'unmeasured_zero',
        displayValue: null,
        deltaEligibleValue: null,
        reason: 'Provider reports 0 without a fresh, corroborating earlier measurement; treated as not yet measured.',
      };
    }
  }

  if (freshness === 'stale') {
    return { freshness, confidence: 'low', valueState: 'stale', displayValue: value, deltaEligibleValue: null, reason: 'Provider measurement is more than 7 days old.' };
  }

  if (isAnomalousChange(evidence.previousValue, value)) {
    return {
      freshness,
      confidence: 'low',
      valueState: 'anomalous',
      displayValue: value,
      deltaEligibleValue: null,
      reason: `Changed from ${evidence.previousValue} to ${value} between consecutive measurements; needs a spot check before use in growth metrics.`,
    };
  }

  let confidence: Confidence = freshness === 'fresh' ? 'high' : 'medium';
  if ((evidence.consecutiveUnchanged ?? 0) >= FRESHNESS_POLICY.unchangedRunsWarning) confidence = confidence === 'high' ? 'medium' : 'low';
  const reason = freshness === 'fresh' ? 'Fresh provider measurement.' : 'Provider measurement is 36 hours to 7 days old.';
  return { freshness, confidence, valueState: 'measured', displayValue: value, deltaEligibleValue: value, reason };
}

export interface CoverageSummary {
  monitored: number;
  fresh: number;
  delayed: number;
  stale: number;
  unavailable: number;
  /** Values displayable as a number (measured, stale or anomalous). */
  displayable: number;
  unmeasuredZero: number;
  requestFailures: number;
  /** Share of monitored playlists with a fresh, measured value (0..1). */
  freshMeasuredShare: number;
}

export function summarizeCoverage(items: Array<{ assessment: MetricAssessment; requestStatus?: RequestStatus }>): CoverageSummary {
  const summary: CoverageSummary = { monitored: 0, fresh: 0, delayed: 0, stale: 0, unavailable: 0, displayable: 0, unmeasuredZero: 0, requestFailures: 0, freshMeasuredShare: 0 };
  let freshMeasured = 0;
  for (const { assessment, requestStatus } of items) {
    if (requestStatus === 'not_monitored') continue;
    summary.monitored += 1;
    summary[assessment.freshness] += 1;
    if (assessment.displayValue !== null) summary.displayable += 1;
    if (assessment.valueState === 'unmeasured_zero') summary.unmeasuredZero += 1;
    if (requestStatus && requestStatus !== 'ok') summary.requestFailures += 1;
    if (assessment.freshness === 'fresh' && assessment.valueState === 'measured') freshMeasured += 1;
  }
  summary.freshMeasuredShare = summary.monitored ? freshMeasured / summary.monitored : 0;
  return summary;
}

/** A run is only "completed" when every monitored playlist is freshly measured. */
export function runStatusFor(summary: CoverageSummary, anyRequestSucceeded: boolean): 'completed' | 'partial' | 'failed' {
  if (!anyRequestSucceeded) return 'failed';
  const everyFresh = summary.monitored > 0 && summary.fresh === summary.monitored && summary.requestFailures === 0 && summary.unmeasuredZero === 0;
  return everyFresh ? 'completed' : 'partial';
}

/** Growth delta only between two trustworthy endpoints; a zero baseline is never trusted. */
export function trustworthyDelta(current: number | null, baseline: number | null | undefined): number | null {
  if (current === null || baseline === null || baseline === undefined || baseline === 0) return null;
  return current - baseline;
}

export const FRESHNESS_LABEL: Record<FreshnessState, string> = {
  fresh: 'Fresh',
  delayed: 'Delayed',
  stale: 'Stale',
  unavailable: 'Unavailable',
};

export const VALUE_STATE_LABEL: Record<ValueState, string> = {
  measured: 'Measured',
  unmeasured_zero: 'Measuring',
  stale: 'Stale',
  anomalous: 'Needs check',
  unavailable: 'Unavailable',
};
