// P0 regression: atomic curator decisions and the placement lifecycle.
// Replays production BVSS migrations (+ T1 pending) into PGlite, applies
// 20261004170000_bvss_atomic_review_placement_lifecycle, and proves:
//   * accepting never creates a live placement;
//   * live is reachable only from an observed playlist snapshot, with evidence;
//   * decisions are validated server-side, idempotent and atomic;
//   * clients and admins cannot write lifecycle tables directly.
// The "reproduces today" cases run the old 4-request flow on the pre-fix schema.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { attempt, replayBvss } from "../support/bvss-replay.mjs";

const T1 = ["harden_bvss_curator_privileges", "bvss_playlist_source_health"];
const FIX = "bvss_atomic_review_placement_lifecycle";

const ADMIN_USER = "aaaaaaaa-2222-4000-8000-000000000001";
const CURATOR_USER = "aaaaaaaa-2222-4000-8000-000000000002";
const OTHER_USER = "aaaaaaaa-2222-4000-8000-000000000003";
const CURATOR = "bbbbbbbb-2222-4000-8000-000000000002";
const OTHER_CURATOR = "bbbbbbbb-2222-4000-8000-000000000003";
const BVSS_PL = "cccccccc-2222-4000-8000-000000000001";
const PARTNER_PL = "cccccccc-2222-4000-8000-000000000002";
const SUB = "dddddddd-2222-4000-8000-000000000001";
const SUB2 = "dddddddd-2222-4000-8000-000000000002";
const R_BVSS = "eeeeeeee-2222-4000-8000-000000000001";
const R_PARTNER = "eeeeeeee-2222-4000-8000-000000000002";
const R_BVSS2 = "eeeeeeee-2222-4000-8000-000000000003";
const TRACK = "4uLU6hMCjMI75M1A2tKUQC"; // 22-char Spotify id shape
const OTHER_TRACK = "7ouMYWpwJ422jRcDASZB7P";

const ADMIN = { kind: "admin", user_id: ADMIN_USER, label: "BVSS admin" };
const CUR = { kind: "curator", user_id: CURATOR_USER, curator_id: CURATOR, label: "Partner Curator" };
const OTHER = { kind: "curator", user_id: OTHER_USER, curator_id: OTHER_CURATOR, label: "Other Curator" };

async function seed(db) {
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN_USER}', 'admin@example.test'), ('${CURATOR_USER}', 'c@example.test'), ('${OTHER_USER}', 'o@example.test');
    insert into public.bvss_curator_profiles (id, user_id, handle, display_name, contact_email, status) values
      ('${CURATOR}', '${CURATOR_USER}', 'partner', 'Partner Curator', 'c@example.test', 'approved'),
      ('${OTHER_CURATOR}', '${OTHER_USER}', 'other', 'Other Curator', 'o@example.test', 'approved');
    insert into public.bvss_playlists (id, slug, spotify_playlist_id, spotify_uri, spotify_url, canonical_name, primary_genre, network_owner_type, curator_id) values
      ('${BVSS_PL}', 'emotional-bass', 'pl1', 'spotify:playlist:pl1', 'https://open.spotify.com/playlist/pl1', 'Emotional Bass', 'Emotional Bass', 'bvss', null),
      ('${PARTNER_PL}', 'partner-list', 'pl2', 'spotify:playlist:pl2', 'https://open.spotify.com/playlist/pl2', 'Partner List', 'Melodic Bass', 'partner', '${CURATOR}');
    insert into public.bvss_submissions (id, artist_name, email, song_title, genre, spotify_track_id, release_state, status) values
      ('${SUB}', 'Middle Child', 'mc@example.test', 'Never Alone', 'Melodic Bass', '${TRACK}', 'released', 'pending'),
      ('${SUB2}', 'Middle Child', 'mc@example.test', 'Mercy', 'Melodic Bass', '${OTHER_TRACK}', 'released', 'pending');
    insert into public.bvss_submission_routes (id, submission_id, playlist_id, curator_id, route_type, status) values
      ('${R_BVSS}', '${SUB}', '${BVSS_PL}', null, 'bvss_internal', 'queued'),
      ('${R_PARTNER}', '${SUB}', '${PARTNER_PL}', '${CURATOR}', 'matched', 'queued'),
      ('${R_BVSS2}', '${SUB2}', '${BVSS_PL}', null, 'bvss_internal', 'queued');
  `);
}

async function decide(db, route, actor, decision, extra = {}) {
  const { reasons = [], notes = null, hold = null, pos = null, sched = null } = extra;
  const r = await db.query(
    `select public.bvss_decide_route($1, $2::jsonb, $3, $4::text[], $5, $6::timestamptz, $7, $8::date) as res`,
    [route, JSON.stringify(actor), decision, reasons, notes, hold, pos, sched],
  );
  return r.rows[0].res;
}
async function observe(db, playlist, tracks, { source = "spotify_owner_api", snapshot = "snap1", at = null } = {}) {
  const r = await db.query(
    `select public.bvss_record_playlist_observation($1, $2, $3, coalesce($4::timestamptz, now()), $5::jsonb) as res`,
    [playlist, source, snapshot, at, JSON.stringify(tracks)],
  );
  return r.rows[0].res;
}
const one = async (db, sql) => (await db.query(sql)).rows[0];
const inDays = (d) => new Date(Date.now() + d * 86400000).toISOString();

describe("reproduces today (pre-fix schema)", () => {
  let db;
  before(async () => { ({ db } = await replayBvss({ pending: T1 })); await seed(db); });
  after(async () => db?.close());

  test("accepting records a live placement immediately (placed_at defaults to now)", async () => {
    await db.exec(`insert into public.bvss_playlist_placements (submission_id, playlist_id, spotify_track_id) values ('${SUB}', '${BVSS_PL}', '${TRACK}')`);
    const p = await one(db, `select placed_at from public.bvss_playlist_placements`);
    assert.ok(p.placed_at, "old schema stamps a live time on acceptance");
  });
  test("an admin can write placements directly", async () => {
    await db.exec(`insert into public.bvss_admin_users (user_id, role) values ('${ADMIN_USER}', 'admin') on conflict do nothing`);
    const res = await attempt(db, "authenticated", ADMIN_USER,
      `insert into public.bvss_playlist_placements (playlist_id) values ('${BVSS_PL}')`);
    assert.equal(res.ok, true, `expected direct write to succeed today: ${res.error ?? ""}`);
  });
});

describe(FIX, () => {
  let db;
  before(async () => { ({ db } = await replayBvss({ pending: [...T1, FIX] })); });
  after(async () => db?.close());
  beforeEach(async () => {
    await db.exec(`
      delete from public.bvss_submission_status_events; delete from public.bvss_submission_reviews;
      update public.bvss_submission_routes set placement_id = null;
      delete from public.bvss_playlist_placements; delete from public.bvss_playlist_tracks;
      delete from public.bvss_submission_routes; delete from public.bvss_submissions;
      delete from public.bvss_playlists; delete from public.bvss_curator_profiles; delete from auth.users;`);
    await seed(db);
  });

  test("accept creates a SCHEDULED placement with no live time", async () => {
    const res = await decide(db, R_BVSS, ADMIN, "accept", { pos: 5 });
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.placement_status, "scheduled");
    const p = await one(db, `select status, placed_at, verified_live_at, route_id, target_position from public.bvss_playlist_placements`);
    assert.deepEqual([p.status, p.placed_at, p.verified_live_at, p.route_id, p.target_position], ["scheduled", null, null, R_BVSS, 5]);
    const r = await one(db, `select status, decision, placement_id is not null as linked, decided_at is not null as decided from public.bvss_submission_routes where id='${R_BVSS}'`);
    assert.deepEqual([r.status, r.decision, r.linked, r.decided], ["accepted", "accept", true, true]);
    const ev = await one(db, `select public_label from public.bvss_submission_status_events where event_type='curator_accept'`);
    assert.equal(ev.public_label, "Accepted, placing");
    const s = await one(db, `select status from public.bvss_submissions where id='${SUB}'`);
    assert.equal(s.status, "accepted");
    assert.equal((await one(db, `select count(*)::int n from public.bvss_submission_reviews`)).n, 1);
  });

  test("'I've added it' moves to pending_verification, never live", async () => {
    const { placement_id } = await decide(db, R_BVSS, ADMIN, "accept");
    const res = (await db.query(`select public.bvss_report_placement_added($1, $2::jsonb) as r`, [placement_id, JSON.stringify(ADMIN)])).rows[0].r;
    assert.equal(res.status, "pending_verification");
    const p = await one(db, `select status, placed_at, added_reported_at is not null as reported from public.bvss_playlist_placements`);
    assert.deepEqual([p.status, p.placed_at, p.reported], ["pending_verification", null, true]);
    const again = (await db.query(`select public.bvss_report_placement_added($1, $2::jsonb) as r`, [placement_id, JSON.stringify(ADMIN)])).rows[0].r;
    assert.equal(again.idempotent, true);
  });

  test("live only from an observed snapshot, with evidence; absent track stays unverified", async () => {
    const { placement_id } = await decide(db, R_BVSS, ADMIN, "accept");
    await db.query(`select public.bvss_report_placement_added($1, $2::jsonb)`, [placement_id, JSON.stringify(ADMIN)]);
    const miss = await observe(db, BVSS_PL, [{ spotify_track_id: OTHER_TRACK, position: 0 }]);
    assert.equal(miss.placements_live, 0);
    assert.equal((await one(db, `select status from public.bvss_playlist_placements`)).status, "pending_verification");

    const hit = await observe(db, BVSS_PL, [
      { spotify_track_id: OTHER_TRACK, position: 0 },
      { spotify_track_id: TRACK, position: 13, added_at: new Date(Date.now() - 3600000).toISOString(), track_name: "Never Alone" },
    ], { snapshot: "snap2" });
    assert.equal(hit.placements_live, 1);
    const p = await one(db, `select status, placed_at is not null as has_time, actual_position, verification_source, verification_evidence from public.bvss_playlist_placements`);
    assert.equal(p.status, "live");
    assert.equal(p.has_time, true);
    assert.equal(p.actual_position, 13);
    assert.equal(p.verification_source, "spotify_owner_api");
    assert.equal(p.verification_evidence.snapshot_id, "snap2");
    assert.equal(p.verification_evidence.reported_before_detection, true);
    const ev = await one(db, `select public_label from public.bvss_submission_status_events where event_type='placement_live'`);
    assert.equal(ev.public_label, "Placed on Emotional Bass");
  });

  test("removal is detected from a later snapshot", async () => {
    await decide(db, R_BVSS, ADMIN, "accept");
    await observe(db, BVSS_PL, [{ spotify_track_id: TRACK, position: 2 }], { snapshot: "a" });
    const res = await observe(db, BVSS_PL, [{ spotify_track_id: OTHER_TRACK, position: 0 }], { snapshot: "b", at: new Date(Date.now() + 1000).toISOString() });
    assert.equal(res.placements_removed, 1);
    const p = await one(db, `select status, ended_at is not null as ended, end_reason from public.bvss_playlist_placements`);
    assert.deepEqual([p.status, p.ended, p.end_reason], ["removed", true, "not_in_playlist_snapshot"]);
  });

  test("constraints refuse a live placement without evidence even for the service role", async () => {
    const { placement_id } = await decide(db, R_BVSS, ADMIN, "accept");
    await assert.rejects(db.exec(`update public.bvss_playlist_placements set status='live' where id='${placement_id}'`), /live_requires_evidence/);
    await assert.rejects(db.exec(`update public.bvss_playlist_placements set status='live', placed_at=now(), verified_live_at=now(), verification_source='manual', verification_evidence='{}' where id='${placement_id}'`), /verification_source_check/);
    await assert.rejects(db.exec(`update public.bvss_playlist_placements set placed_at=now() where id='${placement_id}'`), /unverified_has_no_live_time/);
  });

  test("observation rejects manual sources and malformed ids", async () => {
    assert.equal((await observe(db, BVSS_PL, [], { source: "manual" })).error, "invalid_observation_source");
    assert.equal((await observe(db, BVSS_PL, [{ spotify_track_id: "nope" }])).error, "invalid_track_id");
  });

  test("decline requires at least one valid reason; note capped at 280", async () => {
    assert.equal((await decide(db, R_BVSS, ADMIN, "reject")).error, "decline_reason_required");
    assert.equal((await decide(db, R_BVSS, ADMIN, "reject", { reasons: ["meh"] })).error, "invalid_decline_reason");
    assert.equal((await decide(db, R_BVSS, ADMIN, "reject", { reasons: ["wrong_mood"], notes: "x".repeat(281) })).error, "decline_note_too_long");
    assert.equal((await decide(db, R_BVSS, ADMIN, "accept", { reasons: ["wrong_mood"] })).error, "reasons_only_for_decline");
    const ok = await decide(db, R_BVSS, ADMIN, "reject", { reasons: ["energy_mismatch"], notes: "Too heavy for this lane" });
    assert.equal(ok.status, "rejected");
    const r = await one(db, `select decline_reasons, placement_id from public.bvss_submission_routes where id='${R_BVSS}'`);
    assert.deepEqual(r.decline_reasons, ["energy_mismatch"]);
    assert.equal(r.placement_id, null);
    assert.equal((await one(db, `select count(*)::int n from public.bvss_playlist_placements`)).n, 0);
  });

  test("hold requires a revisit date within 30 days and can be decided later", async () => {
    assert.equal((await decide(db, R_BVSS, ADMIN, "hold")).error, "hold_date_invalid");
    assert.equal((await decide(db, R_BVSS, ADMIN, "hold", { hold: inDays(31) })).error, "hold_date_invalid");
    assert.equal((await decide(db, R_BVSS, ADMIN, "hold", { hold: inDays(-1) })).error, "hold_date_invalid");
    assert.equal((await decide(db, R_BVSS, ADMIN, "accept", { hold: inDays(3) })).error, "hold_date_only_for_hold");
    const h = await decide(db, R_BVSS, ADMIN, "hold", { hold: inDays(7) });
    assert.equal(h.status, "hold");
    const r = await one(db, `select hold_until is not null as dated, decided_at from public.bvss_submission_routes where id='${R_BVSS}'`);
    assert.deepEqual([r.dated, r.decided_at], [true, null]);
    assert.equal((await decide(db, R_BVSS, ADMIN, "accept")).status, "accepted");
    assert.equal((await one(db, `select hold_until from public.bvss_submission_routes where id='${R_BVSS}'`)).hold_until, null);
  });

  test("double accept is idempotent (one placement); conflicting re-decision is refused", async () => {
    const a = await decide(db, R_BVSS, ADMIN, "accept");
    const b = await decide(db, R_BVSS, ADMIN, "accept");
    assert.equal(b.idempotent, true);
    assert.equal(b.placement_id, a.placement_id);
    assert.equal((await one(db, `select count(*)::int n from public.bvss_playlist_placements`)).n, 1);
    assert.equal((await one(db, `select count(*)::int n from public.bvss_submission_reviews`)).n, 1);
    assert.equal((await decide(db, R_BVSS, ADMIN, "reject", { reasons: ["other"] })).error, "already_decided");
  });

  test("authorization: curators act only on their routes, admins only on BVSS-owned routes", async () => {
    assert.equal((await decide(db, R_PARTNER, ADMIN, "accept")).error, "not_bvss_route");
    assert.equal((await decide(db, R_BVSS, CUR, "accept")).error, "route_not_found");
    assert.equal((await decide(db, R_PARTNER, OTHER, "accept")).error, "route_not_found");
    await db.exec(`update public.bvss_curator_profiles set status='suspended' where id='${CURATOR}'`);
    assert.equal((await decide(db, R_PARTNER, CUR, "accept")).error, "curator_not_approved");
    await db.exec(`update public.bvss_curator_profiles set status='approved' where id='${CURATOR}'`);
    assert.equal((await decide(db, R_PARTNER, CUR, "accept")).status, "accepted");
  });

  test("the same track cannot be placed twice on one playlist", async () => {
    await db.exec(`insert into public.bvss_playlist_placements (playlist_id, spotify_track_id, status) values ('${BVSS_PL}', '${TRACK}', 'scheduled')`);
    assert.equal((await decide(db, R_BVSS, ADMIN, "accept")).error, "track_already_placed_on_playlist");
    assert.equal((await one(db, `select status from public.bvss_submission_routes where id='${R_BVSS}'`)).status, "queued");
  });

  test("atomic: a failure in any write leaves no partial decision", async () => {
    await db.exec(`
      create function public._fail_review() returns trigger language plpgsql as $$ begin raise exception 'forced review failure'; end $$;
      create trigger _fail_review before insert on public.bvss_submission_reviews for each row execute function public._fail_review();`);
    try {
      await assert.rejects(decide(db, R_BVSS, ADMIN, "accept"), /forced review failure/);
      assert.equal((await one(db, `select count(*)::int n from public.bvss_playlist_placements`)).n, 0);
      const r = await one(db, `select status, decision, placement_id, decision_version from public.bvss_submission_routes where id='${R_BVSS}'`);
      assert.deepEqual([r.status, r.decision, r.placement_id, r.decision_version], ["queued", null, null, 0]);
      assert.equal((await one(db, `select count(*)::int n from public.bvss_submission_status_events`)).n, 0);
    } finally {
      await db.exec(`drop trigger _fail_review on public.bvss_submission_reviews; drop function public._fail_review();`);
    }
    assert.equal((await decide(db, R_BVSS, ADMIN, "accept")).ok, true, "retry after failure succeeds");
  });

  test("end placement: completed only from live, cancelled only before live", async () => {
    const { placement_id } = await decide(db, R_BVSS, ADMIN, "accept");
    const end = async (o) => (await db.query(`select public.bvss_end_placement($1, $2::jsonb, $3, 'test') as r`, [placement_id, JSON.stringify(ADMIN), o])).rows[0].r;
    assert.equal((await end("completed")).error, "only_live_can_complete");
    await observe(db, BVSS_PL, [{ spotify_track_id: TRACK, position: 1 }]);
    assert.equal((await end("cancelled")).error, "only_unverified_can_cancel");
    assert.equal((await end("completed")).status, "completed");
  });

  test("clients and admins cannot write lifecycle tables or call the functions", async () => {
    await db.exec(`insert into public.bvss_admin_users (user_id, role) values ('${ADMIN_USER}', 'admin') on conflict do nothing`);
    const writes = [
      `insert into public.bvss_playlist_placements (playlist_id) values ('${BVSS_PL}')`,
      `update public.bvss_submission_routes set status='accepted' where id='${R_BVSS}'`,
      `insert into public.bvss_submission_reviews (submission_id, decision) values ('${SUB}', 'accept')`,
      `insert into public.bvss_submission_status_events (submission_id, event_type, public_label) values ('${SUB}', 'x', 'x')`,
      `insert into public.bvss_playlist_tracks (playlist_id, spotify_track_id) values ('${BVSS_PL}', '${TRACK}')`,
      `select public.bvss_decide_route('${R_BVSS}', '{"kind":"admin"}'::jsonb, 'accept')`,
      `select public.bvss_record_playlist_observation('${BVSS_PL}', 'spotify_owner_api', 's', now(), '[]'::jsonb)`,
    ];
    for (const role of ["anon", "authenticated"]) {
      for (const sql of writes) {
        const res = await attempt(db, role, role === "anon" ? null : ADMIN_USER, sql);
        assert.equal(res.ok, false, `${role} must not run: ${sql}`);
      }
    }
  });
});

describe(`${FIX}: dashboards`, () => {
  let db;
  before(async () => { ({ db } = await replayBvss({ pending: [...T1, FIX] })); await seed(db); });
  after(async () => db?.close());
  test("a scheduled acceptance is not an active placement; a verified one is", async () => {
    const active = async () => (await one(db, `select active_placements::int n from public.bvss_playlist_daily_rollup where playlist_id='${BVSS_PL}'`)).n;
    await decide(db, R_BVSS, ADMIN, "accept");
    assert.equal(await active(), 0);
    await observe(db, BVSS_PL, [{ spotify_track_id: TRACK, position: 0 }]);
    assert.equal(await active(), 1);
  });
});
