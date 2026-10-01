// D2: Soundcharts storage/public-display rights are unconfirmed. The public
// playlists endpoint may not expose provider-derived data beyond what it
// already exposed before T1 (current count + its measurement time).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PUBLIC_FOLLOWER_HEALTH_COLUMNS, publicFollowerHealth } from '../../supabase/functions/_shared/source-health.ts';
import { describeFollowers } from '../../lib/source-health';

const ADMIN_ONLY = ['previous_value', 'previous_provider_measured_at', 'consecutive_unchanged_measurements', 'last_attempt_at', 'last_http_status', 'reason', 'sync_run_id'];

test('public column list never selects admin-only provider fields', () => {
  for (const col of ADMIN_ONLY) assert.ok(!PUBLIC_FOLLOWER_HEALTH_COLUMNS.split(',').includes(col), col);
});

test('bvss-playlists selects only the public projection', () => {
  const src = readFileSync(new URL('../../supabase/functions/bvss-playlists/index.ts', import.meta.url), 'utf8');
  assert.match(src, /\.select\(PUBLIC_FOLLOWER_HEALTH_COLUMNS\)/);
  assert.match(src, /publicFollowerHealth\(row\)/);
  for (const col of ADMIN_ONLY) assert.ok(!src.includes(col), `bvss-playlists references ${col}`);
});

test('projection blanks admin-only values even if a full row is passed', () => {
  const full = {
    playlist_id: 'p', last_request_status: 'ok', last_provider_measured_at: '2026-10-01T05:00:02Z', last_value: 208,
    previous_provider_measured_at: '2026-09-29T05:00:02Z', previous_value: 209, consecutive_unchanged_measurements: 4,
    freshness_state: 'fresh', confidence: 'high', value_state: 'measured', last_attempt_at: '2026-10-01T10:15:00Z',
    last_http_status: 200, reason: 'Fresh provider measurement.', sync_run_id: 'run',
  };
  const projected = publicFollowerHealth(full)!;
  assert.equal(projected.previous_value, null);
  assert.equal(projected.previous_provider_measured_at, null);
  assert.equal(projected.consecutive_unchanged_measurements, 0);
  assert.equal(projected.last_attempt_at, null);
  assert.ok(!('reason' in projected) && !('sync_run_id' in projected) && !('last_http_status' in projected));
  assert.equal(publicFollowerHealth(null), null);
});

test('a corroborated zero still renders as Measuring publicly (safe side)', () => {
  const projected = publicFollowerHealth({ last_request_status: 'ok', last_provider_measured_at: '2026-10-01T05:00:02Z', last_value: 0, previous_provider_measured_at: '2026-09-30T05:00:02Z', previous_value: 2, freshness_state: 'fresh', confidence: 'high', value_state: 'measured' });
  const shown = describeFollowers({ current_follower_count: 0, follower_count_observed_at: '2026-10-01T05:00:02Z', follower_health: projected }, new Date('2026-10-01T15:00:00Z'));
  assert.equal(shown.value, 'Measuring');
});
