// bvss-spotify-owner / CuratorOS Spotify ownership verification.
// One registered Spotify redirect URI serves both the BVSS operator and external CuratorOS curators.
// Scopes are read-only: playlist-read-private only. No playlist mutation is possible here.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  OBSERVATION_METHOD, authorizeUrl, checkScopes, evidenceHash, extractObservation, sha256Hex, signState, verifyState,
} from "../_shared/spotify-owner.ts";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const REDIRECT_URI = PROJECT_URL.replace(/\/$/, "") + "/functions/v1/bvss-spotify-owner/callback";
const BVSS_RETURN = "https://bvssfvm.com/playlist-os";
const CURATOR_RETURN = "https://curatoros-rho.vercel.app/app/playlists";
const API = "https://api.spotify.com/v1";

function headers(origin: string | null) {
  const allowed = new Set([
    "https://bvssfvm.com", "https://www.bvssfvm.com",
    "https://curatoros-rho.vercel.app",
    "http://localhost:3000", "http://localhost:5173",
  ]);
  return {
    "Content-Type": "application/json", "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : "https://curatoros-rho.vercel.app",
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

async function authenticatedUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await createClient(PROJECT_URL, keys().publishable!, { auth: { persistSession: false } }).auth.getUser(token);
  return user || null;
}
async function adminUser(req: Request) {
  const user = await authenticatedUser(req);
  if (!user) return null;
  const { data } = await service().from("bvss_admin_users").select("role").eq("user_id", user.id).maybeSingle();
  return data ? user : null;
}
async function curatorProfile(db: any, userId: string) {
  const { data, error } = await db.from("bvss_curator_profiles")
    .select("id,user_id,status,display_name,professional_profile_id,workspace_id")
    .eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
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
  if (!res.ok) throw new Error("spotify_token_" + res.status + ":" + String(json?.error || "").slice(0, 60));
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
  return data || [];
}
async function curatorPlaylists(db: any, curatorId: string) {
  const { data, error } = await db.from("bvss_playlists")
    .select("id,slug,canonical_name,spotify_playlist_id,property_id,verification_status,submission_status")
    .eq("curator_id", curatorId);
  if (error) throw error;
  return data || [];
}

async function markOAuthOwnership(db: any, profile: any, playlist: any, spotifyAccountId: string) {
  const { data: claim, error: cErr } = await db.from("bvss_curator_playlist_claims")
    .update({
      verification_method: "spotify_oauth",
      notes: "Spotify owner OAuth matched account " + spotifyAccountId,
    })
    .eq("curator_id", profile.id).eq("playlist_id", playlist.id)
    .select("id,status").maybeSingle();
  if (cErr) throw cErr;

  if (playlist.property_id) {
    const { error: pcErr } = await db.from("property_claims")
      .update({
        verification_method: "oauth",
        evidence_url: "https://open.spotify.com/playlist/" + playlist.spotify_playlist_id,
        evidence_notes: "Spotify owner OAuth account matched playlist owner: " + spotifyAccountId,
        updated_at: new Date().toISOString(),
      })
      .eq("property_id", playlist.property_id).eq("claimant_user_id", profile.user_id);
    if (pcErr) throw pcErr;
  }

  if (!claim) return { playlist_id: playlist.id, slug: playlist.slug, owner_match: true, verified: false, reason: "claim_missing" };
  if (profile.status !== "approved") {
    return { playlist_id: playlist.id, slug: playlist.slug, owner_match: true, verified: false, reason: "curator_approval_pending" };
  }
  const { data: decision, error: dErr } = await db.rpc("curatoros_decide_playlist_claim", {
    p_claim_id: claim.id,
    p_reviewer: profile.user_id,
    p_decision: "approve",
    p_notes: "Verified automatically by read-only Spotify owner OAuth account " + spotifyAccountId,
  });
  if (dErr) throw dErr;
  return {
    playlist_id: playlist.id, slug: playlist.slug, owner_match: true,
    verified: !!decision?.ok && decision?.status === "verified",
    reason: decision?.ok ? null : (decision?.error || "claim_transition_failed"),
  };
}

async function verifyCuratorOwnership(db: any, profile: any, accessToken: string, spotifyAccountId: string) {
  const results: any[] = [];
  for (const p of await curatorPlaylists(db, profile.id)) {
    try {
      const meta = await api("/playlists/" + p.spotify_playlist_id + "?fields=owner(id)", accessToken);
      if (meta?.owner?.id !== spotifyAccountId) {
        results.push({ playlist_id: p.id, slug: p.slug, owner_match: false, verified: false, reason: "owner_mismatch" });
        continue;
      }
      results.push(await markOAuthOwnership(db, profile, p, spotifyAccountId));
    } catch (e) {
      results.push({ playlist_id: p.id, slug: p.slug, owner_match: false, verified: false, reason: (e as Error).message.slice(0, 100) });
    }
  }
  await db.rpc("curatoros_spotify_record_verification", {
    p_user_id: profile.user_id,
    p_ok: results.some((r) => r.owner_match),
    p_error: results.some((r) => r.owner_match) ? null : "no_registered_playlist_owned_by_connected_account",
  });
  return results;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const h = headers(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const db = service();

  try {
    // Shared OAuth callback. The signed state identifies the authenticated user;
    // server-side identity determines whether this is the BVSS operator or an external curator.
    if (req.method === "GET" && url.pathname.endsWith("/callback")) {
      const st = await verifyState(spotifyApp().secret, url.searchParams.get("state") || "");
      const fail = (target: string, q: string) => Response.redirect(target + "?spotify=" + encodeURIComponent(q), 302);
      if ("error" in st) return fail(CURATOR_RETURN, st.error);
      if (url.searchParams.get("error")) return fail(CURATOR_RETURN, "denied");
      const code = url.searchParams.get("code");
      if (!code) return fail(CURATOR_RETURN, "missing_code");

      const tok = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });
      const scopes = checkScopes(tok.scope || "");
      if (!scopes.ok) return fail(CURATOR_RETURN, scopes.error);
      if (!tok.refresh_token) return fail(CURATOR_RETURN, "no_refresh_token");
      const me = await api("/me", tok.access_token);

      const { data: admin } = await db.from("bvss_admin_users").select("role").eq("user_id", st.userId).maybeSingle();
      if (admin) {
        const owned: string[] = [];
        for (const p of (await bvssOwnedPlaylists(db)).slice(0, 30)) {
          try {
            const meta = await api("/playlists/" + p.spotify_playlist_id + "?fields=owner(id)", tok.access_token);
            if (meta?.owner?.id === me.id) owned.push(p.slug);
          } catch { /* unreadable */ }
        }
        if (!owned.length) return fail(BVSS_RETURN, "account_owns_no_bvss_playlist");
        const { data, error } = await db.rpc("bvss_spotify_owner_store", {
          p_refresh_token: tok.refresh_token, p_account_id: me.id, p_scopes: scopes.scopes,
          p_connected_by: st.userId, p_owned_playlists: owned,
        });
        if (error) throw error;
        if (!data?.ok) return fail(BVSS_RETURN, String(data?.error || "store_failed"));
        return Response.redirect(BVSS_RETURN + "?spotify=connected&owned=" + owned.length, 302);
      }

      const profile = await curatorProfile(db, st.userId);
      if (!profile) return fail(CURATOR_RETURN, "curator_profile_required");
      const { data: stored, error: sErr } = await db.rpc("curatoros_spotify_store", {
        p_user_id: st.userId,
        p_curator_id: profile.id,
        p_refresh_token: tok.refresh_token,
        p_account_id: me.id,
        p_scopes: scopes.scopes,
      });
      if (sErr) throw sErr;
      if (!stored?.ok) return fail(CURATOR_RETURN, stored?.error || "store_failed");
      const results = await verifyCuratorOwnership(db, profile, tok.access_token, me.id);
      const owned = results.filter((r) => r.owner_match).length;
      const verified = results.filter((r) => r.verified).length;
      return Response.redirect(CURATOR_RETURN + "?spotify=connected&owned=" + owned + "&verified=" + verified, 302);
    }

    if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: h });
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "configuration_status") {
      const configured = !!Deno.env.get("SPOTIFY_CLIENT_ID") && !!Deno.env.get("SPOTIFY_CLIENT_SECRET");
      return new Response(JSON.stringify({ ok: true, spotify_app_configured: configured, redirect_uri: REDIRECT_URI, scope: "playlist-read-private" }), { headers: h });
    }
    const user = await authenticatedUser(req);
    const admin = user ? (await db.from("bvss_admin_users").select("role").eq("user_id", user.id).maybeSingle()).data : null;

    // External CuratorOS flow.
    if (action === "curator_start") {
      if (!user) return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers: h });
      const profile = await curatorProfile(db, user.id);
      if (!profile) return new Response(JSON.stringify({ error: "curator_profile_required" }), { status: 403, headers: h });
      const state = await signState(spotifyApp().secret, user.id);
      return new Response(JSON.stringify({
        ok: true,
        url: authorizeUrl(spotifyApp().id, REDIRECT_URI, state),
        redirect_uri: REDIRECT_URI,
        scope: "playlist-read-private",
      }), { headers: h });
    }
    if (action === "curator_status") {
      if (!user) return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers: h });
      const profile = await curatorProfile(db, user.id);
      if (!profile) return new Response(JSON.stringify({ error: "curator_profile_required" }), { status: 403, headers: h });
      const { data, error } = await db.from("curatoros_spotify_connections")
        .select("spotify_account_id,scopes,status,connected_at,last_verified_at,last_error")
        .eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      const configured = !!Deno.env.get("SPOTIFY_CLIENT_ID") && !!Deno.env.get("SPOTIFY_CLIENT_SECRET");
      return new Response(JSON.stringify({ ok: true, connected: !!data, connection: data || null, spotify_app_configured: configured, redirect_uri: REDIRECT_URI }), { headers: h });
    }
    if (action === "curator_verify") {
      if (!user) return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers: h });
      const profile = await curatorProfile(db, user.id);
      if (!profile) return new Response(JSON.stringify({ error: "curator_profile_required" }), { status: 403, headers: h });
      const { data: cred, error: cErr } = await db.rpc("curatoros_spotify_token", { p_user_id: user.id });
      if (cErr) throw cErr;
      if (!cred?.ok || !cred?.refresh_token) return new Response(JSON.stringify({ ok: false, error: cred?.error || "spotify_not_connected" }), { status: 409, headers: h });
      const tok = await tokenRequest({ grant_type: "refresh_token", refresh_token: cred.refresh_token });
      const results = await verifyCuratorOwnership(db, profile, tok.access_token, cred.spotify_account_id);
      return new Response(JSON.stringify({
        ok: true,
        playlists: results.length,
        owner_matches: results.filter((r) => r.owner_match).length,
        verified: results.filter((r) => r.verified).length,
        results,
      }), { headers: h });
    }
    if (action === "curator_disconnect") {
      if (!user) return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers: h });
      const { data, error } = await db.rpc("curatoros_spotify_disconnect", { p_user_id: user.id });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: h });
    }

    // Existing BVSS operator flow.
    if (action === "start") {
      if (!user || !admin) return new Response(JSON.stringify({ error: "not_authorized" }), { status: 403, headers: h });
      const state = await signState(spotifyApp().secret, user.id);
      return new Response(JSON.stringify({ ok: true, url: authorizeUrl(spotifyApp().id, REDIRECT_URI, state), redirect_uri: REDIRECT_URI }), { headers: h });
    }
    if (action === "status") {
      if (!user || !admin) return new Response(JSON.stringify({ error: "not_authorized" }), { status: 403, headers: h });
      const { data } = await db.from("bvss_integrations").select("status,last_sync_at,configuration").eq("provider", "spotify").maybeSingle();
      return new Response(JSON.stringify({ ok: true, status: data?.status, last_sync_at: data?.last_sync_at, connection: data?.configuration?.owner_connection ?? null, redirect_uri: REDIRECT_URI }), { headers: h });
    }
    if (action === "observe") {
      const viaCron = (!user || !admin) && (await cronAuthorized(req, db));
      if ((!user || !admin) && !viaCron) return new Response(JSON.stringify({ error: "not_authorized" }), { status: 403, headers: h });
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

      const triggeredBy = user && admin ? "admin:" + user.id : "cron";
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
            pages.push(page); next = page?.next || null;
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
          results.push({ slug: p.slug, ok: false, error: (e as Error).message.slice(0, 100) });
        }
      }
      const failed = results.filter((r) => !r.ok).length;
      await db.rpc("bvss_spotify_owner_record_result", { p_ok: failed === 0, p_error: failed ? failed + " playlist(s) failed" : null });
      return new Response(JSON.stringify({
        ok: failed === 0, triggered_by: triggeredBy, playlists: results.length, failed,
        placements_live: results.reduce((a, r) => a + (r.placements_live || 0), 0), results,
      }), { status: failed && failed === results.length ? 502 : 200, headers: h });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "spotify_owner_failed", detail: (e as Error).message.slice(0, 180) }), { status: 500, headers: h });
  }
});
