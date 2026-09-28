/**
 * ArtistOS read-only adapter (Architecture Pack §7.1, Tranche 2).
 *
 * Reads artist / release / campaign / campaign-target / submission /
 * placement / evidence / outcome rows from the live `artistos-core`
 * PostgREST API and normalizes them into the bridge contract.
 *
 * ── AUTHORITY ────────────────────────────────────────────────────────
 * ArtistOS verdict: PARTIALLY AUTHORITATIVE — migration-ledger
 * reconciliation is still open (owned by the integration lane). Per-entity:
 *   artists, releases, playlist_placements, evidence_records
 *       → `source-of-record` (real rows, readable), label `imported`
 *   campaigns, campaign_targets, campaign_submissions, outcomes
 *       → `unresolved`. Campaign identity for the pilot lives in
 *         lib/bridge/pilot-manifest.ts, NOT here. The submission path is
 *         schema-only (0 rows live 2026-09-28).
 * Nothing here promotes a record to `verified`, even when ArtistOS's own
 * native column says "verified" — that value is preserved verbatim.
 *
 * ── READ-ONLY GUARANTEE ──────────────────────────────────────────────
 * All reads go through ../postgrest-read (HTTP GET, explicit column list).
 * No supabase-js client, no RPC, no insert/update/upsert/delete. Enforced
 * in CI by scripts/check-bridge-readonly.mjs.
 *
 * ── CONFIG ───────────────────────────────────────────────────────────
 * ARTISTOS_SUPABASE_URL (defaults to the artistos-core URL) and
 * ARTISTOS_READ_KEY (server-only, never NEXT_PUBLIC_*). Without a key the
 * fetchers throw ArtistosAdapterError('not configured') — they never fall
 * back to the public/anon key, whose RLS view would look like "no data".
 */

import '../server-only';

import {
  makeProvenance,
  mapNativeStatus,
  normalize,
  submissionWithUnknownStatus,
} from '../../bridge-contract';
import type {
  Artist,
  Campaign,
  Evidence,
  Normalized,
  Placement,
  Release,
  SubmissionPitch,
} from '../../bridge-contract';
import { readRows } from '../postgrest-read';
import type { PostgrestReadConfig } from '../postgrest-read';
import { parseRowsAt } from '../validation/core';
import {
  ARTISTOS_COLUMNS,
  artistosArtistRowSchema,
  artistosCampaignRowSchema,
  artistosCampaignSubmissionRowSchema,
  artistosCampaignTargetRowSchema,
  artistosEvidenceRowSchema,
  artistosOutcomeRowSchema,
  artistosPlacementRowSchema,
  artistosReleaseRowSchema,
} from '../validation/artistos';
import type {
  ArtistosArtistRow,
  ArtistosCampaignRow,
  ArtistosCampaignSubmissionRow,
  ArtistosCampaignTargetRow,
  ArtistosEvidenceRow,
  ArtistosOutcomeRow,
  ArtistosPlacementRow,
  ArtistosReleaseRow,
  ArtistosTable,
} from '../validation/artistos';
import type { z } from 'zod';

/** Current ArtistOS verdict — change only when the reconciliation lands. */
export const ARTISTOS_AUTHORITY_VERDICT = 'PARTIALLY AUTHORITATIVE' as const;
const VERDICT_NOTE = `ArtistOS ${ARTISTOS_AUTHORITY_VERDICT}; migration-ledger reconciliation pending`;

const DEFAULT_ARTISTOS_URL = 'https://myrtdfyjoxvtubusrrmf.supabase.co';

export class ArtistosAdapterError extends Error {
  constructor(message: string) {
    super(`ArtistOS adapter: ${message}`);
    this.name = 'ArtistosAdapterError';
  }
}

/** Resolve server-side read config from env. Throws when no key is set. */
export function artistosConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): PostgrestReadConfig {
  const key = env.ARTISTOS_READ_KEY;
  if (!key) {
    throw new ArtistosAdapterError(
      'not configured — set ARTISTOS_READ_KEY (server-only). The anon key is ' +
        'deliberately not used: RLS would return empty sets that look like "no data".',
    );
  }
  return { url: env.ARTISTOS_SUPABASE_URL || DEFAULT_ARTISTOS_URL, key };
}

async function readValidated<S extends z.ZodType>(
  config: PostgrestReadConfig,
  table: ArtistosTable,
  schema: S,
  filters: { eq?: Record<string, string>; orderBy?: string },
): Promise<z.infer<S>[]> {
  const rows = await readRows(config, {
    table,
    columns: ARTISTOS_COLUMNS[table],
    eq: filters.eq,
    order: filters.orderBy ? { column: filters.orderBy } : undefined,
    limit: 1000,
  });
  return parseRowsAt(`artistos.${table}`, schema, rows);
}

const asRaw = (row: object): Record<string, unknown> => ({ ...row }) as Record<string, unknown>;
const undef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

/* ------------------------------------------------------------------ */
/* Artists / releases — source-of-record (partial verdict noted).      */
/* ------------------------------------------------------------------ */

export function normalizeArtistosArtist(row: ArtistosArtistRow): Normalized<Artist> {
  return normalize<Artist>(
    {
      id: row.id,
      name: row.name,
      aliases: undef(row.aliases),
      genre_tags: undef(row.genre_tags),
      spotify_url: undef(row.spotify_url),
      workspace_id: row.workspace_id,
    },
    makeProvenance({
      source_system: 'artistos',
      source_id: row.id,
      source_ref: 'artists',
      authority: 'source-of-record',
      // artists has no updated_at column; created_at is the only source
      // timestamp. Documented, not invented.
      updated_at: row.created_at,
      note: VERDICT_NOTE,
    }),
    asRaw(row),
  );
}

export function normalizeArtistosRelease(row: ArtistosReleaseRow): Normalized<Release> {
  return normalize<Release>(
    {
      id: row.id,
      artist_id: row.artist_id,
      title: row.title,
      featured_artist: undef(row.featured_artist),
      release_date: undef(row.release_date),
      distributor: undef(row.distributor),
      label: undef(row.label),
      isrc: undef(row.isrc),
      upc: undef(row.upc),
      status: row.status,
    },
    makeProvenance({
      source_system: 'artistos',
      source_id: row.id,
      source_ref: 'releases',
      authority: 'source-of-record',
      updated_at: row.created_at,
      note: VERDICT_NOTE,
    }),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Campaigns — readable, but NOT campaign authority for the pilot.     */
/* ------------------------------------------------------------------ */

export function normalizeArtistosCampaign(row: ArtistosCampaignRow): Normalized<Campaign> {
  return normalize<Campaign>(
    {
      id: row.id,
      release_id: row.release_id,
      name: row.name,
      status: row.status,
      goal: undef(row.goals),
    },
    makeProvenance({
      source_system: 'artistos',
      source_id: row.id,
      source_ref: 'campaigns',
      authority: 'unresolved',
      updated_at: row.created_at,
      note: `${VERDICT_NOTE}; pilot campaign authority is the source-controlled manifest`,
    }),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Campaign targets + submissions — two ArtistOS lifecycles, two       */
/* status namespaces. Both schema-only live (0 rows 2026-09-28).       */
/* ------------------------------------------------------------------ */

/** Contract target ref for an ArtistOS campaign target (native kind + id). */
export function artistosTargetRef(kind: string, id: string): string {
  return `artistos:${kind}:${id}`;
}

export function normalizeArtistosCampaignTarget(
  row: ArtistosCampaignTargetRow,
): Normalized<SubmissionPitch> {
  const provenance = makeProvenance({
    source_system: 'artistos',
    source_id: row.id,
    source_ref: 'campaign_targets',
    authority: 'unresolved',
    updated_at: row.updated_at,
    note: `${VERDICT_NOTE}; status namespace artistos_campaign_target`,
  });
  const base = {
    id: `artistos-ct-${row.id}`,
    campaign_id: row.campaign_id,
    target_id: artistosTargetRef(row.target_kind, row.target_id),
    status_native: row.status,
    submitted_at: undefined,
    raw: asRaw(row),
  };
  const mapped = mapNativeStatus(row.status, 'artistos_campaign_target');
  if (mapped === undefined) return submissionWithUnknownStatus({ ...base, provenance });
  return normalize<SubmissionPitch>(
    {
      id: base.id,
      campaign_id: base.campaign_id,
      target_id: base.target_id,
      status_normalized: mapped,
      status_native: row.status,
      response_notes: undef(row.notes),
    },
    provenance,
    base.raw,
  );
}

export function normalizeArtistosSubmission(
  row: ArtistosCampaignSubmissionRow,
): Normalized<SubmissionPitch> {
  const provenance = makeProvenance({
    source_system: 'artistos',
    source_id: row.id,
    source_ref: 'campaign_submissions',
    authority: 'unresolved',
    updated_at: row.updated_at,
    note: `${VERDICT_NOTE}; submission path schema-only live`,
  });
  const base = {
    id: `artistos-sub-${row.id}`,
    campaign_id: row.campaign_id,
    // Points at the ArtistOS campaign_targets row; its native target
    // (person/organization/property) is resolved from that row.
    target_id: `artistos-ct-${row.campaign_target_id}`,
    status_native: row.status,
    submitted_at: undef(row.submitted_at),
    raw: asRaw(row),
  };
  const mapped = mapNativeStatus(row.status, 'artistos');
  if (mapped === undefined) return submissionWithUnknownStatus({ ...base, provenance });
  return normalize<SubmissionPitch>(
    {
      id: base.id,
      campaign_id: base.campaign_id,
      target_id: base.target_id,
      status_normalized: mapped,
      status_native: row.status,
      submitted_at: base.submitted_at,
      // response_due_at is a curator deadline, not a follow-up date —
      // preserved in raw, deliberately not mapped to follow_up_at.
    },
    provenance,
    base.raw,
  );
}

/* ------------------------------------------------------------------ */
/* Placements — 57 real rows live (Soundcharts-licensed, all for       */
/* "Never Alone" as of 2026-09-28).                                    */
/* ------------------------------------------------------------------ */

export function normalizeArtistosPlacement(row: ArtistosPlacementRow): Normalized<Placement> {
  return normalize<Placement>(
    {
      id: row.id,
      // playlist_id is the BVSS Playlist FK — ArtistOS placements are
      // external playlists, so it stays unset.
      playlist_name: row.playlist_name,
      // Live values are Soundcharts UUIDs, not Spotify IDs. Verbatim.
      external_playlist_id: undef(row.external_playlist_id),
      release_id: undef(row.release_id),
      track_position: undef(row.track_position),
      added_at: undef(row.added_at),
      removed_at: undef(row.removed_at),
      // `followers` is the playlist's count at last observation, NOT at
      // placement — mapping it to follower_count_at_placement would be a
      // fabricated metric. Preserved in raw only.
      verification_state: row.verification_state,
    },
    makeProvenance({
      source_system: 'artistos',
      source_id: row.id,
      source_ref: 'playlist_placements',
      authority: 'source-of-record',
      updated_at: row.updated_at,
      confidence: undef(row.confidence),
      note: `${VERDICT_NOTE}; source_type=${row.source_type}; native verification_state not promoted`,
    }),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Evidence — 27 rows live.                                            */
/* ------------------------------------------------------------------ */

export function normalizeArtistosEvidence(row: ArtistosEvidenceRow): Normalized<Evidence> {
  const score = undef(row.confidence_score);
  return normalize<Evidence>(
    {
      id: row.id,
      evidence_type: row.evidence_type,
      source_uri: undef(row.source_uri),
      // Contract `confidence` is numeric → from confidence_score (NULL on
      // 20 of 27 live rows). The text grade (verified|supported|weak|
      // unknown) is preserved in raw — never converted to a number.
      confidence: score,
      content_hash: undef(row.content_hash),
      observed_at: row.observed_at,
      supersedes_id: undef(row.supersedes_id),
      revoked_at: undef(row.revoked_at),
    },
    makeProvenance({
      source_system: 'artistos',
      source_id: row.id,
      source_ref: 'evidence_records',
      authority: 'source-of-record',
      updated_at: row.captured_at,
      confidence: score,
      note: `${VERDICT_NOTE}; native grade=${row.confidence}; verification_status=${row.verification_status}`,
    }),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Outcomes — CONTRACT GAP. Live ArtistOS outcomes are release-level   */
/* results (press_mention | playlist_add | creator_use), not           */
/* submission decisions. The contract's Outcome requires               */
/* `submission_id` and a decision-type union, so these do not fit.     */
/* Returned as an adapter-local read type, unmapped, pending a         */
/* contract decision (see PR notes). Not forced, not guessed.          */
/* ------------------------------------------------------------------ */

export interface ArtistosOutcomeRecord {
  id: string;
  /** Verbatim native type, e.g. press_mention. */
  outcome_type_native: string;
  outcome_date?: string;
  url?: string;
  release_id?: string;
  campaign_id?: string;
  organization_id?: string;
  property_id?: string;
  /** Verbatim native label, e.g. "confirmed". */
  confidence_native?: string;
}

export function normalizeArtistosOutcome(
  row: ArtistosOutcomeRow,
): Normalized<ArtistosOutcomeRecord> {
  return normalize<ArtistosOutcomeRecord>(
    {
      id: row.id,
      outcome_type_native: row.outcome_type,
      outcome_date: undef(row.outcome_date),
      url: undef(row.url),
      release_id: undef(row.release_id),
      campaign_id: undef(row.campaign_id),
      organization_id: undef(row.organization_id),
      property_id: undef(row.property_id),
      confidence_native: undef(row.confidence),
    },
    makeProvenance({
      source_system: 'artistos',
      source_id: row.id,
      source_ref: 'outcomes',
      authority: 'unresolved',
      updated_at: row.created_at,
      note: `${VERDICT_NOTE}; release-level outcome — not a contract Outcome (contract gap)`,
    }),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Fetchers — GET-only, validated, then normalized.                    */
/* ------------------------------------------------------------------ */

export async function fetchArtistosArtists(
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<Artist>[]> {
  const rows = await readValidated(config, 'artists', artistosArtistRowSchema, { orderBy: 'created_at' });
  return rows.map(normalizeArtistosArtist);
}

export async function fetchArtistosReleases(
  artistId: string,
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<Release>[]> {
  const rows = await readValidated(config, 'releases', artistosReleaseRowSchema, {
    eq: { artist_id: artistId },
    orderBy: 'created_at',
  });
  return rows.map(normalizeArtistosRelease);
}

export async function fetchArtistosCampaigns(
  releaseId: string,
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<Campaign>[]> {
  const rows = await readValidated(config, 'campaigns', artistosCampaignRowSchema, {
    eq: { release_id: releaseId },
    orderBy: 'created_at',
  });
  return rows.map(normalizeArtistosCampaign);
}

export async function fetchArtistosCampaignTargets(
  campaignId: string,
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<SubmissionPitch>[]> {
  const rows = await readValidated(config, 'campaign_targets', artistosCampaignTargetRowSchema, {
    eq: { campaign_id: campaignId },
    orderBy: 'added_at',
  });
  return rows.map(normalizeArtistosCampaignTarget);
}

export async function fetchArtistosSubmissions(
  campaignId: string,
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<SubmissionPitch>[]> {
  const rows = await readValidated(config, 'campaign_submissions', artistosCampaignSubmissionRowSchema, {
    eq: { campaign_id: campaignId },
    orderBy: 'created_at',
  });
  return rows.map(normalizeArtistosSubmission);
}

export async function fetchArtistosPlacements(
  releaseId: string,
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<Placement>[]> {
  const rows = await readValidated(config, 'playlist_placements', artistosPlacementRowSchema, {
    eq: { release_id: releaseId },
    orderBy: 'added_at',
  });
  return rows.map(normalizeArtistosPlacement);
}

export async function fetchArtistosEvidence(
  scope: { artist_id: string } | { release_id: string },
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<Evidence>[]> {
  const rows = await readValidated(config, 'evidence_records', artistosEvidenceRowSchema, {
    eq: { ...scope },
    orderBy: 'observed_at',
  });
  return rows.map(normalizeArtistosEvidence);
}

export async function fetchArtistosOutcomes(
  scope: { release_id: string } | { campaign_id: string } | { organization_id: string },
  config: PostgrestReadConfig = artistosConfigFromEnv(),
): Promise<Normalized<ArtistosOutcomeRecord>[]> {
  const rows = await readValidated(config, 'outcomes', artistosOutcomeRowSchema, {
    eq: { ...scope },
    orderBy: 'created_at',
  });
  return rows.map(normalizeArtistosOutcome);
}
