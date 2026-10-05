// bvss-spotify-owner: read-only Spotify owner connection used ONLY to verify
// that accepted tracks are live on BVSS-owned playlists.
//
//   POST {action:"start"}            admin  -> Spotify authorize URL (scope playlist-read-private)
//   GET  /bvss-spotify-owner/callback        <- Spotify redirect; stores the refresh token in Vault
//   POST {action:"status"}           admin  -> connection facts (never the token)
//   POST {action:"observe"}          admin or x-bvss-sync-token (cron)
//        reads GET /v1/playlists/{id}/items for each BVSS-owned playlist the
//        connected account owns and records ids/positions/added times + an
//        evidence hash through bvss_record_playlist_observation.
//
// Nothing read here is stored beyond verification facts, and nothing is passed
// to Muse or any model. Deployed with verify_jwt=false because the OAuth
// callback is a browser redirect; every POST action authenticates itself.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  OBSERVATION_METHOD, authorizeUrl, checkScopes, evidenceHash, extractObservation, sha256Hex, signState, verifyState,
} from "../_shared/spotify-owner.ts";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const REDIRECT_URI = PROJECT_URL.replace(/\/$/, "") + "/functions/v1/bvss-spotify-owner/callback";
const RETURN_TO = "https://bvssfvm.com/playlist-os";
const API = "https://api.spotify.com/v1";

function headers(origin: string | null) {
  const allowed = new Set(["https://bvssfvm.com", "https://www.bvssfvm.com", "http://localhost:3000"]);
  return {
    "Content-Type": "application/json", "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : "https://bvssfvm.com",
    "Access-Control-Allow-Headers": "authorization, content-type, x-bvss-sync-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Vary": "Origin",
  };
}
function keys() {
  const s = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const p = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  return { secret: s.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), publishable: p.default || Deno.env.get("SUPABASE_ANON_KEY") };
}
function spotifyApp() {
  const id = Deno.env.get("SPOTIFY_CLIENT_ID"), secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("spotify_app_credentials_missing");
  return { id, secret };
}
const service = () => createClient(PROJECT_URL, keys().secret!, { auth: { persistSession: false } });

async function adminUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await createClient(PROJECT_URL, keys().publishable!, { auth: { persistSession: false } }).auth.getUser(token);
  if (!user) return null;
  const { data } = await service().from("bvss_admin_users").select("role").eq("user_id", user.id).maybeSingle();
  return data ? user : null;
}
async function cronAuthorized(req: Request, db: any) {
  const presented = req.headers.get("x-bvss-sync-token") || "";
  if (!presented) return false;
  const { data } = await db.from("bvss_integrations").select("configuration").eq("provider", "soundcharts").maybeSingle();
  const expected = data?.configuration?.sync_token_sha256;
  return !!expected && (await sha256Hex(presented)) === expected;
}

async function tokenRequest(body: Record<string, string>) {
  const { id, secret } = spotifyApp();
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(id + ":" + secret) },
    body: new URLSearchParams(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("spotify_token_" + res.status + ":" + String(json?.error || "").slice(0, 40));
  return json as { access_token: string; refresh_token?: string; scope?: string };
}
async function api(path: string, accessToken: string) {
  const res = await fetch(API + path, { headers: { Authorization: "Bearer " + accessToken } });
  if (!res.ok) throw Object.assign(new Error("spotify_api_" + res.status), { status: res.status });
  return res.json();
}

async function bvssOwnedPlaylists(db: any, ids?: string[]) {
  let q = db.from("bvss_playlists").select("id,slug,spotify_playlist_id").eq("network_owner_type", "bvss").in("lifecycle_state", ["active", "experimental"]);
  if (ids?.length) q = q.in("id", ids);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Array<{ id: string; slug: string; spotify_playlist_id: string }>;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const h = headers(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const db = service();

  try {
    // ---- OAuth callback (browser redirect from Spotify) ----
    if (req.method === "GET" && url.pathname.endsWith("/callback")) {
      const back = (q: string) => Response.redirect(RETURN_TO + "?spotify=" + q, 302);
      if (url.searchParams.get("error")) return back("denied");
      const st = await verifyState(spotifyApp().secret, url.searchParams.get("state") || "");
      if ("error" in st) return back(st.error);
      const code = url.searchParams.get("code");
      if (!code) return back("missing_code");
      const tok = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });
      const scopes = checkScopes(tok.scope || "");
      if (!scopes.ok) return back(scopes.error);
      if (!tok.refresh_token) return back("no_refresh_token");
      const me = await api("/me", tok.access_token);
      // Prove ownership: the connected account must own the BVSS playlists it will verify.
      const owned: string[] = [];
      for (const p of (await bvssOwnedPlaylists(db)).slice(0, 30)) {
        try {
          const meta = await api("/playlists/" + p.spotify_playlist_id + "?fields=owner(id)", tok.access_token);
          if (meta?.owner?.id === me.id) owned.push(p.slug);
        } catch { /* not readable by this account */ }
      }
      if (!owned.length) return back("account_owns_no_bvss_playlist");
      const { data, error } = await db.rpc("bvss_spotify_owner_store", {
        p_refresh_token: tok.refresh_token, p_account_id: me.id, p_scopes: scopes.scopes,
        p_connected_by: st.userId, p_owned_playlists: owned,
      });
      if (error) throw error;
      if (!data?.ok) return back(String(data?.error || "store_failed"));
      return back("connected&owned=" + owned.length);
    }

    if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: h });
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const admin = await adminUser(req);

    if (action === "start") {
      if (!admin) return new Response(JSON.stringify({ error: "not_authorized" }), { status: 403, headers: h });
      const state = await signState(spotifyApp().secret, admin.id);
      return new Response(JSON.stringify({ ok: true, url: authorizeUrl(spotifyApp().id, REDIRECT_URI, state), redirect_uri: REDIRECT_URI }), { headers: h });
    }

    if (action === "status") {
      if (!admin) return new Response(JSON.stringify({ error: "not_authorized" }), { status: 403, headers: h });
      const { data } = await db.from("bvss_integrations").select("status,last_sync_at,configuration").eq("provider", "spotify").maybeSingle();
      return new Response(JSON.stringify({ ok: true, status: data?.status, last_sync_at: data?.last_sync_at, connection: data?.configuration?.owner_connection ?? null, redirect_uri: REDIRECT_URI }), { headers: h });
    }

    if (action === "observe") {
      const viaCron = !admin && (await cronAuthorized(req, db));
      if (!admin && !viaCron) return new Response(JSON.stringify({ error: "not_authorized" }), { status: 403, headers: h });
      const { data: cred, error: cErr } = await db.rpc("bvss_spotify_owner_token");
      if (cErr) throw cErr;
      if (!cred?.refresh_token || !cred?.account_id) return new Response(JSON.stringify({ ok: false, error: "spotify_owner_not_connected" }), { status: 409, headers: h });

      let tok;
      try {
        tok = await tokenRequest({ grant_type: "refresh_token", refresh_token: cred.refresh_token });
      } catch (e) {
        await db.rpc("bvss_spotify_owner_record_result", { p_ok: false, p_error: String((e as Error).message) });
        return new Response(JSON.stringify({ ok: false, error: "spotify_refresh_failed" }), { status: 502, headers: h });
      }
      if (tok.refresh_token && tok.refresh_token !== cred.refresh_token) await db.rpc("bvss_spotify_owner_rotate", { p_refresh_token: tok.refresh_token });

      const triggeredBy = admin ? "admin:" + admin.id : "cron";
      const ids = Array.isArray(body.playlist_ids) ? body.playlist_ids.map(String).slice(0, 50) : undefined;
      const results: any[] = [];
      for (const p of await bvssOwnedPlaylists(db, ids)) {
        try {
          const meta = await api("/playlists/" + p.spotify_playlist_id + "?fields=snapshot_id,owner(id)", tok.access_token);
          if (meta?.owner?.id !== cred.account_id) { results.push({ slug: p.slug, ok: false, error: "not_owned_by_connected_account" }); continue; }
          const pages: any[] = [];
          let next: string | null = API + "/playlists/" + p.spotify_playlist_id + "/items?limit=50";
          for (let guard = 0; next && guard < 40; guard++) {
            const page: any = await api(next.replace(API, ""), tok.access_token);
            pages.push(page);
            next = page?.next || null;
          }
          const observedAt = new Date().toISOString();
          const obs = extractObservation(pages);
          const hash = await evidenceHash(p.spotify_playlist_id, meta?.snapshot_id ?? null, obs.tracks);
          const { data, error } = await db.rpc("bvss_record_playlist_observation", {
            p_playlist_id: p.id, p_source: "spotify_owner_api", p_snapshot_id: meta?.snapshot_id ?? null,
            p_observed_at: observedAt, p_tracks: obs.tracks,
            p_context: { evidence_hash: hash, method: OBSERVATION_METHOD, triggered_by: triggeredBy, skipped_entries: obs.skipped_entries },
          });
          if (error) throw error;
          results.push({ slug: p.slug, ok: !!data?.ok, error: data?.error, tracks: obs.tracks.length, placements_live: data?.placements_live ?? 0, placements_removed: data?.placements_removed ?? 0, evidence_hash: hash });
        } catch (e) {
          results.push({ slug: p.slug, ok: false, error: (e as Error).message.slice(0, 80) });
        }
      }
      const failed = results.filter((r) => !r.ok).length;
      await db.rpc("bvss_spotify_owner_record_result", { p_ok: failed === 0, p_error: failed ? failed + " playlist(s) failed" : null });
      return new Response(JSON.stringify({ ok: failed === 0, triggered_by: triggeredBy, playlists: results.length, failed,
        placements_live: results.reduce((a, r) => a + (r.placements_live || 0), 0), results }), { status: failed && failed === results.length ? 502 : 200, headers: h });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "spotify_owner_failed", detail: (e as Error).message.slice(0, 160) }), { status: 500, headers: h });
  }
});
