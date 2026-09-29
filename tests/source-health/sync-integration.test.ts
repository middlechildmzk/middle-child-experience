// Integration: the sync core's rows must satisfy the real migrated schema
// (column names, check constraints, monotonic triggers), not just a mock.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { runSoundchartsSync, type SyncStore, type SoundchartsProvider } from '../../supabase/functions/_shared/soundcharts-sync-core.ts';
// @ts-expect-error untyped test helper (.mjs)
import { replayBvss } from '../support/bvss-replay.mjs';

const NOW = new Date('2026-09-29T10:15:00.000Z');
let db: any;

function pgStore(): SyncStore {
  const upsert = async (table: string, rows: Record<string, unknown>[], conflict: string) => {
    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map((c) => (row[c] !== null && typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]));
      const updates = cols.map((c) => `${c} = excluded.${c}`).join(', ');
      await db.query(`insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
        on conflict (${conflict}) do update set ${updates}`, values);
    }
  };
  return {
    async listMonitoredPlaylists() {
      return (await db.query(`select id, slug, spotify_playlist_id, lifecycle_state, source_metadata, current_follower_count::int,
        follower_count_observed_at, current_track_count from public.bvss_playlists where lifecycle_state in ('active','experimental') order by slug`)).rows
        .map((r: any) => ({ ...r, follower_count_observed_at: r.follower_count_observed_at?.toISOString() ?? null }));
    },
    async listStatuses() {
      return (await db.query(`select * from public.bvss_playlist_source_status`)).rows.map((r: any) => ({
        ...r,
        last_value: r.last_value === null ? null : Number(r.last_value),
        previous_value: r.previous_value === null ? null : Number(r.previous_value),
        last_provider_measured_at: r.last_provider_measured_at?.toISOString() ?? null,
        previous_provider_measured_at: r.previous_provider_measured_at?.toISOString() ?? null,
      }));
    },
    async startRun(metadata) {
      return (await db.query(`insert into public.bvss_sync_runs (provider, sync_type, status, metadata) values ('soundcharts', 'playlist_metrics', 'started', $1) returning id`, [JSON.stringify(metadata)])).rows[0].id;
    },
    upsertSnapshots: (rows) => upsert('bvss_playlist_metric_snapshots', rows as any, 'playlist_id, metric_date, source'),
    async updatePlaylist(id, patch) {
      const cols = Object.keys(patch);
      const values = cols.map((c) => (patch[c] !== null && typeof patch[c] === 'object' ? JSON.stringify(patch[c]) : patch[c]));
      await db.query(`update public.bvss_playlists set ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} where id = $1`, [id, ...values]);
    },
    upsertStatuses: (rows) => upsert('bvss_playlist_source_status', rows as any, 'playlist_id, provider, metric'),
    async finishRun(id, patch) {
      await db.query(`update public.bvss_sync_runs set status = $2, completed_at = $3, records_seen = $4, records_written = $5, error_summary = $6, metadata = $7 where id = $1`,
        [id, patch.status, patch.completed_at, patch.records_seen, patch.records_written, patch.error_summary, JSON.stringify(patch.metadata)]);
    },
    async updateIntegration() {},
  };
}

const scripted = (map: Record<string, unknown>): SoundchartsProvider => ({
  async authenticate() {},
  async lookupPlaylist(id) { return { status: 200, body: { object: map[id] } }; },
  async audienceHistory() { return { status: 200, body: { items: [] } }; },
});

before(async () => {
  ({ db } = await replayBvss({ pending: ['harden_bvss_curator_privileges', 'bvss_playlist_source_health'] }));
  await db.exec(`
    insert into public.bvss_playlists (slug, spotify_playlist_id, spotify_uri, spotify_url, canonical_name, primary_genre, lifecycle_state,
      current_follower_count, follower_count_source, follower_count_observed_at, current_track_count, source_metadata) values
    ('middle-child-electronic', 'sp-mc', 'spotify:playlist:sp-mc', 'https://x/sp-mc', 'Middle Child Electronic', 'electronic', 'active', 2244, 'soundcharts', '2026-09-28T05:00:02Z', 153, '{"soundcharts_history_backfill_completed_at":"2026-09-26"}'),
    ('trance-2026', 'sp-tr', 'spotify:playlist:sp-tr', 'https://x/sp-tr', 'Trance 2026', 'trance', 'active', 0, 'soundcharts', '2026-09-26T19:46:51Z', 31, '{"soundcharts_history_backfill_completed_at":"2026-09-26"}'),
    ('legacy-top-chill-2023', 'sp-lg', 'spotify:playlist:sp-lg', 'https://x/sp-lg', 'Legacy Top Chill', 'chill', 'experimental', 302, 'soundcharts', '2026-09-26T05:00:02Z', 151, '{"soundcharts_history_backfill_completed_at":"2026-09-26"}'),
    ('archived-list', 'sp-ar', 'spotify:playlist:sp-ar', 'https://x/sp-ar', 'Archived', 'x', 'archived', null, null, null, null, '{}');`);
});

after(async () => { await db?.close(); });

test('sync core rows satisfy the migrated schema and produce honest states', async () => {
  const result = await runSoundchartsSync(pgStore(), scripted({
    'sp-mc': { uuid: 'u-mc', latestCrawlDate: '2026-09-29T05:00:02+00:00', latestSubscriberCount: 2269, latestTrackCount: 200 },
    'sp-tr': { uuid: 'u-tr', latestCrawlDate: '2026-09-26T19:46:51+00:00', latestSubscriberCount: 0, latestTrackCount: 31 },
    'sp-lg': { uuid: 'u-lg', latestCrawlDate: '2026-09-26T05:00:02+00:00', latestSubscriberCount: 302, latestTrackCount: 151 },
  }), () => new Date(NOW));

  assert.equal(result.playlists, 3, 'archived is not monitored; experimental is');
  assert.equal(result.status, 'partial');
  const { rows } = await db.query(`select p.slug, s.freshness_state, s.value_state, s.confidence, s.last_value::int as last_value
    from public.bvss_playlist_source_status s join public.bvss_playlists p on p.id = s.playlist_id order by p.slug`);
  assert.deepEqual(rows, [
    { slug: 'legacy-top-chill-2023', freshness_state: 'delayed', value_state: 'measured', confidence: 'medium', last_value: 302 },
    { slug: 'middle-child-electronic', freshness_state: 'fresh', value_state: 'measured', confidence: 'high', last_value: 2269 },
    { slug: 'trance-2026', freshness_state: 'delayed', value_state: 'unmeasured_zero', confidence: 'none', last_value: 0 },
  ]);

  const snap = (await db.query(`select provider_measured_at, retrieved_at, measurement_basis, sync_run_id is not null as linked
    from public.bvss_playlist_metric_snapshots s join public.bvss_playlists p on p.id = s.playlist_id where p.slug = 'middle-child-electronic'`)).rows[0];
  assert.equal(snap.provider_measured_at.toISOString(), '2026-09-29T05:00:02.000Z');
  assert.equal(snap.retrieved_at.toISOString(), NOW.toISOString());
  assert.equal(snap.measurement_basis, 'provider_crawl');
  assert.equal(snap.linked, true);

  const run = (await db.query(`select status, metadata from public.bvss_sync_runs`)).rows[0];
  assert.equal(run.status, 'partial');
  assert.equal(run.metadata.coverage.unmeasuredZero, 1);

  // Second run, provider now returns an OLDER crawl for the fresh playlist: DB and core both refuse it.
  await runSoundchartsSync(pgStore(), scripted({
    'sp-mc': { uuid: 'u-mc', latestCrawlDate: '2026-09-27T05:00:02Z', latestSubscriberCount: 1, latestTrackCount: 1 },
    'sp-tr': { uuid: 'u-tr', latestCrawlDate: '2026-09-26T19:46:51Z', latestSubscriberCount: 0, latestTrackCount: 31 },
    'sp-lg': { uuid: 'u-lg' },
  }), () => new Date(NOW));
  const current = (await db.query(`select current_follower_count::int as c from public.bvss_playlists where slug = 'middle-child-electronic'`)).rows[0];
  assert.equal(current.c, 2269);
  const legacy = (await db.query(`select s.value_state, s.reason from public.bvss_playlist_source_status s join public.bvss_playlists p on p.id = s.playlist_id where p.slug = 'legacy-top-chill-2023'`)).rows[0];
  assert.equal(legacy.value_state, 'measured', 'a missing crawl date keeps the prior measurement');
  assert.match(legacy.reason, /no valid crawl date/);
});
