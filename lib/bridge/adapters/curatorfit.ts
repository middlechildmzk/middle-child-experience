/**
 * CuratorFit read-only adapter (Architecture Pack §7.1, Tranche 2).
 *
 * Normalizes CuratorFit promotion targets, curator profiles, campaign
 * targets and submissions into the bridge contract.
 *
 * ── STATUS: DESIGN-DORMANT ──────────────────────────────────────────
 * - CuratorFit is NOT campaign authority. Its campaigns/campaign_targets/
 *   submissions normalize with authority `unresolved`; the pilot campaign
 *   identity lives in lib/bridge/pilot-manifest.ts.
 * - No CuratorFit database is deployed (2026-09-28): its tables exist in
 *   no connected Supabase project. Row shapes come from the repo DDL
 *   (middlechildmzk/curatorfit supabase/schema.sql @ c675dd3). Every
 *   record carries authority `unresolved` until a live source exists and
 *   an authority verdict is issued — flip CURATORFIT_STATUS then.
 * - artistos-core has tables named `campaigns` / `campaign_targets`, but
 *   they are ArtistOS tables with different columns. The config guard
 *   below refuses to point this adapter at artistos-core so those rows can
 *   never be misread as CuratorFit.
 *
 * ── READ-ONLY GUARANTEE ──────────────────────────────────────────────
 * Reads only via ../postgrest-read (HTTP GET, explicit columns). No
 * supabase-js, no RPC, no writes. Enforced in CI.
 */

import '../server-only';

import {
  makeProvenance,
  mapNativeStatus,
  normalize,
  submissionWithUnknownStatus,
} from '../../bridge-contract';
import type {
  Curator,
  Normalized,
  PromotionTarget,
  Provenance,
  SubmissionPitch,
} from '../../bridge-contract';
import { readRows } from '../postgrest-read';
import type { PostgrestReadConfig } from '../postgrest-read';
import { parseRowsAt } from '../validation/core';
import {
  CURATORFIT_COLUMNS,
  curatorfitCampaignTargetRowSchema,
  curatorfitCuratorProfileRowSchema,
  curatorfitPromotionTargetRowSchema,
  curatorfitSubmissionRowSchema,
} from '../validation/curatorfit';
import type {
  CuratorfitCampaignTargetRow,
  CuratorfitCuratorProfileRow,
  CuratorfitPromotionTargetRow,
  CuratorfitSubmissionRow,
  CuratorfitTable,
} from '../validation/curatorfit';
import type { z } from 'zod';

export const CURATORFIT_STATUS = 'DESIGN-DORMANT' as const;
const DORMANT_NOTE = 'CuratorFit design-dormant; no live database; not campaign authority';
const ARTISTOS_CORE_REF = 'myrtdfyjoxvtubusrrmf';

export class CuratorfitAdapterError extends Error {
  constructor(message: string) {
    super(`CuratorFit adapter: ${message}`);
    this.name = 'CuratorfitAdapterError';
  }
}

/**
 * Resolve config. There is no default URL on purpose: no CuratorFit
 * project exists. Refuses artistos-core outright.
 */
export function curatorfitConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): PostgrestReadConfig {
  const url = env.CURATORFIT_SUPABASE_URL;
  const key = env.CURATORFIT_READ_KEY;
  if (!url || !key) {
    throw new CuratorfitAdapterError(
      'no live CuratorFit database is configured (design-dormant). Set ' +
        'CURATORFIT_SUPABASE_URL and CURATORFIT_READ_KEY (server-only) once one exists.',
    );
  }
  if (url.includes(ARTISTOS_CORE_REF)) {
    throw new CuratorfitAdapterError(
      'refusing to read artistos-core as CuratorFit: its campaigns/campaign_targets ' +
        'are ArtistOS tables with a different schema.',
    );
  }
  return { url, key };
}

async function readValidated<S extends z.ZodType>(
  config: PostgrestReadConfig,
  table: CuratorfitTable,
  schema: S,
  filters: { eq?: Record<string, string>; orderBy?: string },
): Promise<z.infer<S>[]> {
  const rows = await readRows(config, {
    table,
    columns: CURATORFIT_COLUMNS[table],
    eq: filters.eq,
    order: filters.orderBy ? { column: filters.orderBy } : undefined,
    limit: 1000,
  });
  return parseRowsAt(`curatorfit.${table}`, schema, rows);
}

const asRaw = (row: object): Record<string, unknown> => ({ ...row }) as Record<string, unknown>;
const undef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

function provenanceFor(table: string, id: string, updated_at: string, note?: string): Provenance {
  return makeProvenance({
    source_system: 'curatorfit',
    source_id: id,
    source_ref: table,
    authority: 'unresolved',
    updated_at,
    note: note ? `${DORMANT_NOTE}; ${note}` : DORMANT_NOTE,
  });
}

/** Contract id for a CuratorFit promotion target. */
export function curatorfitTargetId(promotionTargetId: string): string {
  return `tgt-cf-${promotionTargetId}`;
}

/* ------------------------------------------------------------------ */
/* Promotion targets → the external half of the campaign universe.     */
/* ------------------------------------------------------------------ */

export function normalizeCuratorfitTarget(
  row: CuratorfitPromotionTargetRow,
): Normalized<PromotionTarget> {
  const genres = row.genres && row.genres.length > 0 ? row.genres : row.genre ? [row.genre] : undefined;
  return normalize<PromotionTarget>(
    {
      id: curatorfitTargetId(row.id),
      target_source: 'curatorfit_external',
      name: row.name,
      url: row.url,
      // Native target_type verbatim (spotify_playlist, blog, radio, …).
      channel: row.type,
      genres,
      moods: undef(row.moods),
      audience_label: undef(row.audience_size_label),
      audience_count: undef(row.audience_count),
      contact_method: undef(row.contact_method),
      submission_rules: undef(row.submission_rules),
      fit_notes: undef(row.fit_notes),
      trust_score: row.trust_score,
      risk_level: row.risk_level,
      risk_notes: undef(row.risk_notes),
      verification_notes: undef(row.verification_notes),
      last_reviewed_at: undef(row.last_reviewed_at),
      last_checked_at: undef(row.last_checked_at),
      // Native target_status verbatim (seed, claimed, verified, …).
      status: row.status,
      external_ref: row.slug,
    },
    // Trust/risk are target facts in the contract. They remain separate
    // from provenance confidence, which describes confidence in the source
    // observation itself.
    provenanceFor('promotion_targets', row.id, row.updated_at, `risk_level=${row.risk_level}; trust_score=${row.trust_score}`),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Curator profiles → Curator (external side).                         */
/* ------------------------------------------------------------------ */

export function normalizeCuratorfitCurator(
  row: CuratorfitCuratorProfileRow,
): Normalized<Curator> {
  const social_links: Record<string, string> = {};
  if (row.instagram_url) social_links.instagram = row.instagram_url;
  if (row.tiktok_url) social_links.tiktok = row.tiktok_url;
  if (row.youtube_url) social_links.youtube = row.youtube_url;
  return normalize<Curator>(
    {
      id: `cf-curator-${row.id}`,
      display_name: row.display_name,
      bio: undef(row.bio),
      website_url: undef(row.website_url),
      social_links: Object.keys(social_links).length > 0 ? social_links : undefined,
      accepted_genres: undef(row.accepted_genres),
      hard_nos: undef(row.hard_nos),
      curator_side: 'curatorfit_external',
    },
    provenanceFor('curator_profiles', row.id, row.updated_at, `status=${row.status}`),
    asRaw(row),
  );
}

/* ------------------------------------------------------------------ */
/* Campaign targets + submissions → SubmissionPitch, `curatorfit`      */
/* status namespace (12-state submission_status enum).                 */
/* ------------------------------------------------------------------ */

export function normalizeCuratorfitCampaignTarget(
  row: CuratorfitCampaignTargetRow,
): Normalized<SubmissionPitch> {
  const provenance = provenanceFor('campaign_targets', row.id, row.created_at, `fit_score=${row.fit_score} (native, unexplained)`);
  const base = {
    id: `cf-ct-${row.id}`,
    campaign_id: row.campaign_id,
    target_id: curatorfitTargetId(row.promotion_target_id),
    status_native: row.pitch_status,
    raw: asRaw(row),
  };
  const mapped = mapNativeStatus(row.pitch_status, 'curatorfit');
  if (mapped === undefined) return submissionWithUnknownStatus({ ...base, provenance });
  return normalize<SubmissionPitch>(
    {
      id: base.id,
      campaign_id: base.campaign_id,
      target_id: base.target_id,
      status_normalized: mapped,
      status_native: row.pitch_status,
      response_notes: undef(row.response_notes),
      follow_up_at: undef(row.follow_up_at),
    },
    provenance,
    base.raw,
  );
}

export function normalizeCuratorfitSubmission(
  row: CuratorfitSubmissionRow,
): Normalized<SubmissionPitch> {
  const provenance = provenanceFor('submissions', row.id, row.reviewed_at ?? row.created_at);
  const targetId = row.promotion_target_id
    ? curatorfitTargetId(row.promotion_target_id)
    : row.playlist_id
      ? `cf-playlist-${row.playlist_id}`
      : 'unknown-target';
  const base = {
    id: `cf-sub-${row.id}`,
    campaign_id: undef(row.campaign_id),
    target_id: targetId,
    status_native: row.status,
    submitted_at: undef(row.submitted_at),
    raw: asRaw(row),
  };
  const mapped = mapNativeStatus(row.status, 'curatorfit');
  if (mapped === undefined) return submissionWithUnknownStatus({ ...base, provenance });
  return normalize<SubmissionPitch>(
    {
      id: base.id,
      campaign_id: base.campaign_id,
      target_id: base.target_id,
      status_normalized: mapped,
      status_native: row.status,
      submitted_at: base.submitted_at,
      curator_feedback: undef(row.curator_feedback),
    },
    provenance,
    base.raw,
  );
}

/* ------------------------------------------------------------------ */
/* Fetchers — throw until a live CuratorFit source is configured.      */
/* ------------------------------------------------------------------ */

export async function fetchCuratorfitTargets(
  config: PostgrestReadConfig = curatorfitConfigFromEnv(),
): Promise<Normalized<PromotionTarget>[]> {
  const rows = await readValidated(config, 'promotion_targets', curatorfitPromotionTargetRowSchema, { orderBy: 'created_at' });
  return rows.map(normalizeCuratorfitTarget);
}

export async function fetchCuratorfitCurators(
  config: PostgrestReadConfig = curatorfitConfigFromEnv(),
): Promise<Normalized<Curator>[]> {
  const rows = await readValidated(config, 'curator_profiles', curatorfitCuratorProfileRowSchema, { orderBy: 'created_at' });
  return rows.map(normalizeCuratorfitCurator);
}

export async function fetchCuratorfitCampaignTargets(
  campaignId: string,
  config: PostgrestReadConfig = curatorfitConfigFromEnv(),
): Promise<Normalized<SubmissionPitch>[]> {
  const rows = await readValidated(config, 'campaign_targets', curatorfitCampaignTargetRowSchema, {
    eq: { campaign_id: campaignId },
    orderBy: 'created_at',
  });
  return rows.map(normalizeCuratorfitCampaignTarget);
}

export async function fetchCuratorfitSubmissions(
  campaignId: string,
  config: PostgrestReadConfig = curatorfitConfigFromEnv(),
): Promise<Normalized<SubmissionPitch>[]> {
  const rows = await readValidated(config, 'submissions', curatorfitSubmissionRowSchema, {
    eq: { campaign_id: campaignId },
    orderBy: 'created_at',
  });
  return rows.map(normalizeCuratorfitSubmission);
}
