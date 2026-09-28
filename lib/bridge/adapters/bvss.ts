/**
 * BVSS read-only adapter (Architecture Pack §7.1).
 *
 * Reads playlists, curator directory, track lookup, and tokenized
 * submission status from the deployed BVSS edge functions, and normalizes
 * rows into the bridge contract with full provenance.
 *
 * ── READ-ONLY GUARANTEE ──────────────────────────────────────────────
 * Every function in this module issues HTTP GET and nothing else. There
 * are no POST / PUT / PATCH / DELETE calls, no Supabase client mutations,
 * no RPC invocations, and no writes of any kind. Admin-mutating edge
 * function actions (`review`, `record_metric`, `add_playlist`,
 * `set_playlist_status`, `mark_updated`) are never called here — the
 * bvss-admin / bvss-curator / bvss-network-admin functions are entirely
 * out of scope for tranche one.
 *
 * Endpoint coverage (empirical audit 2026-09-28, edge-function-audit.md):
 * - bvss-playlists        GET / , /?slug=          intentionally public
 * - bvss-curators-public  GET / , /?handle=        intentionally public
 * - bvss-track-lookup     GET /?q= , /?url=        intentionally public
 * - bvss-submission-status GET /?token=            tokenized-public status
 *
 * Metric snapshots and placements have no public endpoint; their
 * normalizers below accept server-side rows (service_role reads stay
 * server-side per §7.2) and are never fetched from the client.
 */

// Mechanical server-only guard: importing this module from a Client
// Component throws at evaluation time. See ../server-only.ts.
import '../server-only';

import {
  makeProvenance,
  mapNativeStatus,
  normalize,
  submissionWithUnknownStatus,
} from '../../bridge-contract';
import type {
  Curator,
  Metric,
  Normalized,
  NormalizedStatus,
  Placement,
  Playlist,
  PromotionTarget,
  Provenance,
  SubmissionPitch,
  Track,
} from '../../bridge-contract';
import { playlistApiBase } from '../../playlist-os';
import type {
  PlaylistRecord,
  PlaylistTrack,
} from '../../playlist-os';
import type {
  PublicCurator,
  PublicCuratorPlaylist,
} from '../../curator-network';

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class BvssAdapterError extends Error {
  readonly status?: number;
  readonly endpoint: string;
  constructor(endpoint: string, message: string, status?: number) {
    super(`BVSS adapter: ${endpoint}: ${message}`);
    this.name = 'BvssAdapterError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

async function getJson(baseUrl: string, path: string): Promise<unknown> {
  const endpoint = `${baseUrl}${path}`;
  let response: Response;
  try {
    // GET only — this adapter never sends a body or a state-changing method.
    response = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
  } catch (cause) {
    throw new BvssAdapterError(path, `network failure: ${String(cause)}`);
  }
  if (!response.ok) {
    throw new BvssAdapterError(path, `HTTP ${response.status}`, response.status);
  }
  return response.json() as Promise<unknown>;
}

/* ------------------------------------------------------------------ */
/* Playlists — via the bvss-playlists edge function (public GET).      */
/* ------------------------------------------------------------------ */

export function normalizePlaylist(
  record: PlaylistRecord,
  sourceRef = 'bvss-playlists',
): Normalized<Playlist> {
  return normalize<Playlist>(
    {
      id: record.id,
      slug: record.slug,
      spotify_playlist_id: record.spotify_playlist_id,
      spotify_url: record.spotify_url,
      canonical_name: record.canonical_name,
      primary_genre: record.primary_genre,
      secondary_genres: record.secondary_genres,
      moods: record.moods,
      anchor_artists: record.anchor_artists,
      follower_count: record.current_follower_count ?? undefined,
      follower_count_source: record.follower_count_source ?? undefined,
      follower_count_observed_at: record.follower_count_observed_at ?? undefined,
      track_count: record.current_track_count ?? undefined,
      submission_status: record.submission_status,
      update_cadence: record.update_cadence,
      middle_child_eligible: record.middle_child_eligible,
      subflower_eligible: record.subflower_eligible,
      lifecycle_state: record.lifecycle_state,
      network_owner_type: record.network_owner_type,
      curator_id: record.curator_id ?? undefined,
      verification_status: record.verification_status,
    },
    makeProvenance({
      source_system: 'bvss',
      source_id: record.id,
      source_ref: sourceRef,
      authority: 'source-of-record',
      updated_at: record.updated_at,
    }),
    record as unknown as Record<string, unknown>,
  );
}

/** GET /bvss-playlists — the full registry. */
export async function fetchPlaylists(
  baseUrl: string = playlistApiBase,
): Promise<Normalized<Playlist>[]> {
  const body = (await getJson(baseUrl, '/bvss-playlists')) as {
    playlists?: PlaylistRecord[];
  };
  return (body.playlists ?? []).map((record) => normalizePlaylist(record));
}

/** GET /bvss-playlists?slug= — one playlist plus its track highlights. */
export async function fetchPlaylistDetail(
  slug: string,
  baseUrl: string = playlistApiBase,
): Promise<{ playlist: Normalized<Playlist>; tracks: Normalized<Track>[] }> {
  const body = (await getJson(
    baseUrl,
    `/bvss-playlists?slug=${encodeURIComponent(slug)}`,
  )) as { playlist?: PlaylistRecord; highlights?: PlaylistTrack[] };
  if (!body.playlist) {
    throw new BvssAdapterError('/bvss-playlists', `unknown slug: ${slug}`, 404);
  }
  return {
    playlist: normalizePlaylist(body.playlist),
    tracks: (body.highlights ?? []).map((track) =>
      normalize<Track>(
        {
          // Contract-level assembly: no canonical track table exists
          // (confirmed 404 live 2026-09-28) — authority stays unresolved.
          id: track.spotify_track_id,
          title: track.track_name ?? 'Unknown title',
          // Playlist highlights carry a native `artists: string[]`
          // (repo type PlaylistTrack). Joined into the display credit —
          // never into `tags`, which are genre/mood descriptors for
          // future fit logic. The native array is preserved in `raw`.
          artist_credit: track.artists.join(', ') || undefined,
          spotify_track_id: track.spotify_track_id,
          spotify_url: track.spotify_url ?? undefined,
        },
        makeProvenance({
          source_system: 'bvss',
          source_id: track.spotify_track_id,
          source_ref: 'bvss-playlists?slug=',
          authority: 'unresolved',
          note: 'track highlight; no canonical track table',
        }),
        track as unknown as Record<string, unknown>,
      ),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Curators — via the bvss-curators-public edge function (public GET).  */
/* Response stats are the working mini-CRM history; live 2026-09-28    */
/* the underlying tables are schema-only, so stats may be zero.        */
/* ------------------------------------------------------------------ */

export function normalizeCurator(
  record: PublicCurator,
): Normalized<Curator> {
  return normalize<Curator>(
    {
      id: record.curator_id,
      handle: record.handle,
      display_name: record.display_name,
      bio: record.bio ?? undefined,
      website_url: record.website_url ?? undefined,
      spotify_profile_url: record.spotify_profile_url ?? undefined,
      social_links: record.social_links,
      genres: record.genres,
      moods: record.moods,
      verified_playlist_count: record.verified_playlist_count,
      reviews_completed: record.reviews_completed,
      accepted_count: record.accepted_count,
      rejected_count: record.rejected_count,
      held_count: record.held_count,
      median_response_hours: record.median_response_hours ?? undefined,
      active_placements: record.active_placements,
      curator_side: 'bvss_internal',
    },
    makeProvenance({
      source_system: 'bvss',
      source_id: record.curator_id,
      source_ref: 'bvss-curators-public',
      authority: 'source-of-record',
    }),
    record as unknown as Record<string, unknown>,
  );
}

/** GET /bvss-curators-public — the public curator directory. */
export async function fetchPublicCurators(
  baseUrl: string = playlistApiBase,
): Promise<Normalized<Curator>[]> {
  const body = (await getJson(baseUrl, '/bvss-curators-public')) as {
    curators?: PublicCurator[];
  };
  return (body.curators ?? []).map(normalizeCurator);
}

/** Normalize a curator's playlist from the public directory shape —
 *  maps only the fields the endpoint returns; the rest stay undefined. */
export function normalizePublicCuratorPlaylist(
  record: PublicCuratorPlaylist,
): Normalized<Playlist> {
  return normalize<Playlist>(
    {
      id: record.id,
      slug: record.slug,
      spotify_playlist_id: record.spotify_playlist_id,
      spotify_url: record.spotify_url,
      canonical_name: record.canonical_name,
      primary_genre: record.primary_genre,
      secondary_genres: record.secondary_genres,
      moods: record.moods,
      anchor_artists: record.anchor_artists,
      submission_status: record.submission_status,
      update_cadence: record.update_cadence,
      network_owner_type: 'partner',
      curator_id: record.curator_id,
    },
    makeProvenance({
      source_system: 'bvss',
      source_id: record.id,
      source_ref: 'bvss-curators-public',
      authority: 'source-of-record',
    }),
    record as unknown as Record<string, unknown>,
  );
}

/** GET /bvss-curators-public?handle= — one curator plus their playlists. */
export async function fetchPublicCurator(
  handle: string,
  baseUrl: string = playlistApiBase,
): Promise<{ curator: Normalized<Curator>; playlists: Normalized<Playlist>[] }> {
  const body = (await getJson(
    baseUrl,
    `/bvss-curators-public?handle=${encodeURIComponent(handle)}`,
  )) as { curator?: PublicCurator; playlists?: PublicCuratorPlaylist[] };
  if (!body.curator) {
    throw new BvssAdapterError(
      '/bvss-curators-public',
      `unknown handle: ${handle}`,
      404,
    );
  }
  return {
    curator: normalizeCurator(body.curator),
    playlists: (body.playlists ?? []).map(normalizePublicCuratorPlaylist),
  };
}

/* ------------------------------------------------------------------ */
/* Track lookup — via bvss-track-lookup (public GET). Resolves a       */
/* query/URL to a contract-level Track (authority unresolved).        */
/* Response shape confirmed against the repo's own client type         */
/* (SubmissionForm.tsx): singular `artist_name`, plus artwork,         */
/* release date, explicit flag, album name — no `artists: string[]`.   */
/* ------------------------------------------------------------------ */

interface TrackLookupHit {
  spotify_track_id?: string;
  title?: string;
  track_name?: string;
  artist_name?: string | null;
  artwork_url?: string | null;
  release_date?: string | null;
  is_explicit?: boolean | null;
  album_name?: string | null;
  spotify_url?: string;
}

export async function fetchTrackLookup(
  query: string,
  baseUrl: string = playlistApiBase,
): Promise<Normalized<Track>[]> {
  const body = (await getJson(
    baseUrl,
    `/bvss-track-lookup?q=${encodeURIComponent(query)}`,
  )) as { tracks?: TrackLookupHit[]; results?: TrackLookupHit[] };
  const hits = body.tracks ?? body.results ?? [];
  return hits
    .filter((hit) => hit.spotify_track_id ?? hit.title ?? hit.track_name)
    .map((hit) =>
      normalize<Track>(
        {
          id: hit.spotify_track_id ?? `lookup-${hit.title ?? hit.track_name}`,
          title: hit.title ?? hit.track_name ?? 'Unknown title',
          // Artist credit is a singular display string — never `tags`.
          artist_credit: hit.artist_name ?? undefined,
          spotify_track_id: hit.spotify_track_id,
          spotify_url: hit.spotify_url,
        },
        makeProvenance({
          source_system: 'bvss',
          source_id: hit.spotify_track_id ?? hit.title ?? hit.track_name ?? query,
          source_ref: 'bvss-track-lookup',
          authority: 'unresolved',
          note: 'shape confirmed against repo client type; no canonical track table',
        }),
        hit as unknown as Record<string, unknown>,
      ),
    );
}

/* ------------------------------------------------------------------ */
/* Submission status — via bvss-submission-status (tokenized GET).     */
/* The token is artist-scoped; the response schema is unconfirmed, so  */
/* tranche one returns the payload verbatim with provenance rather     */
/* than forcing it into SubmissionPitch. BVSS submission mapping      */
/* (repo-inferred statuses waiting|accepted|held|rejected) is applied */
/* by mapBvssSubmissionStatus once rows exist.                         */
/* ------------------------------------------------------------------ */

export async function fetchSubmissionStatus(
  token: string,
  baseUrl: string = playlistApiBase,
): Promise<Normalized<unknown>> {
  const payload = await getJson(
    baseUrl,
    `/bvss-submission-status?token=${encodeURIComponent(token)}`,
  );
  return normalize<unknown>(
    payload,
    makeProvenance({
      source_system: 'bvss',
      source_id: 'tokenized-status',
      source_ref: 'bvss-submission-status',
      authority: 'source-of-record',
      note: 'tokenized artist-facing status; schema unconfirmed — not mapped to SubmissionPitch in tranche one',
    }),
    { token_present: true },
  );
}

/**
 * Map a BVSS-native submission status to the normalized lifecycle.
 * BVSS statuses are repo-inferred (waiting|accepted|held|rejected) and
 * unconfirmed live 2026-09-28 — returns undefined for anything else.
 */
export function mapBvssSubmissionStatus(
  native: string,
): NormalizedStatus | undefined {
  return mapNativeStatus(native, 'bvss');
}

/**
 * Build a SubmissionPitch from a BVSS-native submission row once rows
 * exist (0 rows live 2026-09-28). Unmapped statuses surface as `unknown`
 * with the native value preserved — never guessed.
 */
export function normalizeBvssSubmission(input: {
  id: string;
  target_id: string;
  status_native: string;
  campaign_id?: string;
  track_id?: string;
  submitted_at?: string;
  raw?: Record<string, unknown>;
}): Normalized<SubmissionPitch> {
  const mapped = mapNativeStatus(input.status_native, 'bvss');
  if (mapped === undefined) {
    return submissionWithUnknownStatus({
      ...input,
      provenance: makeProvenance({
        source_system: 'bvss',
        source_id: input.id,
        source_ref: 'bvss_submissions',
        authority: 'source-of-record',
      }),
    });
  }
  return normalize<SubmissionPitch>(
    {
      id: input.id,
      campaign_id: input.campaign_id,
      target_id: input.target_id,
      track_id: input.track_id,
      status_normalized: mapped,
      status_native: input.status_native,
      submitted_at: input.submitted_at,
    },
    makeProvenance({
      source_system: 'bvss',
      source_id: input.id,
      source_ref: 'bvss_submissions',
      authority: 'source-of-record',
    }),
    input.raw,
  );
}

/* ------------------------------------------------------------------ */
/* Metric snapshots — server-side rows only. Live columns confirmed    */
/* 2026-09-28: id, playlist_id, metric_date, followers, track_count,  */
/* source, source_ref, raw_data, observed_at. No public endpoint      */
/* covers these; reads go through a server-side PostgREST client      */
/* (service_role, §7.2) and are passed in here for normalization.     */
/* ------------------------------------------------------------------ */

export interface BvssMetricSnapshotRow {
  id: string;
  playlist_id: string;
  metric_date: string;
  followers: number | null;
  track_count: number | null;
  source: string;
  source_ref?: string | null;
  observed_at: string;
}

/** One snapshot row → one Metric per populated measure. */
export function normalizeMetricSnapshot(
  row: BvssMetricSnapshotRow,
): Normalized<Metric>[] {
  // Provenance cleanup: source_id is the native row ID; the normalized
  // Metric id carries the `:followers` / `:track_count` suffix.
  const provenance = (measure: string): Provenance =>
    makeProvenance({
      source_system: 'bvss',
      source_id: row.id,
      source_ref: 'bvss_playlist_metric_snapshots',
      authority: 'source-of-record',
      updated_at: row.observed_at,
      note:
        row.source === 'soundcharts'
          ? `measure: ${measure}`
          : `source: ${row.source}; measure: ${measure}`,
    });
  const out: Normalized<Metric>[] = [];
  if (row.followers !== null) {
    out.push(
      normalize<Metric>(
        {
          id: `${row.id}:followers`,
          subject_type: 'playlist',
          subject_id: row.playlist_id,
          metric_name: 'followers',
          metric_date: row.metric_date,
          value: row.followers,
          source: row.source,
          observed_at: row.observed_at,
        },
        provenance('followers'),
        { source_ref: row.source_ref ?? undefined },
      ),
    );
  }
  if (row.track_count !== null) {
    out.push(
      normalize<Metric>(
        {
          id: `${row.id}:track_count`,
          subject_type: 'playlist',
          subject_id: row.playlist_id,
          metric_name: 'track_count',
          metric_date: row.metric_date,
          value: row.track_count,
          source: row.source,
          observed_at: row.observed_at,
        },
        provenance('track_count'),
        { source_ref: row.source_ref ?? undefined },
      ),
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Placements — `bvss_playlist_placements` is schema-only (0 rows     */
/* live 2026-09-28), so this normalizer is defensive: it maps only    */
/* fields present on the row and leaves the rest undefined. Revisit   */
/* once the first placement rows land.                                */
/* ------------------------------------------------------------------ */

export function normalizePlacementRow(
  row: Record<string, unknown>,
): Normalized<Placement> {
  const str = (key: string): string | undefined =>
    typeof row[key] === 'string' ? (row[key] as string) : undefined;
  const num = (key: string): number | undefined =>
    typeof row[key] === 'number' ? (row[key] as number) : undefined;
  const id = str('id') ?? 'unknown-placement';
  return normalize<Placement>(
    {
      id,
      playlist_id: str('playlist_id'),
      playlist_name: str('playlist_name'),
      external_playlist_id: str('external_playlist_id'),
      track_id: str('track_id'),
      release_id: str('release_id'),
      track_position: num('track_position'),
      added_at: str('added_at'),
      removed_at: str('removed_at'),
      follower_count_at_placement: num('follower_count_at_placement'),
      evidence_uri: str('evidence_uri'),
      verification_state: str('verification_state'),
    },
    makeProvenance({
      source_system: 'bvss',
      source_id: id,
      source_ref: 'bvss_playlist_placements',
      authority: 'source-of-record',
      updated_at: str('updated_at'),
      note: 'placement schema unconfirmed — 0 rows live 2026-09-28',
    }),
    row,
  );
}

/* ------------------------------------------------------------------ */
/* PromotionTarget projection — the unified campaign universe (§4.2).  */
/* Deterministic reshape of source-of-record playlist facts, so the   */
/* authority is `derived` and the label is `inferred` (§5).            */
/* ------------------------------------------------------------------ */

export function promotionTargetForPlaylist(
  playlist: Normalized<Playlist>,
): Normalized<PromotionTarget> {
  const data = playlist.data;
  const genres = [
    ...(data.primary_genre ? [data.primary_genre] : []),
    ...(data.secondary_genres ?? []),
  ];
  const audience_label =
    data.follower_count !== undefined
      ? `${data.follower_count.toLocaleString('en-US')} followers`
      : undefined;
  const raw = playlist.raw ?? {};
  const submission_criteria =
    typeof raw['submission_criteria'] === 'string'
      ? (raw['submission_criteria'] as string)
      : undefined;
  return normalize<PromotionTarget>(
    {
      id: `tgt-bvss-${data.id}`,
      target_source:
        data.network_owner_type === 'partner'
          ? 'bvss_partner_playlist'
          : 'bvss_playlist',
      name: data.canonical_name,
      url: data.spotify_url,
      channel: 'playlist',
      genres,
      moods: data.moods,
      audience_label,
      audience_count: data.follower_count,
      submission_rules: submission_criteria,
      status: data.submission_status ?? 'unknown',
      playlist_id: data.id,
    },
    makeProvenance({
      source_system: 'bvss',
      source_id: `tgt-bvss-${data.id}`,
      source_ref: 'bvss adapter (derived from bvss-playlists)',
      authority: 'derived',
      provenance: 'inferred',
      updated_at: playlist.provenance.updated_at,
      note: 'deterministic projection of the playlist record',
    }),
  );
}
