import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  return isoDate(new Date(Date.now() - days * 86400000));
}

async function getSoundchartsHeaders() {
  const appId = Deno.env.get("SOUNDCHARTS_APP_ID");
  const apiKey = Deno.env.get("SOUNDCHARTS_API_KEY");
  if (appId && apiKey) {
    return { "x-app-id": appId, "x-api-key": apiKey };
  }

  const clientId = Deno.env.get("SOUNDCHARTS_CLIENT_ID");
  const clientSecret = Deno.env.get("SOUNDCHARTS_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("soundcharts_credentials_missing");
  }

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
  if (!tokenResponse.ok) {
    throw new Error("soundcharts_token_" + tokenResponse.status);
  }
  const token = await tokenResponse.json();
  if (!token?.access_token) throw new Error("soundcharts_token_missing");
  return { authorization: "Bearer " + token.access_token };
}

async function scGet(path: string, headers: Record<string, string>) {
  const response = await fetch(SC_BASE + path, { headers });
  let body: any = null;
  try { body = await response.json(); } catch { body = null; }
  return { ok: response.ok, status: response.status, body };
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
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
    .eq("provider", "soundcharts")
    .maybeSingle();
  if (integrationError) return json({ error: "integration_lookup_failed" }, 500);

  const presented = req.headers.get("x-bvss-sync-token") || "";
  const expectedHash = integration?.configuration?.sync_token_sha256;
  if (!presented || !expectedHash || (await sha256Hex(presented)) !== expectedHash) {
    return json({ error: "unauthorized" }, 401);
  }

  let scHeaders: Record<string, string>;
  try {
    scHeaders = await getSoundchartsHeaders();
  } catch (error) {
    await admin.from("bvss_integrations").update({
      status: "degraded",
      notes: "Soundcharts credentials are configured but authentication failed during the latest sync.",
      updated_at: new Date().toISOString(),
    }).eq("provider", "soundcharts");
    return json({ error: error instanceof Error ? error.message : "soundcharts_auth_failed" }, 502);
  }

  const { data: playlists, error: playlistError } = await admin
    .from("bvss_playlists")
    .select("id,slug,canonical_name,spotify_playlist_id,source_metadata,lifecycle_state")
    .eq("lifecycle_state", "active")
    .not("spotify_playlist_id", "is", null)
    .order("display_order");
  if (playlistError) return json({ error: "playlist_lookup_failed" }, 500);

  const startedAt = new Date().toISOString();
  const { data: run } = await admin.from("bvss_sync_runs").insert({
    provider: "soundcharts",
    sync_type: "playlist_metrics",
    status: "started",
    requested_at: startedAt,
    metadata: { playlist_count: playlists?.length || 0, mode: "daily_metrics" },
  }).select("id").single();

  let success = 0;
  let missing = 0;
  let failed = 0;
  let historyRows = 0;
  let metadataRows = 0;
  let historyForbidden = false;
  const errors: any[] = [];

  await runPool(playlists || [], 4, async (playlist: any) => {
    try {
      const lookup = await scGet(
        "/api/v2.8/playlist/by-platform/spotify/" + encodeURIComponent(playlist.spotify_playlist_id),
        scHeaders,
      );
      if (lookup.status === 404) {
        missing += 1;
        errors.push({ slug: playlist.slug, stage: "lookup", status: 404 });
        return;
      }
      if (!lookup.ok) {
        failed += 1;
        errors.push({ slug: playlist.slug, stage: "lookup", status: lookup.status });
        return;
      }

      const object = lookup.body?.object || lookup.body;
      const uuid = object?.uuid;
      const followers = Number.isFinite(Number(object?.latestSubscriberCount))
        ? Number(object.latestSubscriberCount)
        : null;
      const trackCount = Number.isFinite(Number(object?.latestTrackCount))
        ? Number(object.latestTrackCount)
        : null;
      const crawlDate = object?.latestCrawlDate || new Date().toISOString();
      const observedAt = new Date(crawlDate).toString() === "Invalid Date"
        ? new Date().toISOString()
        : new Date(crawlDate).toISOString();
      const metricDate = observedAt.slice(0, 10);

      if (followers !== null || trackCount !== null) {
        const { error: snapError } = await admin.from("bvss_playlist_metric_snapshots").upsert({
          playlist_id: playlist.id,
          metric_date: metricDate,
          followers,
          track_count: trackCount,
          source: "soundcharts",
          source_ref: uuid || playlist.spotify_playlist_id,
          observed_at: observedAt,
          raw_data: { method: "playlist_metadata", soundcharts_uuid: uuid || null },
        }, { onConflict: "playlist_id,metric_date,source" });
        if (snapError) throw snapError;
        metadataRows += 1;
      }

      const patch: any = {
        updated_at: new Date().toISOString(),
        source_metadata: {
          ...(playlist.source_metadata || {}),
          soundcharts_uuid: uuid || playlist.source_metadata?.soundcharts_uuid || null,
          soundcharts_last_crawl_at: observedAt,
        },
      };
      if (followers !== null) {
        patch.current_follower_count = followers;
        patch.follower_count_source = "soundcharts";
        patch.follower_count_observed_at = observedAt;
      }
      if (trackCount !== null) patch.current_track_count = trackCount;
      const { error: updateError } = await admin.from("bvss_playlists").update(patch).eq("id", playlist.id);
      if (updateError) throw updateError;

      const needsBackfill = !playlist.source_metadata?.soundcharts_history_backfill_completed_at;
      if (!historyForbidden && uuid && needsBackfill) {
        let backfillOk = true;
        const ranges = [
          [365, 276],
          [275, 186],
          [185, 96],
          [95, 0],
        ];
        for (const [startAgo, endAgo] of ranges) {
          const history = await scGet(
            "/api/v2.20/playlist/" + encodeURIComponent(uuid) +
            "/audience?startDate=" + daysAgo(startAgo) + "&endDate=" + daysAgo(endAgo) + "&sort=asc",
            scHeaders,
          );
          if (history.status === 403) {
            historyForbidden = true;
            backfillOk = false;
            break;
          }
          if (!history.ok) {
            backfillOk = false;
            if (history.status !== 404) errors.push({ slug: playlist.slug, stage: "history", status: history.status });
            continue;
          }
          const rows = (Array.isArray(history.body?.items) ? history.body.items : [])
            .filter((item: any) => item?.date && Number.isFinite(Number(item?.value)))
            .map((item: any) => ({
              playlist_id: playlist.id,
              metric_date: String(item.date).slice(0, 10),
              followers: Number(item.value),
              track_count: null,
              source: "soundcharts",
              source_ref: uuid,
              observed_at: item.date,
              raw_data: { method: "audience_history", soundcharts_uuid: uuid },
            }));
          if (rows.length) {
            const { error: histError } = await admin
              .from("bvss_playlist_metric_snapshots")
              .upsert(rows, { onConflict: "playlist_id,metric_date,source" });
            if (histError) throw histError;
            historyRows += rows.length;
          }
        }
        if (backfillOk && !historyForbidden) {
          patch.source_metadata = {
            ...(patch.source_metadata || {}),
            soundcharts_history_backfill_completed_at: new Date().toISOString(),
          };
          const { error: backfillMarkError } = await admin
            .from("bvss_playlists")
            .update({ source_metadata: patch.source_metadata, updated_at: new Date().toISOString() })
            .eq("id", playlist.id);
          if (backfillMarkError) throw backfillMarkError;
        }
      }

      success += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        slug: playlist.slug,
        stage: "internal",
        detail: error instanceof Error ? error.message.slice(0, 180) : "unknown",
      });
    }
  });

  const completedAt = new Date().toISOString();
  const status = success > 0 ? (failed > 0 ? "partial" : "completed") : "failed";
  if (run?.id) {
    await admin.from("bvss_sync_runs").update({
      status,
      completed_at: completedAt,
      records_seen: playlists?.length || 0,
      records_written: metadataRows + historyRows,
      error_summary: errors.length ? JSON.stringify(errors.slice(0, 20)) : null,
      metadata: {
        playlists_succeeded: success,
        playlists_missing_in_soundcharts: missing,
        playlists_failed: failed,
        metadata_snapshots_written: metadataRows,
        history_snapshots_written: historyRows,
        historical_endpoint_available: !historyForbidden,
      },
    }).eq("id", run.id);
  }

  const config = {
    ...(integration?.configuration || {}),
    historical_endpoint_available: !historyForbidden,
    last_run: {
      completed_at: completedAt,
      success,
      missing,
      failed,
      metadata_rows: metadataRows,
      history_rows: historyRows,
    },
  };
  await admin.from("bvss_integrations").update({
    status: success > 0 ? "ready" : "degraded",
    last_sync_at: success > 0 ? completedAt : null,
    notes: success > 0
      ? "Soundcharts daily playlist metrics sync is active. BVSS stores its own permanent follower and track-count history."
      : "Soundcharts sync is configured but the latest run did not return any usable playlist metrics.",
    configuration: config,
    updated_at: completedAt,
  }).eq("provider", "soundcharts");

  return json({
    ok: success > 0,
    status,
    playlists: playlists?.length || 0,
    success,
    missing,
    failed,
    metadata_rows: metadataRows,
    history_rows: historyRows,
    historical_endpoint_available: !historyForbidden,
  }, success > 0 ? 200 : 502);
});