import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FRESHNESS_POLICY,
  assessMetric,
  classifyFreshness,
  classifyHttpStatus,
  isNewerMeasurement,
  parseCount,
  parseProviderTimestamp,
  runStatusFor,
  summarizeCoverage,
  trustworthyDelta,
} from '../../supabase/functions/_shared/source-health.ts';

const NOW = new Date('2026-09-29T15:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

test('fresh measurement is measured with high confidence', () => {
  const a = assessMetric({ value: 2269, measuredAt: hoursAgo(10), previousValue: 2244, previousMeasuredAt: hoursAgo(34) }, NOW);
  assert.deepEqual([a.freshness, a.confidence, a.valueState, a.displayValue, a.deltaEligibleValue], ['fresh', 'high', 'measured', 2269, 2269]);
});

test('delayed measurement (36h to 7d) is displayable with medium confidence', () => {
  const a = assessMetric({ value: 158, measuredAt: hoursAgo(58) }, NOW);
  assert.deepEqual([a.freshness, a.confidence, a.valueState, a.displayValue], ['delayed', 'medium', 'measured', 158]);
});

test('stale measurement (>7d) is shown as stale and excluded from deltas', () => {
  const a = assessMetric({ value: 327, measuredAt: hoursAgo(24 * 10) }, NOW);
  assert.deepEqual([a.freshness, a.confidence, a.valueState, a.displayValue, a.deltaEligibleValue], ['stale', 'low', 'stale', 327, null]);
});

test('freshness boundaries follow the policy exactly', () => {
  assert.equal(classifyFreshness(hoursAgo(FRESHNESS_POLICY.freshMaxHours), NOW), 'fresh');
  assert.equal(classifyFreshness(hoursAgo(FRESHNESS_POLICY.freshMaxHours + 0.01), NOW), 'delayed');
  assert.equal(classifyFreshness(hoursAgo(FRESHNESS_POLICY.delayedMaxHours), NOW), 'delayed');
  assert.equal(classifyFreshness(hoursAgo(FRESHNESS_POLICY.delayedMaxHours + 0.01), NOW), 'stale');
  assert.equal(classifyFreshness(null, NOW), 'unavailable');
});

test('missing, invalid or future provider crawl timestamps are never replaced with now', () => {
  for (const value of [undefined, null, '', '   ', 'not a date', {}, []]) {
    assert.equal(parseProviderTimestamp(value, NOW), null, JSON.stringify(value));
  }
  assert.equal(parseProviderTimestamp(new Date(NOW.getTime() + 60 * 60_000).toISOString(), NOW), null, 'an hour in the future');
  assert.equal(parseProviderTimestamp('2026-09-29T05:00:02+00:00', NOW), '2026-09-29T05:00:02.000Z');
  const a = assessMetric({ value: 200, measuredAt: null }, NOW);
  assert.deepEqual([a.freshness, a.valueState, a.displayValue], ['unavailable', 'unavailable', null]);
});

test('stale zero is not an authoritative zero (the production defect)', () => {
  // 8 active playlists: single Soundcharts crawl on 2026-09-26 reporting 0, never recrawled.
  const a = assessMetric({ value: 0, measuredAt: '2026-09-26T19:46:50.000Z', consecutiveUnchanged: 3 }, NOW);
  assert.equal(a.valueState, 'unmeasured_zero');
  assert.equal(a.displayValue, null);
  assert.equal(a.deltaEligibleValue, null);
  assert.equal(a.confidence, 'none');
});

test('even a fresh zero needs an earlier, distinct near-zero measurement', () => {
  assert.equal(assessMetric({ value: 0, measuredAt: hoursAgo(2) }, NOW).valueState, 'unmeasured_zero');
  assert.equal(assessMetric({ value: 0, measuredAt: hoursAgo(2), previousValue: 200, previousMeasuredAt: hoursAgo(26) }, NOW).valueState, 'unmeasured_zero');
  const corroborated = assessMetric({ value: 0, measuredAt: hoursAgo(2), previousValue: 3, previousMeasuredAt: hoursAgo(26) }, NOW);
  assert.deepEqual([corroborated.valueState, corroborated.displayValue], ['measured', 0]);
  const sameReading = assessMetric({ value: 0, measuredAt: hoursAgo(2), previousValue: 0, previousMeasuredAt: hoursAgo(2) }, NOW);
  assert.equal(sameReading.valueState, 'unmeasured_zero');
});

test('large consecutive changes are flagged for a spot check, not trusted for growth', () => {
  const a = assessMetric({ value: 282, measuredAt: hoursAgo(10), previousValue: 604, previousMeasuredAt: hoursAgo(34) }, NOW);
  assert.deepEqual([a.valueState, a.confidence, a.displayValue, a.deltaEligibleValue], ['anomalous', 'low', 282, null]);
  const small = assessMetric({ value: 209, measuredAt: hoursAgo(10), previousValue: 221, previousMeasuredAt: hoursAgo(34) }, NOW);
  assert.equal(small.valueState, 'measured');
});

test('repeatedly unchanged provider timestamps lower confidence', () => {
  const a = assessMetric({ value: 756, measuredAt: hoursAgo(20), consecutiveUnchanged: FRESHNESS_POLICY.unchangedRunsWarning }, NOW);
  assert.deepEqual([a.freshness, a.confidence], ['fresh', 'medium']);
});

test('a failed request does not change measurement freshness', () => {
  const a = assessMetric({ value: 1001, measuredAt: hoursAgo(10), requestStatus: 'error' }, NOW);
  assert.deepEqual([a.freshness, a.valueState], ['fresh', 'measured']);
});

test('only strictly newer provider measurements replace stored ones', () => {
  assert.equal(isNewerMeasurement('2026-09-29T05:00:02Z', '2026-09-28T05:00:02Z'), true);
  assert.equal(isNewerMeasurement('2026-09-28T05:00:02Z', '2026-09-29T05:00:02Z'), false);
  assert.equal(isNewerMeasurement('2026-09-29T05:00:02Z', '2026-09-29T05:00:02.000Z'), false);
  assert.equal(isNewerMeasurement(null, null), false);
  assert.equal(isNewerMeasurement('2026-09-29T05:00:02Z', null), true);
});

test('HTTP outcomes map to request status', () => {
  assert.deepEqual([200, 204, 404, 401, 403, 429, 500, 503].map(classifyHttpStatus),
    ['ok', 'ok', 'not_found', 'forbidden', 'forbidden', 'error', 'error', 'error']);
});

test('counts must be non-negative integers', () => {
  assert.deepEqual([12, '12', 0, -1, 1.5, 'x', null, undefined, ''].map(parseCount), [12, 12, 0, null, null, null, null, null, null]);
});

test('coverage and run status never call stale or unmeasured data "completed"', () => {
  const fresh = assessMetric({ value: 10, measuredAt: hoursAgo(1) }, NOW);
  const zero = assessMetric({ value: 0, measuredAt: hoursAgo(80) }, NOW);
  const summary = summarizeCoverage([
    { assessment: fresh, requestStatus: 'ok' },
    { assessment: zero, requestStatus: 'ok' },
    { assessment: assessMetric({ value: null, measuredAt: null }, NOW), requestStatus: 'not_found' },
  ]);
  assert.deepEqual([summary.monitored, summary.fresh, summary.delayed, summary.unavailable, summary.unmeasuredZero, summary.requestFailures], [3, 1, 1, 1, 1, 1]);
  assert.equal(Math.round(summary.freshMeasuredShare * 100), 33);
  assert.equal(runStatusFor(summary, true), 'partial');
  assert.equal(runStatusFor(summary, false), 'failed');
  assert.equal(runStatusFor(summarizeCoverage([{ assessment: fresh, requestStatus: 'ok' }]), true), 'completed');
});

test('growth deltas never use a zero or missing baseline', () => {
  assert.equal(trustworthyDelta(2269, 2244), 25);
  assert.equal(trustworthyDelta(209, 0), null);
  assert.equal(trustworthyDelta(209, null), null);
  assert.equal(trustworthyDelta(null, 200), null);
});
