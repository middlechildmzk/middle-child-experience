// Replay BVSS-owned artistos-core migrations into in-process PostgreSQL
// (PGlite). Ordering authority is middlechildmzk/artistos
// supabase/CROSS_REPO_MIGRATION_MANIFEST.json; it records that no BVSS
// migration depends on an ArtistOS object (cross_repo_depends_on is empty), so
// replaying BVSS alone, in production-version order, is valid.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { SUPABASE_PLATFORM_STUB } from "./supabase-platform-stub.mjs";

export const BVSS_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
/** Last BVSS migration applied to production (manifest, captured 2026-09-29). */
export const LAST_APPLIED_VERSION = "20260928163302";

export async function replayBvss({ pending = [], prelude = "" } = {}) {
  const dir = path.join(BVSS_ROOT, "supabase/migrations");
  const files = (await readdir(dir)).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();
  const applied = files.filter((f) => f.slice(0, 14) <= LAST_APPLIED_VERSION);
  const wanted = files.filter((f) => f.slice(0, 14) > LAST_APPLIED_VERSION && pending.includes(f.slice(15, -4)));
  if (wanted.length !== pending.length) throw new Error(`unknown pending migration in ${pending.join(", ")}`);
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_PLATFORM_STUB);
  if (prelude) await db.exec(prelude);
  for (const file of [...applied, ...wanted]) {
    try {
      await db.exec(await readFile(path.join(dir, file), "utf8"));
    } catch (error) {
      error.message = `replay failed at ${file}: ${error.message}`;
      throw error;
    }
  }
  return { db, applied: [...applied, ...wanted] };
}

/** Run one statement as an API role inside a rolled-back transaction. */
export async function attempt(db, role, userId, sql) {
  await db.exec("begin");
  try {
    await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ""}', true); set local role ${role};`);
    const result = await db.query(sql);
    return { ok: true, rows: result.rows ?? [] };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    await db.exec("rollback");
  }
}
