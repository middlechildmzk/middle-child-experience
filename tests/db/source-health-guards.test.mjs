// T1C database guarantees for playlist metric provenance.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { BVSS_ROOT, attempt, replayBvss } from "../support/bvss-replay.mjs";

const MIGRATION = "bvss_playlist_source_health";
const PLAYLIST = "eeeeeeee-2222-4000-8000-000000000001";
const ADMIN = "aaaaaaaa-2222-4000-8000-000000000001";
const VISITOR = "aaaaaaaa-2222-4000-8000-000000000002";
const T1 = "2026-09-26T05:00:02.000Z";
const T2 = "2026-09-28T05:00:02.000Z";
const T3 = "2026-09-29T05:00:02.000Z";

async function seedLegacy(db) {
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@example.test'), ('${VISITOR}', 'visitor@example.test');
    insert into public.bvss_admin_users (user_id, role) values ('${ADMIN}', 'admin');
    insert into public.bvss_playlists (id, slug, spotify_playlist_id, spotify_uri, spotify_url, canonical_name, primary_genre,
                                       current_follower_count, follower_count_source, follower_count_observed_at, current_track_count)
      values ('${PLAYLIST}', 'chillstep', 'sp-chill', 'spotify:playlist:sp-chill', 'https://open.spotify.com/playlist/sp-chill', 'Chillstep', 'chillstep',
              221, 'soundcharts', '${T2}', 35);
    insert into public.bvss_playlist_metric_snapshots (playlist_id, metric_date, followers, track_count, source, source_ref, observed_at, raw_data) values
      ('${PLAYLIST}', '2026-09-20', 180, null, 'soundcharts', 'uuid-1', '2026-09-20T00:00:00Z', '{"method":"audience_history","soundcharts_uuid":"uuid-1"}'),
      ('${PLAYLIST}', '2026-09-28', 221, 35, 'soundcharts', 'uuid-1', '${T2}', '{"method":"playlist_metadata","soundcharts_uuid":"uuid-1"}'),
      ('${PLAYLIST}', '2026-09-27', 250, null, 'manual_admin', 'admin', '2026-09-27T12:00:00Z', '{"method":"playlist_os_manual_baseline"}');
  `);
}

describe("playlist metric provenance (T1C)", () => {
  let beforeDb;
  let afterDb;

  before(async () => {
    ({ db: beforeDb } = await replayBvss());
    await seedLegacy(beforeDb);
    // Seed legacy rows BEFORE the migration so its backfill is exercised.
    ({ db: afterDb } = await replayBvss());
    await seedLegacy(afterDb);
    await afterDb.exec(await readFile(path.join(BVSS_ROOT, "supabase/migrations/20260929220200_bvss_playlist_source_health.sql"), "utf8"));
  });

  after(async () => {
    await beforeDb?.close();
    await afterDb?.close();
  });

  test("the hole exists today: an older measurement overwrites the current value", async () => {
    await beforeDb.exec(`update public.bvss_playlists set current_follower_count = 604, follower_count_observed_at = '${T1}' where id = '${PLAYLIST}'`);
    const { rows } = await beforeDb.query(`select current_follower_count from public.bvss_playlists where id = '${PLAYLIST}'`);
    assert.equal(rows[0].current_follower_count, 604);
  });

  test("backfill labels legacy rows without inventing retrieval times", async () => {
    const { rows } = await afterDb.query(`
      select metric_date::text, measurement_basis, provider_measured_at, retrieved_at
      from public.bvss_playlist_metric_snapshots where playlist_id = '${PLAYLIST}' order by metric_date`);
    assert.deepEqual(rows.map((r) => [r.metric_date, r.measurement_basis, r.retrieved_at]), [
      ["2026-09-20", "provider_history", null],
      ["2026-09-27", "manual", null],
      ["2026-09-28", "provider_crawl", null],
    ]);
    assert.ok(rows.every((r) => r.provider_measured_at !== null));
  });

  test("an older measurement cannot replace the playlist's current value", async () => {
    await afterDb.exec(`update public.bvss_playlists set current_follower_count = 604, follower_count_observed_at = '${T1}', current_track_count = 31 where id = '${PLAYLIST}'`);
    const { rows } = await afterDb.query(`select current_follower_count, follower_count_observed_at, current_track_count from public.bvss_playlists where id = '${PLAYLIST}'`);
    assert.equal(rows[0].current_follower_count, 221);
    assert.equal(new Date(rows[0].follower_count_observed_at).toISOString(), T2);
    assert.equal(rows[0].current_track_count, 35);
  });

  test("a newer measurement does replace it", async () => {
    await afterDb.exec(`update public.bvss_playlists set current_follower_count = 209, follower_count_observed_at = '${T3}', current_track_count = 40 where id = '${PLAYLIST}'`);
    const { rows } = await afterDb.query(`select current_follower_count, current_track_count from public.bvss_playlists where id = '${PLAYLIST}'`);
    assert.deepEqual(rows[0], { current_follower_count: 209, current_track_count: 40 });
  });

  test("a follower value without a measurement timestamp is rejected", async () => {
    await assert.rejects(
      afterDb.exec(`update public.bvss_playlists set current_follower_count = 1, follower_count_observed_at = null where id = '${PLAYLIST}'`),
      /requires follower_count_observed_at/,
    );
  });

  test("a snapshot is never regressed by an older measurement or losing its timestamp", async () => {
    await afterDb.exec(`
      insert into public.bvss_playlist_metric_snapshots (playlist_id, metric_date, followers, source, source_ref, observed_at, provider_measured_at, retrieved_at, measurement_basis, raw_data)
      values ('${PLAYLIST}', '2026-09-28', 999, 'soundcharts', 'uuid-1', '2026-09-28T01:00:00Z', '2026-09-28T01:00:00Z', now(), 'provider_crawl', '{}')
      on conflict (playlist_id, metric_date, source) do update set followers = excluded.followers, provider_measured_at = excluded.provider_measured_at, observed_at = excluded.observed_at;
      update public.bvss_playlist_metric_snapshots set followers = 1, provider_measured_at = null where playlist_id = '${PLAYLIST}' and metric_date = '2026-09-28' and source = 'soundcharts';`);
    const { rows } = await afterDb.query(`select followers, provider_measured_at from public.bvss_playlist_metric_snapshots where playlist_id = '${PLAYLIST}' and metric_date = '2026-09-28' and source = 'soundcharts'`);
    assert.equal(rows[0].followers, 221);
    assert.equal(new Date(rows[0].provider_measured_at).toISOString(), T2);
  });

  test("measurement basis is constrained", async () => {
    await assert.rejects(afterDb.exec(`update public.bvss_playlist_metric_snapshots set measurement_basis = 'guess' where playlist_id = '${PLAYLIST}'`), /measurement_basis_check/);
  });

  describe("source status table", () => {
    const row = (overrides = "") => `insert into public.bvss_playlist_source_status
      (playlist_id, provider, metric, last_attempt_at, last_request_status, last_provider_measured_at, last_value, freshness_state, confidence, value_state${overrides ? "" : ""})
      values ('${PLAYLIST}', 'soundcharts', 'followers', now(), 'ok', '${T3}', 209, 'fresh', 'high', 'measured')`;

    test("service role writes; admins read; others cannot read or write", async () => {
      assert.ok((await attempt(afterDb, "service_role", null, `${row()} returning playlist_id`)).ok);
      await afterDb.exec(`${row()} on conflict do nothing`);
      const admin = await attempt(afterDb, "authenticated", ADMIN, `select value_state from public.bvss_playlist_source_status`);
      assert.deepEqual(admin.rows, [{ value_state: "measured" }]);
      const visitor = await attempt(afterDb, "authenticated", VISITOR, `select value_state from public.bvss_playlist_source_status`);
      assert.deepEqual(visitor.rows, []);
      const anon = await attempt(afterDb, "anon", null, `select value_state from public.bvss_playlist_source_status`);
      assert.equal(anon.ok, false);
      const write = await attempt(afterDb, "authenticated", ADMIN, `update public.bvss_playlist_source_status set value_state = 'measured' returning playlist_id`);
      assert.equal(write.ok, false);
    });

    test("states are constrained to the four freshness states", async () => {
      await assert.rejects(afterDb.exec(`update public.bvss_playlist_source_status set freshness_state = 'current'`), /check/);
    });

    test("previous measurement must be earlier than the last one", async () => {
      await assert.rejects(afterDb.exec(`update public.bvss_playlist_source_status set previous_provider_measured_at = '${T3}'`), /previous_before_last/);
    });
  });

  test("manual rollback removes the foundation and leaves metric values intact", async () => {
    const { db } = await replayBvss({ pending: [MIGRATION] });
    try {
      await seedLegacy(db);
      await db.exec(await readFile(path.join(BVSS_ROOT, "supabase/rollback/20260929220200_bvss_playlist_source_health.down.sql"), "utf8"));
      const { rows } = await db.query(`select count(*)::int as n, sum(followers)::int as total from public.bvss_playlist_metric_snapshots`);
      assert.deepEqual(rows[0], { n: 3, total: 651 });
      const cols = await db.query(`select column_name from information_schema.columns where table_name = 'bvss_playlist_metric_snapshots' and column_name = 'provider_measured_at'`);
      assert.equal(cols.rows.length, 0);
    } finally {
      await db.close();
    }
  });
});
