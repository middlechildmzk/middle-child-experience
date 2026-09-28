/**
 * Canonical read-contract entities for the One Campaign pilot
 * (Architecture Pack §4.2).
 *
 * Minimal-viable shapes for tranche one. Fields not verifiable against live
 * systems stay optional. No invented fields: BVSS shapes come from the
 * repo's own TypeScript types (lib/playlist-os.ts, lib/curator-network.ts)
 * and live PostgREST column confirmation 2026-09-28; CuratorFit shapes from
 * supabase/schema.sql; ArtistOS shapes from repo migration files.
 *
 * Pure types only — zero runtime dependencies.
 */

import type { NormalizedStatus } from './provenance';

/* ------------------------------------------------------------------ */
/* Artist — source: ArtistOS `artists` (PARTIALLY AUTHORITATIVE, §1).   */
/* Pilot scope: Middle Child only.                                      */
/* ------------------------------------------------------------------ */
export interface Artist {
  /** Contract id (artistos.artists.id). */
  id: string;
  /** e.g. "Middle Child". */
  name: string;
  aliases?: string[];
  genre_tags?: string[];
  spotify_url?: string;
  // NOTE (live 2026-09-28): artists has NO spotify_artist_id column —
  // do not add until the column exists. spotify_url is the live anchor.
  workspace_id?: string;
}

/* ------------------------------------------------------------------ */
/* Release — source: ArtistOS `releases`.                              */
/* ------------------------------------------------------------------ */
export interface Release {
  id: string;
  /** → Artist.id */
  artist_id: string;
  /** The pilot single — title TBD; do NOT assume "Never Alone". */
  title: string;
  featured_artist?: string;
  /** ISO date; unknown until announced. */
  release_date?: string;
  distributor?: string;
  /** Live 2026-09-28: "BVSS FVM" on both releases. */
  label?: string;
  isrc?: string;
  upc?: string;
  /** Native ArtistOS status, preserved verbatim. */
  status?: string;
}

/* ------------------------------------------------------------------ */
/* Track — NO canonical track table exists in any system (confirmed    */
/* 404 via PostgREST 2026-09-28). Contract-level assembly; authority   */
/* is always `unresolved`.                                             */
/* ------------------------------------------------------------------ */
export interface Track {
  /** Contract id; stable within the pilot. */
  id: string;
  /** → Release.id, when known. */
  release_id?: string;
  title: string;
  /**
   * Display artist credit. bvss-track-lookup returns a singular
   * `artist_name` string (verified against the repo's SubmissionForm
   * client type 2026-09-28) — it does NOT return `artists: string[]`.
   * Never put artist data in `tags`: tags are genre/mood descriptors
   * and artist names there would contaminate future fit logic.
   */
  artist_credit?: string | null;
  isrc?: string;
  /** cf. ArtistOS release_platform_links.external_track_id */
  spotify_track_id?: string;
  spotify_url?: string;
  /** cf. CuratorFit tracks.track_url (private stream) */
  track_url?: string;
  /** cf. CuratorFit tracks.hook_timestamp_seconds */
  hook_timestamp_seconds?: number;
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* Campaign — source: ArtistOS `campaigns` (PARTIALLY AUTHORITATIVE,   */
/* §1; ledger reconciliation pending). CuratorFit-shaped fallback      */
/* kept in the contract until the verdict lands.                       */
/* ------------------------------------------------------------------ */
export interface Campaign {
  id: string;
  /** → Release.id */
  release_id?: string;
  /** → Track.id (CuratorFit-shaped when fallback) */
  track_id?: string;
  /** e.g. "Middle Child — [single] — One Campaign pilot" */
  name: string;
  /** Native status preserved verbatim; see §4.3. */
  status: string;
  goal?: string;
}

/* ------------------------------------------------------------------ */
/* PromotionTarget — the unified campaign universe: one list spanning  */
/* internal BVSS playlists and CuratorFit external targets.            */
/* ------------------------------------------------------------------ */
export type TargetSource =
  | 'bvss_playlist'
  | 'bvss_partner_playlist'
  | 'curatorfit_external';

export interface PromotionTarget {
  /** Contract id. */
  id: string;
  target_source: TargetSource;
  name: string;
  url?: string;
  /** playlist | blog | youtube_channel | radio | tiktok_creator |
   *  instagram_creator | newsletter | community | label | sync_library | … */
  channel: string;
  genres?: string[];
  moods?: string[];
  /** Display string, e.g. "9.9k followers". */
  audience_label?: string;
  /** Numeric when the source provides it. */
  audience_count?: number;
  contact_method?: string;
  submission_rules?: string;
  fit_notes?: string;
  /**
   * Source-native trust/risk facts. These describe the target, not the
   * bridge source itself, so trust_score must never be copied into
   * Provenance.confidence.
   */
  trust_score?: number;
  risk_level?: string;
  risk_notes?: string;
  verification_notes?: string;
  last_reviewed_at?: string;
  last_checked_at?: string;
  /** Native target status preserved verbatim. */
  status: string;
  /** → Playlist.id when target_source is bvss_*. */
  playlist_id?: string;
  /** → CuratorFit promotion_targets id/slug. */
  external_ref?: string;
}

/* ------------------------------------------------------------------ */
/* Playlist — source: `bvss_playlists` via the bvss-playlists edge     */
/* function (intentionally public, GET 200 — probed live 2026-09-28)   */
/* or direct read. AUTHORITATIVE (§1).                                 */
/* ------------------------------------------------------------------ */
export interface Playlist {
  id: string;
  slug: string;
  spotify_playlist_id?: string;
  spotify_url?: string;
  canonical_name: string;
  primary_genre?: string;
  secondary_genres?: string[];
  moods?: string[];
  anchor_artists?: string[];
  /** cf. current_follower_count */
  follower_count?: number;
  /** e.g. "soundcharts" | "manual" */
  follower_count_source?: string;
  follower_count_observed_at?: string;
  track_count?: number;
  submission_status?: 'open' | 'paused' | 'closed';
  update_cadence?: string;
  /** Artist-aware flags — keep, do not re-model. */
  middle_child_eligible?: boolean;
  subflower_eligible?: boolean;
  lifecycle_state?: 'active' | 'experimental' | 'archived';
  network_owner_type?: 'bvss' | 'partner';
  /** → Curator.id */
  curator_id?: string;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
}

/* ------------------------------------------------------------------ */
/* Curator — sources: BVSS `bvss_curator_profiles` (internal network)  */
/* and CuratorFit `curator_profiles` (external registry). Shapes from  */
/* lib/curator-network.ts PublicCurator + CuratorFit schema.sql.       */
/* Live 2026-09-28: bvss_curator_profiles = 0 rows (schema-only) —    */
/* BVSS-side response stats are aspirational until rows land.          */
/* ------------------------------------------------------------------ */
export interface Curator {
  id: string;
  handle?: string;
  display_name: string;
  bio?: string;
  website_url?: string;
  spotify_profile_url?: string;
  social_links?: Record<string, string>;
  genres?: string[];
  moods?: string[];
  /** CuratorFit-side */
  accepted_genres?: string[];
  /** CuratorFit-side */
  hard_nos?: string[];
  /** BVSS-side response history (mini-CRM — preserve, do not re-derive) */
  verified_playlist_count?: number;
  reviews_completed?: number;
  accepted_count?: number;
  rejected_count?: number;
  held_count?: number;
  median_response_hours?: number;
  active_placements?: number;
  curator_side: 'bvss_internal' | 'curatorfit_external';
}

/* ------------------------------------------------------------------ */
/* SubmissionPitch — three native models, one normalized read shape.  */
/* Native lifecycles are mapped, never merged (§3).                    */
/* Live 2026-09-28: every native submission table = 0 rows — columns  */
/* and statuses below are repo-shape, unconfirmed live.                */
/* ------------------------------------------------------------------ */
export interface SubmissionPitch {
  /** Contract id. */
  id: string;
  /** → Campaign.id, when the source models it. */
  campaign_id?: string;
  /** → PromotionTarget.id */
  target_id: string;
  /** → Track.id */
  track_id?: string;
  status_normalized: NormalizedStatus;
  /** Verbatim native status — always preserved. */
  status_native: string;
  /** Native submitted_at / created_at. */
  submitted_at?: string;
  /** Kept server-side; never rendered publicly. */
  pitch_text?: string;
  response_notes?: string;
  /** Native follow-up date. */
  follow_up_at?: string;
  curator_feedback?: string;
}

/* ------------------------------------------------------------------ */
/* Outcome — derived from submission state transitions; not a new      */
/* table. Sources: BVSS reviews/status-events/placements (0 rows      */
/* live), CuratorFit pitch_status transitions (repo only), ArtistOS    */
/* `outcomes` (19 rows live) / submission_feedback (0 rows live).      */
/* ------------------------------------------------------------------ */
export interface Outcome {
  /** Contract id (derived). */
  id: string;
  /** → SubmissionPitch.id */
  submission_id: string;
  outcome_type: 'accepted' | 'declined' | 'no_response' | 'withdrawn';
  decided_at?: string;
  /** → Evidence.id, where available. */
  evidence_ref?: string;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Placement — sources: `bvss_playlist_placements` (0 rows live,      */
/* schema-only) and ArtistOS `playlist_placements` (57 rows live,     */
/* columns confirmed 2026-09-28).                                     */
/* ------------------------------------------------------------------ */
export interface Placement {
  id: string;
  /** → Playlist.id (BVSS-side) */
  playlist_id?: string;
  /** Fallback display. */
  playlist_name?: string;
  external_playlist_id?: string;
  /** → Track.id */
  track_id?: string;
  /** → Release.id */
  release_id?: string;
  track_position?: number;
  added_at?: string;
  removed_at?: string;
  follower_count_at_placement?: number;
  evidence_uri?: string;
  /** Native, preserved verbatim. */
  verification_state?: string;
}

/* ------------------------------------------------------------------ */
/* Evidence — source: ArtistOS `evidence_records` (27 rows live,      */
/* readable; no writes). BVSS operational events (track events, sync   */
/* runs) are evidence-grade inputs, referenced by URI, not copied.     */
/* ------------------------------------------------------------------ */
export interface Evidence {
  id: string;
  evidence_type: string;
  source_uri?: string;
  confidence?: number;
  content_hash?: string;
  observed_at?: string;
  supersedes_id?: string;
  revoked_at?: string;
}

/* ------------------------------------------------------------------ */
/* Relationship — aggregate read view, not a new table. Combines       */
/* ArtistOS people/organizations/interactions/relationship_signals      */
/* with BVSS curator response stats and CuratorFit response history.   */
/* Live 2026-09-28: interactions = 0 rows — per-curator history is     */
/* aspirational; the view starts from people/organizations +          */
/* placement evidence.                                                */
/* ------------------------------------------------------------------ */
export interface Relationship {
  /** Contract id (derived). */
  id: string;
  /** → Curator.id */
  curator_id?: string;
  /** → PromotionTarget.id */
  target_id?: string;
  interactions_count?: number;
  last_contacted_at?: string;
  /** BVSS-side when available. */
  median_response_hours?: number;
  /** inferred — label accordingly (§5). */
  accept_rate?: number;
  /** inferred — label accordingly (§5). */
  relationship_strength?: 'new' | 'warming' | 'warm' | 'established';
  /** suggested — label accordingly (§5). */
  next_follow_up_at?: string;
}

/* ------------------------------------------------------------------ */
/* Metric — sources: `bvss_playlist_metric_snapshots` (4,347 rows     */
/* live; columns: id, playlist_id, metric_date, followers,            */
/* track_count, source, source_ref, raw_data, observed_at),            */
/* `bvss_search_metrics` (35 rows), `bvss_web_events` (1 row),         */
/* `bvss_playlist_daily_rollup` (30 rows). Soundcharts feed confirmed  */
/* live (daily ~10:15 UTC). Metric-integrity rule: missing stays      */
/* missing; never estimated; every point carries source +             */
/* observed_at.                                                        */
/* ------------------------------------------------------------------ */
export interface Metric {
  /** Contract id (derived). */
  id: string;
  subject_type: 'playlist' | 'release' | 'campaign' | 'target';
  subject_id: string;
  /** followers | track_count | spotify_clicks | playlist_views |
   *  submit_starts | … */
  metric_name: string;
  /** Bucket date (ISO). */
  metric_date: string;
  value: number;
  /** e.g. "soundcharts" | "manual" | "bvss-event" */
  source: string;
  observed_at: string;
}
