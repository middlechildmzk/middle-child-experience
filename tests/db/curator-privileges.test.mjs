// T1B exploit regression for BVSS curator network privileges.
// Every exploit must succeed on the replayed production schema and fail after
// 20260929220100_harden_bvss_curator_privileges. Self-service keeps working.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { BVSS_ROOT, attempt, replayBvss } from "../support/bvss-replay.mjs";

const MIGRATION = "harden_bvss_curator_privileges";
const PENDING_CURATOR = "aaaaaaaa-1111-4000-8000-000000000001";
const SUSPENDED_CURATOR = "aaaaaaaa-1111-4000-8000-000000000002";
const APPROVED_CURATOR = "aaaaaaaa-1111-4000-8000-000000000003";
const PENDING_PROFILE = "bbbbbbbb-1111-4000-8000-000000000001";
const SUSPENDED_PROFILE = "bbbbbbbb-1111-4000-8000-000000000002";
const APPROVED_PROFILE = "bbbbbbbb-1111-4000-8000-000000000003";
const PLAYLIST = "cccccccc-1111-4000-8000-000000000001";
const CLAIM = "dddddddd-1111-4000-8000-000000000001";

async function seed(db) {
  await db.exec(`
    insert into auth.users (id, email) values
      ('${PENDING_CURATOR}', 'pending@example.test'),
      ('${SUSPENDED_CURATOR}', 'suspended@example.test'),
      ('${APPROVED_CURATOR}', 'approved@example.test');
    insert into public.bvss_curator_profiles (id, user_id, handle, display_name, contact_email, status, plan, suspended_at, suspension_reason, public_profile) values
      ('${PENDING_PROFILE}', '${PENDING_CURATOR}', 'pending-curator', 'Pending Curator', 'pending@example.test', 'pending', 'beta', null, null, false),
      ('${SUSPENDED_PROFILE}', '${SUSPENDED_CURATOR}', 'suspended-curator', 'Suspended Curator', 'suspended@example.test', 'suspended', 'beta', now(), 'Spam routes', false),
      ('${APPROVED_PROFILE}', '${APPROVED_CURATOR}', 'approved-curator', 'Approved Curator', 'approved@example.test', 'approved', 'beta', null, null, true);
    insert into public.bvss_curator_entitlements (curator_id, plan, max_monthly_routes) values ('${APPROVED_PROFILE}', 'beta', 500);
    insert into public.bvss_playlists (id, slug, spotify_playlist_id, spotify_uri, spotify_url, canonical_name, primary_genre, network_owner_type, curator_id)
      values ('${PLAYLIST}', 'partner-list', 'sp1', 'spotify:playlist:sp1', 'https://open.spotify.com/playlist/sp1', 'Partner List', 'melodic bass', 'partner', '${APPROVED_PROFILE}');
    insert into public.bvss_curator_playlist_claims (id, curator_id, playlist_id, verification_code, verification_method, status)
      values ('${CLAIM}', '${APPROVED_PROFILE}', '${PLAYLIST}', 'BVSS-CODE', 'description_code', 'pending');
  `);
}

const EXPLOITS = [
  {
    name: "pending curator self-approves",
    user: PENDING_CURATOR,
    sql: `update public.bvss_curator_profiles set status = 'approved', approved_at = now(), approved_by = '${PENDING_CURATOR}' where id = '${PENDING_PROFILE}' returning status`,
  },
  {
    name: "suspended curator un-suspends",
    user: SUSPENDED_CURATOR,
    sql: `update public.bvss_curator_profiles set status = 'approved', suspended_at = null, suspension_reason = null where id = '${SUSPENDED_PROFILE}' returning status`,
  },
  {
    name: "curator self-upgrades plan",
    user: APPROVED_CURATOR,
    sql: `update public.bvss_curator_profiles set plan = 'pro' where id = '${APPROVED_PROFILE}' returning plan`,
  },
  {
    name: "curator takes over a reserved public handle",
    user: APPROVED_CURATOR,
    sql: `update public.bvss_curator_profiles set handle = 'bvss-official' where id = '${APPROVED_PROFILE}' returning handle`,
  },
  {
    name: "curator forges terms acceptance",
    user: PENDING_CURATOR,
    sql: `update public.bvss_curator_profiles set terms_version = 'curator-beta-2099', terms_accepted_at = now() where id = '${PENDING_PROFILE}' returning terms_version`,
  },
  {
    name: "curator raises own route entitlement",
    reproducesToday: false,
    user: APPROVED_CURATOR,
    sql: `update public.bvss_curator_entitlements set max_monthly_routes = 100000, plan = 'pro' where curator_id = '${APPROVED_PROFILE}' returning max_monthly_routes`,
  },
  {
    name: "curator verifies own playlist claim",
    reproducesToday: false,
    user: APPROVED_CURATOR,
    sql: `update public.bvss_curator_playlist_claims set status = 'verified', verified_at = now() where id = '${CLAIM}' returning status`,
  },
  {
    name: "user grants themself BVSS admin",
    reproducesToday: false,
    user: PENDING_CURATOR,
    sql: `insert into public.bvss_admin_users (user_id, role) values ('${PENDING_CURATOR}', 'admin') returning user_id`,
  },
];

const succeeded = (result) => result.ok && result.rows.length > 0;

describe("BVSS curator network privileges (T1B)", () => {
  let beforeDb;
  let afterDb;

  before(async () => {
    ({ db: beforeDb } = await replayBvss());
    await seed(beforeDb);
    ({ db: afterDb } = await replayBvss({ pending: [MIGRATION] }));
    await seed(afterDb);
  });

  after(async () => {
    await beforeDb?.close();
    await afterDb?.close();
  });

  for (const exploit of EXPLOITS) {
    test(`exploit reproduces on current production schema: ${exploit.name}`, { skip: exploit.reproducesToday === false && "already blocked by RLS; defense-in-depth check only" }, async () => {
      const result = await attempt(beforeDb, "authenticated", exploit.user, exploit.sql);
      assert.ok(succeeded(result), `expected the hole to exist before the fix: ${JSON.stringify(result)}`);
    });

    test(`exploit blocked after migration: ${exploit.name}`, async () => {
      const result = await attempt(afterDb, "authenticated", exploit.user, exploit.sql);
      assert.ok(!succeeded(result), `exploit still works: ${JSON.stringify(result)}`);
    });
  }

  test("anon cannot write curator network tables after migration", async () => {
    const result = await attempt(afterDb, "anon", null, `update public.bvss_curator_profiles set status = 'approved' returning id`);
    assert.ok(!succeeded(result));
  });

  describe("legitimate self-service still works after migration", () => {
    test("curator edits the fields the portal's update_profile edits", async () => {
      const result = await attempt(afterDb, "authenticated", APPROVED_CURATOR, `
        update public.bvss_curator_profiles
        set display_name = 'Approved Curator 2', bio = 'Soft psychedelic bass', website_url = 'https://example.test',
            spotify_profile_url = 'https://open.spotify.com/user/x', social_links = '{"ig":"x"}', genres = array['melodic bass'], moods = array['late night']
        where id = '${APPROVED_PROFILE}' returning display_name, status, plan`);
      assert.ok(result.ok, result.error);
      assert.deepEqual(result.rows, [{ display_name: "Approved Curator 2", status: "approved", plan: "beta" }]);
    });

    test("read paths are unchanged: own profile, other users see approved public profiles, anon unchanged", async () => {
      const own = await attempt(afterDb, "authenticated", PENDING_CURATOR, `select status from public.bvss_curator_profiles where id = '${PENDING_PROFILE}'`);
      assert.deepEqual(own.rows, [{ status: "pending" }]);
      const other = await attempt(afterDb, "authenticated", SUSPENDED_CURATOR, `select handle from public.bvss_curator_profiles order by handle`);
      assert.deepEqual(other.rows, [{ handle: "approved-curator" }, { handle: "suspended-curator" }]);
      // anon has no SELECT policy on this table in production; public pages use
      // the bvss-curators-public edge function. Visibility must be identical.
      const anonBefore = await attempt(beforeDb, "anon", null, `select handle from public.bvss_curator_profiles`);
      const anonAfter = await attempt(afterDb, "anon", null, `select handle from public.bvss_curator_profiles`);
      assert.deepEqual(anonAfter, anonBefore);
    });

    test("service role (edge functions) can still approve and set plans", async () => {
      const result = await attempt(afterDb, "service_role", null, `update public.bvss_curator_profiles set status = 'approved', plan = 'pro' where id = '${PENDING_PROFILE}' returning status, plan`);
      assert.ok(result.ok, result.error);
      assert.deepEqual(result.rows, [{ status: "approved", plan: "pro" }]);
    });
  });

  test("manual rollback restores the pre-migration grants", async () => {
    const { db } = await replayBvss({ pending: [MIGRATION] });
    try {
      await seed(db);
      await db.exec(await readFile(path.join(BVSS_ROOT, "supabase/rollback/20260929220100_harden_bvss_curator_privileges.down.sql"), "utf8"));
      assert.ok(succeeded(await attempt(db, "authenticated", PENDING_CURATOR, EXPLOITS[0].sql)));
    } finally {
      await db.close();
    }
  });
});
