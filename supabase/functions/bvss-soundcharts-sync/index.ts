// Daily Soundcharts playlist-metrics sync for BVSS.
//
// Thin adapter: authentication, Supabase persistence and HTTP live here; every
// measurement rule lives in ../_shared/soundcharts-sync-core.ts and
// ../_shared/source-health.ts, which are unit-tested.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  MONITORED_LIFECYCLES,
  PROVIDER,
  type SoundchartsProvider,
  type SyncStore,
  runSoundchartsSync,
} from "../_shared/soundcharts-sync-core.ts";

const SC_BASE = "https://customer.api.soundcharts.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function soundchartsProvider(): SoundchartsProvider {
  let headers: Record<string, string> | null = null;
  const get = async (path: string) => {
    const response = await fetch(SC_BASE + path, { headers: headers ?? {} });
    let body: unknown = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  };
  return {
    async authenticate() {
      const appId = Deno.env.get("SOUNDCHARTS_APP_ID");
      const apiKey = Deno.env.get("SOUNDCHARTS_API_KEY");
      if (appId && apiKey) { headers = { "x-app-id": appId, "x-api-key": apiKey }; return; }
      const clientId = Deno.env.get("SOUNDCHARTS_CLIENT_ID");
      const clientSecret = Deno.env.get("SOUNDCHARTS_CLIENT_SECRET");
      if (!clientId || !clientSecret) throw new Error("soundcharts_credentials_missing");
      const params = new URLSearchParams({ grant_type: "client_credentials" });
      const teamId = Deno.env.get("SOUNDCHARTS_TEAM_ID");
      if (teamId) params.set("team_id", teamId);
      const tokenResponse = await fetch("https://account.soundcharts.com/oauth/token", {
        method: "POST",
        headers: {
          authorization: "Basic " + btoa(clientId + ":" + clientSecret),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      if (!tokenResponse.ok) throw new Error("soundcharts_token_" + tokenResponse.status);
      const token = await tokenResponse.json();
      if (!token?.access_token) throw new Error("soundcharts_token_missing");
      headers = { authorization: "Bearer " + token.access_token };
    },
    lookupPlaylist: (spotifyPlaylistId) =>
      get("/api/v2.8/playlist/by-platform/spotify/" + encodeURIComponent(spotifyPlaylistId)),
    audienceHistory: (uuid, startDate, endDate) =>
      get("/api/v2.20/playlist/" + encodeURIComponent(uuid) + "/audience?startDate=" + startDate + "&endDate=" + endDate + "&sort=asc"),
  };
}

function supabaseStore(admin: any, integrationConfig: Record<string, unknown>): SyncStore {
  const must = async (promise: PromiseLike<{ error: unknown; data?: unknown }>) => {
    const { error, data } = await promise;
    if (error) throw error;
    return data;
  };
  return {
    async listMonitoredPlaylists() {
      return (await must(admin.from("bvss_playlists")
        .select("id,slug,spotify_playlist_id,lifecycle_state,source_metadata,current_follower_count,follower_count_observed_at,current_track_count")
        .in("lifecycle_state", [...MONITORED_LIFECYCLES])
        .not("spotify_playlist_id", "is", null)
        .order("display_order"))) as any[];
    },
    async listStatuses() {
      return (await must(admin.from("bvss_playlist_source_status").select("*").eq("provider", PROVIDER).eq("metric", "followers"))) as any[];
    },
    async startRun(metadata) {
      const { data } = await admin.from("bvss_sync_runs").insert({
        provider: PROVIDER, sync_type: "playlist_metrics", status: "started",
        requested_at: new Date().toISOString(), metadata,
      }).select("id").single();
      return data?.id ?? null;
    },
    async upsertSnapshots(rows) {
      // A BEFORE UPDATE trigger keeps any row whose stored provider measurement
      // is newer, so an upsert can never regress a snapshot.
      await must(admin.from("bvss_playlist_metric_snapshots").upsert(rows, { onConflict: "playlist_id,metric_date,source" }));
    },
    async updatePlaylist(id, patch) {
      await must(admin.from("bvss_playlists").update(patch).eq("id", id));
    },
    async upsertStatuses(rows) {
      if (rows.length) await must(admin.from("bvss_playlist_source_status").upsert(rows, { onConflict: "playlist_id,provider,metric" }));
    },
    async finishRun(id, patch) {
      if (id) await must(admin.from("bvss_sync_runs").update(patch).eq("id", id));
    },
    async updateIntegration({ status, notes, last_sync_at, configuration_patch }) {
      const patch: Record<string, unknown> = {
        status, notes, updated_at: new Date().toISOString(),
        configuration: { ...integrationConfig, ...configuration_patch },
      };
      if (last_sync_at) patch.last_sync_at = last_sync_at;
      await must(admin.from("bvss_integrations").update(patch).eq("provider", PROVIDER));
    },
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) return json({ error: "supabase_env_missing" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: integration, error: integrationError } = await admin
    .from("bvss_integrations")
    .select("status,configuration")
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (integrationError) return json({ error: "integration_lookup_failed" }, 500);

  const presented = req.headers.get("x-bvss-sync-token") || "";
  const expectedHash = integration?.configuration?.sync_token_sha256;
  if (!presented || !expectedHash || (await sha256Hex(presented)) !== expectedHash) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const result = await runSoundchartsSync(supabaseStore(admin, integration?.configuration ?? {}), soundchartsProvider());
    return json(result, result.ok ? 200 : 502);
  } catch (error) {
    return json({ error: "sync_failed", detail: error instanceof Error ? error.message.slice(0, 180) : "unknown" }, 500);
  }
});
