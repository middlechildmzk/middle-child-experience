import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://bvssfvm.com",
  "https://www.bvssfvm.com",
  "http://localhost:3000",
]);

function headers(origin: string | null) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://bvssfvm.com",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

function keys() {
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  return {
    secret: secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    publishable: publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY"),
  };
}

async function auth(req: Request) {
  const { secret, publishable } = keys();
  if (!secret || !publishable) throw new Error("Supabase keys unavailable");

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "missing_auth", status: 401 };

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, publishable, {
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) return { error: "invalid_auth", status: 401 };

  const db = createClient(Deno.env.get("SUPABASE_URL")!, secret, {
    auth: { persistSession: false },
  });
  const { data: admin } = await db
    .from("bvss_admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) return { error: "not_authorized", status: 403 };
  return { db, user, role: admin.role };
}

function norm(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function targetProjection(playlist: any, artistTags: string[]) {
  const blockers: string[] = [];
  const reasons: string[] = [];

  if (playlist.lifecycle_state !== "active") blockers.push("Playlist is not active");
  if (playlist.submission_status !== "open") blockers.push("Submissions are not open");
  if (playlist.network_routing_enabled !== true) blockers.push("Network routing is disabled");
  if (playlist.verification_status !== "verified") blockers.push("Playlist is not verified");
  if (playlist.middle_child_eligible !== true) blockers.push("Not marked Middle Child eligible");

  const targetTags = [
    playlist.primary_genre,
    ...(playlist.secondary_genres || []),
    ...(playlist.moods || []),
  ].map(norm).filter(Boolean);

  const normalizedArtistTags = artistTags.map(norm).filter(Boolean);
  const overlaps = normalizedArtistTags.filter((tag) =>
    targetTags.some((target) => target === tag || target.includes(tag) || tag.includes(target))
  );

  if (playlist.middle_child_eligible) reasons.push("Marked Middle Child eligible");
  if (overlaps.length) reasons.push("Genre / mood overlap: " + overlaps.join(", "));
  if (playlist.submission_status === "open") reasons.push("Open for submissions");
  if (playlist.network_routing_enabled) reasons.push("Routing enabled");
  if (playlist.verification_status === "verified") reasons.push("Verified BVSS playlist");
  if (playlist.current_follower_count != null) reasons.push("Follower count measured");

  // Deterministic, inspectable alignment score — not an ML prediction.
  let score = 0;
  if (playlist.middle_child_eligible) score += 35;
  score += Math.min(30, overlaps.length * 10);
  if (playlist.submission_status === "open") score += 10;
  if (playlist.network_routing_enabled) score += 10;
  if (playlist.verification_status === "verified") score += 10;
  if (playlist.current_follower_count != null) score += 5;

  return {
    id: "tgt-bvss-" + playlist.id,
    target_source: playlist.network_owner_type === "partner" ? "bvss_partner_playlist" : "bvss_playlist",
    name: playlist.canonical_name,
    url: playlist.spotify_url,
    channel: "playlist",
    genres: [playlist.primary_genre, ...(playlist.secondary_genres || [])].filter(Boolean),
    moods: playlist.moods || [],
    audience_count: playlist.current_follower_count,
    audience_label: playlist.current_follower_count == null
      ? null
      : Number(playlist.current_follower_count).toLocaleString("en-US") + " followers",
    submission_rules: playlist.submission_criteria || null,
    status: playlist.submission_status,
    playlist_id: playlist.id,
    network_owner_type: playlist.network_owner_type,
    verification_status: playlist.verification_status,
    follower_count_source: playlist.follower_count_source,
    follower_count_observed_at: playlist.follower_count_observed_at,
    updated_at: playlist.updated_at,
    eligibility: blockers.length ? "blocked" : "eligible",
    blockers,
    fit_reasons: reasons,
    alignment_score: Math.min(100, score),
    score_basis: "Deterministic ArtistOS artist-tag overlap + BVSS eligibility/readiness signals",
    authority: "source-of-record",
    provenance: "bvss",
  };
}

function campaignConflicts(campaign: any, release: any) {
  const conflicts: any[] = [];
  if (!campaign) {
    conflicts.push({
      severity: "info",
      code: "campaign_missing",
      title: "No ArtistOS campaign record",
      detail: "The selected release has no campaign row in ArtistOS.",
    });
    return conflicts;
  }

  if (campaign.status === "active" && campaign.end_date) {
    const end = new Date(campaign.end_date + "T23:59:59Z");
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
      conflicts.push({
        severity: "warning",
        code: "active_after_end_date",
        title: "Campaign status is still active after its end date",
        detail: "ArtistOS says active, but the recorded end date is " + campaign.end_date + ". One Campaign preserves both facts instead of guessing.",
      });
    }
  }

  if (!campaign.start_date) {
    conflicts.push({
      severity: "info",
      code: "campaign_start_missing",
      title: "Campaign start date is missing",
      detail: "ArtistOS has no start date for this campaign.",
    });
  }

  if (!release?.spotify_url) {
    conflicts.push({
      severity: "info",
      code: "release_spotify_missing",
      title: "Spotify URL is missing",
      detail: "The selected release has no Spotify URL in ArtistOS.",
    });
  }

  return conflicts;
}

async function payload(db: any, requestedReleaseId: string | null) {
  const { data: artist, error: artistError } = await db
    .from("artists")
    .select("id,workspace_id,name,aliases,genre_tags,spotify_url,created_at")
    .eq("name", "Middle Child")
    .maybeSingle();
  if (artistError) throw artistError;
  if (!artist) throw new Error("middle_child_artist_not_found");

  const [{ data: releases, error: releaseError }, { data: playlists, error: playlistError }] = await Promise.all([
    db.from("releases")
      .select("id,artist_id,title,featured_artist,release_date,distributor,label,isrc,upc,status,spotify_url,created_at,workspace_id")
      .eq("artist_id", artist.id)
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    db.from("bvss_playlists")
      .select("id,slug,spotify_playlist_id,spotify_url,canonical_name,primary_genre,secondary_genres,moods,current_follower_count,follower_count_source,follower_count_observed_at,submission_status,submission_criteria,lifecycle_state,middle_child_eligible,network_owner_type,verification_status,network_routing_enabled,updated_at")
      .eq("lifecycle_state", "active")
      .order("display_order", { ascending: true }),
  ]);
  if (releaseError) throw releaseError;
  if (playlistError) throw playlistError;

  const releaseIds = (releases || []).map((row: any) => row.id);
  let campaigns: any[] = [];
  if (releaseIds.length) {
    const { data, error } = await db
      .from("campaigns")
      .select("id,release_id,name,status,start_date,end_date,goals,created_at,workspace_id")
      .in("release_id", releaseIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    campaigns = data || [];
  }

  let selectedRelease = requestedReleaseId
    ? (releases || []).find((row: any) => row.id === requestedReleaseId)
    : null;

  if (!selectedRelease) {
    const campaignRelease = campaigns.find((row: any) => row.status === "active")?.release_id
      || campaigns[0]?.release_id;
    selectedRelease = (releases || []).find((row: any) => row.id === campaignRelease)
      || (releases || [])[0]
      || null;
  }

  if (!selectedRelease) throw new Error("middle_child_release_not_found");

  const selectedCampaign = campaigns.find((row: any) => row.release_id === selectedRelease.id) || null;

  const [
    { data: artistEvidence, error: artistEvidenceError },
    { data: releaseEvidence, error: releaseEvidenceError },
    { data: placements, error: placementError },
  ] = await Promise.all([
    db.from("evidence_records")
      .select("id,artist_id,release_id,campaign_id,evidence_type,source_type,source_uri,confidence,confidence_score,observed_at,captured_at,verification_level,verification_status,contradiction_state")
      .eq("artist_id", artist.id)
      .order("observed_at", { ascending: false })
      .limit(100),
    db.from("evidence_records")
      .select("id,artist_id,release_id,campaign_id,evidence_type,source_type,source_uri,confidence,confidence_score,observed_at,captured_at,verification_level,verification_status,contradiction_state")
      .eq("release_id", selectedRelease.id)
      .order("observed_at", { ascending: false })
      .limit(100),
    db.from("playlist_placements")
      .select("id,release_id,platform_id,playlist_name,playlist_url,external_playlist_id,followers,track_position,added_at,removed_at,source_type,confidence,risk_state,verification_state,last_verified_at,created_at,updated_at")
      .eq("release_id", selectedRelease.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (artistEvidenceError) throw artistEvidenceError;
  if (releaseEvidenceError) throw releaseEvidenceError;
  if (placementError) throw placementError;

  const evidenceById = new Map<string, any>();
  for (const row of [...(artistEvidence || []), ...(releaseEvidence || [])]) {
    evidenceById.set(row.id, row);
  }
  const evidence = Array.from(evidenceById.values())
    .sort((a, b) => String(b.observed_at || "").localeCompare(String(a.observed_at || "")));

  let nativeCampaignTargets: any[] = [];
  let nativeSubmissions: any[] = [];
  if (selectedCampaign) {
    const [{ data: targets, error: targetError }, { data: submissions, error: submissionError }] = await Promise.all([
      db.from("campaign_targets")
        .select("id,campaign_id,target_kind,target_id,status,added_at,updated_at,notes")
        .eq("campaign_id", selectedCampaign.id)
        .order("added_at"),
      db.from("campaign_submissions")
        .select("id,campaign_id,release_id,campaign_target_id,property_id,professional_profile_id,submission_mode,status,match_score,match_reasons,response_due_at,submitted_at,completed_at,created_at,updated_at")
        .eq("campaign_id", selectedCampaign.id)
        .order("created_at"),
    ]);
    if (targetError) throw targetError;
    if (submissionError) throw submissionError;
    nativeCampaignTargets = targets || [];
    nativeSubmissions = submissions || [];
  }

  const internalTargets = (playlists || [])
    .map((playlist: any) => targetProjection(playlist, artist.genre_tags || []))
    .sort((a: any, b: any) =>
      Number(b.eligibility === "eligible") - Number(a.eligibility === "eligible")
      || b.alignment_score - a.alignment_score
      || Number(b.audience_count || 0) - Number(a.audience_count || 0)
      || a.name.localeCompare(b.name)
    );

  const conflicts = campaignConflicts(selectedCampaign, selectedRelease);
  const eligibleTargets = internalTargets.filter((row: any) => row.eligibility === "eligible").length;
  const verifiedEvidence = evidence.filter((row: any) => row.verification_status === "verified").length;
  const livePlacements = (placements || []).filter((row: any) => !row.removed_at).length;

  return {
    generated_at: new Date().toISOString(),
    mode: "read_only",
    write_actions_enabled: false,
    artist,
    releases: releases || [],
    release: selectedRelease,
    campaign: selectedCampaign,
    campaign_authority: {
      source_system: "artistos",
      verdict: "PARTIALLY AUTHORITATIVE",
      note: "ArtistOS provides the readable campaign record. One Campaign does not create or mutate campaign authority in this test build.",
    },
    conflicts,
    summary: {
      internal_targets: internalTargets.length,
      eligible_internal_targets: eligibleTargets,
      external_targets: 0,
      evidence_records: evidence.length,
      verified_evidence_records: verifiedEvidence,
      placements: (placements || []).length,
      live_placements: livePlacements,
      native_campaign_targets: nativeCampaignTargets.length,
      native_campaign_submissions: nativeSubmissions.length,
    },
    source_health: [
      {
        system: "BVSS",
        status: "authoritative",
        detail: internalTargets.length + " active playlist targets loaded from bvss_playlists.",
      },
      {
        system: "ArtistOS",
        status: "partial",
        detail: "Artist, release, campaign, evidence and placement reads are live; the overall authority verdict remains PARTIALLY AUTHORITATIVE.",
      },
      {
        system: "CuratorFit",
        status: "design-dormant",
        detail: "No live CuratorFit database is connected. External target discovery is intentionally empty instead of fabricated.",
      },
    ],
    targets: internalTargets,
    external_targets: [],
    external_target_state: {
      status: "design-dormant",
      reason: "CuratorFit has no live deployed database. Connect a real source before external targets appear here.",
    },
    evidence,
    placements: placements || [],
    native_lifecycle: {
      campaign_targets: nativeCampaignTargets,
      campaign_submissions: nativeSubmissions,
    },
  };
}

Deno.serve(async (req) => {
  const h = headers(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: h });
  }

  try {
    const a: any = await auth(req);
    if (a.error) return new Response(JSON.stringify({ error: a.error }), { status: a.status, headers: h });

    const url = new URL(req.url);
    const releaseId = (url.searchParams.get("release_id") || "").trim() || null;
    if (releaseId && !/^[0-9a-f-]{36}$/i.test(releaseId)) {
      return new Response(JSON.stringify({ error: "invalid_release_id" }), { status: 400, headers: h });
    }

    return new Response(JSON.stringify(await payload(a.db, releaseId)), { headers: h });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "one_campaign_unavailable",
        detail: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: h },
    );
  }
});
