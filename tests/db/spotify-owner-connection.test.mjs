// P0: Spotify owner connection storage (20261004180000). The refresh token lives
// only in Vault, scopes must be read-only, and only the service role can touch it.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { attempt, replayBvss } from "../support/bvss-replay.mjs";

const PENDING = ["harden_bvss_curator_privileges", "bvss_playlist_source_health", "bvss_atomic_review_placement_lifecycle", "bvss_spotify_owner_connection"];
const ADMIN = "aaaaaaaa-3333-4000-8000-000000000001";

// Minimal stand-in for Supabase Vault (secrets stored, decrypted view).
const VAULT_STUB = `
  create schema if not exists vault;
  create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text not null, description text);
  create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
    language sql as $$ insert into vault.secrets(secret, name, description) values (new_secret, new_name, new_description) returning id $$;
  create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void
    language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
  create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
  revoke all on schema vault from anon, authenticated;
`;

const call = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];

describe("bvss_spotify_owner_connection", () => {
  let db;
  before(async () => {
    ({ db } = await replayBvss({ pending: PENDING, prelude: VAULT_STUB }));
    await db.exec(`insert into auth.users (id, email) values ('${ADMIN}', 'a@example.test')`);
  });
  after(async () => db?.close());

  const store = (token, scopes, owned = ["emotional-bass"]) => call(db,
    `select public.bvss_spotify_owner_store($1, 'bvssowner', $2::text[], $3, $4::text[]) r`, [token, scopes, ADMIN, owned]);

  test("refuses missing read scope, any modify/user scope, or no owned playlist", async () => {
    assert.equal((await store("rt", [])).r.error, "missing_playlist_read_scope");
    assert.equal((await store("rt", ["playlist-read-private", "playlist-modify-public"])).r.error, "scope_broader_than_read_only");
    assert.equal((await store("rt", ["playlist-read-private", "user-read-email"])).r.error, "scope_broader_than_read_only");
    assert.equal((await store("rt", ["playlist-read-private"], [])).r.error, "account_owns_no_bvss_playlist");
    assert.equal((await call(db, `select count(*)::int n from vault.secrets`)).n, 0);
  });

  test("stores the token in Vault only; connection facts on bvss_integrations", async () => {
    assert.equal((await store("rt-1", ["playlist-read-private"])).r.ok, true);
    const sec = await call(db, `select count(*)::int n, max(secret) s from vault.secrets where name='bvss_spotify_owner_refresh_token'`);
    assert.deepEqual([sec.n, sec.s], [1, "rt-1"]);
    const i = await call(db, `select status, configuration from public.bvss_integrations where provider='spotify'`);
    assert.equal(i.status, "connected");
    assert.equal(i.configuration.owner_connection.account_id, "bvssowner");
    assert.deepEqual(i.configuration.owner_connection.scopes, ["playlist-read-private"]);
    assert.ok(!JSON.stringify(i.configuration).includes("rt-1"), "token never in the integrations row");
  });

  test("reconnect and rotation replace the single secret", async () => {
    await store("rt-2", ["playlist-read-private"]);
    await call(db, `select public.bvss_spotify_owner_rotate('rt-3')`);
    const sec = await call(db, `select count(*)::int n, max(secret) s from vault.secrets`);
    assert.deepEqual([sec.n, sec.s], [1, "rt-3"]);
    assert.equal((await call(db, `select public.bvss_spotify_owner_token() t`)).t.refresh_token, "rt-3");
  });

  test("failure marks the integration degraded with the reason", async () => {
    await call(db, `select public.bvss_spotify_owner_record_result(false, 'spotify_refresh_failed')`);
    const i = await call(db, `select status, configuration from public.bvss_integrations where provider='spotify'`);
    assert.equal(i.status, "degraded");
    assert.equal(i.configuration.owner_connection.last_result.error, "spotify_refresh_failed");
  });

  test("anon and authenticated cannot read the token or call the functions", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const sql of [
        `select public.bvss_spotify_owner_token()`,
        `select public.bvss_spotify_owner_store('x', 'y', array['playlist-read-private'], null, array['a'])`,
        `select public.bvss_spotify_owner_rotate('x')`,
        `select * from vault.decrypted_secrets`,
      ]) {
        const res = await attempt(db, role, role === "anon" ? null : ADMIN, sql);
        assert.equal(res.ok, false, `${role} must not run: ${sql}`);
      }
    }
  });
});
