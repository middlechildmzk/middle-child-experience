// What a visitor and an operator actually see, using production readings
// captured 2026-09-29 (followers + Soundcharts crawl time).

import assert from 'node:assert/strict';
import test from 'node:test';
import { describeFollowers, followerDelta, networkFollowerTotals } from '../../lib/source-health';

const NOW = new Date('2026-09-29T15:00:00.000Z');
const row = (current_follower_count: number | null, follower_count_observed_at: string | null) => ({ current_follower_count, follower_count_observed_at });

const LIVE = {
  middleChildElectronic: row(2269, '2026-09-29T05:00:02Z'),
  stutterHouse: row(158, '2026-09-28T05:00:02Z'),
  trance2026: row(0, '2026-09-26T19:46:51Z'),
  bassMusic: row(0, '2026-09-26T19:46:50Z'),
  legacyTopChill: row(302, '2026-09-26T05:00:02Z'),
  noBaseline: row(null, null),
};

test('fresh count renders as a count with its measurement date', () => {
  const d = describeFollowers(LIVE.middleChildElectronic, NOW);
  assert.deepEqual([d.value, d.label, d.detail, d.state, d.freshness], ['2,269', '2,269 followers', 'Measured Sep 29', 'measured', 'fresh']);
});

test('the 8 playlists with a single unconfirmed 0 render as Measuring, never "0 followers"', () => {
  for (const playlist of [LIVE.trance2026, LIVE.bassMusic]) {
    const d = describeFollowers(playlist, NOW);
    assert.equal(d.value, 'Measuring');
    assert.equal(d.state, 'unmeasured_zero');
    assert.doesNotMatch(d.label, /\b0 followers/);
  }
});

test('delayed values say when they were last measured', () => {
  assert.equal(describeFollowers(LIVE.legacyTopChill, NOW).detail, 'Last measured Sep 26');
  assert.equal(describeFollowers(LIVE.stutterHouse, new Date('2026-09-30T20:00:00Z')).detail, 'Last measured Sep 28');
});

test('stale values stay visible but are labeled out of date', () => {
  const d = describeFollowers(LIVE.legacyTopChill, new Date('2026-10-05T00:00:00Z'));
  assert.deepEqual([d.value, d.state], ['302', 'stale']);
  assert.match(d.detail, /may be out of date/);
});

test('no baseline renders as Measuring', () => {
  assert.equal(describeFollowers(LIVE.noBaseline, NOW).value, 'Measuring');
});

test('network totals exclude unconfirmed zeros and state coverage', () => {
  const totals = networkFollowerTotals(Object.values(LIVE), NOW);
  assert.equal(totals.counted, 3);
  assert.equal(totals.total, 2269 + 158 + 302);
  assert.equal(totals.label, '2,729 followers across 3 of 6 playlists');
});

test('growth never uses an unconfirmed current value or a zero baseline', () => {
  assert.equal(followerDelta(LIVE.middleChildElectronic, 2244, NOW), 25);
  assert.equal(followerDelta(LIVE.trance2026, 10, NOW), null);
  assert.equal(followerDelta(LIVE.middleChildElectronic, 0, NOW), null);
});

test('stored source health supplies the corroborating previous reading', () => {
  const withHealth = {
    ...row(0, '2026-09-29T05:00:02Z'),
    follower_health: {
      last_request_status: 'ok' as const,
      last_provider_measured_at: '2026-09-29T05:00:02Z',
      last_value: 0,
      previous_provider_measured_at: '2026-09-28T05:00:02Z',
      previous_value: 2,
      consecutive_unchanged_measurements: 0,
      freshness_state: 'fresh' as const,
      confidence: 'high' as const,
      value_state: 'measured' as const,
      last_attempt_at: '2026-09-29T10:15:00Z',
    },
  };
  assert.equal(describeFollowers(withHealth, NOW).value, '0');
  // Health that describes a different measurement than the row is ignored.
  const mismatched = { ...withHealth, follower_count_observed_at: '2026-09-29T06:00:00Z' };
  assert.equal(describeFollowers(mismatched, NOW).value, 'Measuring');
});
