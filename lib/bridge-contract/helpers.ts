/**
 * Tiny pure helpers for the bridge contract. Zero runtime dependencies.
 *
 * - `makeProvenance` builds the provenance envelope every adapter attaches.
 * - `mapNativeStatus(native, source)` maps a native status into the
 *   normalized lifecycle using the mapping namespaced to its source
 *   system ('bvss' | 'curatorfit' | 'artistos'). Never guess across
 *   systems: unmapped values return undefined.
 * - `submissionWithUnknownStatus` constructs the fail-safe shape for
 *   unmapped native values: native preserved, normalized unset ('unknown'),
 *   provenance label `unknown` — never guessed.
 */

import type {
  Authority,
  Normalized,
  NormalizedStatus,
  Provenance,
  ProvenanceLabel,
  SourceSystem,
} from './provenance';
import type { SubmissionPitch } from './entities';

/** Build a provenance envelope. `observed_at` defaults to now. */
export function makeProvenance(input: {
  source_system: SourceSystem;
  source_id: string;
  source_ref: string;
  authority: Authority;
  provenance?: ProvenanceLabel;
  updated_at?: string;
  evidence_ref?: string;
  confidence?: number;
  note?: string;
}): Provenance {
  const observed_at = new Date().toISOString();
  return {
    source_system: input.source_system,
    source_id: input.source_id,
    source_ref: input.source_ref,
    observed_at,
    updated_at: input.updated_at ?? observed_at,
    authority: input.authority,
    // Adapters copy verbatim from the source; they do not independently
    // confirm it. See §5: promotion to `verified` needs a source-system
    // write or explicit human review.
    provenance: input.provenance ?? 'imported',
    evidence_ref: input.evidence_ref,
    confidence: input.confidence,
    note: input.note,
  };
}

/** Wrap a normalized entity with its provenance, preserving the native row. */
export function normalize<T>(
  data: T,
  provenance: Provenance,
  raw?: Record<string, unknown>,
): Normalized<T> {
  return raw === undefined ? { data, provenance } : { data, provenance, raw };
}

/**
 * Source-namespaced native→normalized status mappings (Pack §3).
 *
 * One global namespace was wrong: the three systems use disjoint status
 * vocabularies, and the first cut's ArtistOS values did not match the
 * live DDL. Each map is keyed by its source system; callers must pass
 * the source. Mappings that are judgment calls are marked `inferred` —
 * the native value is always preserved verbatim in `status_native` /
 * `raw`, so re-mapping later is lossless.
 *
 * Returns `undefined` for unmapped values — callers must NOT fall back to a
 * guess; use `submissionWithUnknownStatus` instead.
 */
export type StatusSource =
  | 'bvss'
  | 'curatorfit'
  | 'artistos'
  | 'artistos_campaign_target';

/** BVSS submission statuses — repo-inferred, unconfirmed live 2026-09-28. */
const BVSS_STATUS_MAP: Record<string, NormalizedStatus> = {
  waiting: 'pitched_submitted',
  accepted: 'accepted',
  held: 'reviewing',
  rejected: 'declined',
};

/** CuratorFit `submission_status` 12-state enum — from supabase/schema.sql. */
const CURATORFIT_STATUS_MAP: Record<string, NormalizedStatus> = {
  saved: 'identified',
  researching: 'identified',
  pitch_drafted: 'identified',
  pitched: 'pitched_submitted',
  pending_review: 'pitched_submitted',
  reviewed: 'responded',
  follow_up: 'responded',
  added: 'accepted',
  passed: 'declined',
  not_a_fit: 'declined',
  do_not_contact: 'declined',
  expired: 'declined',
};

/**
 * ArtistOS `campaign_submissions.status` — CHECK values verified against
 * the live migration DDL
 * (20260729003724_artistos_marketplace_identity.sql:238) 2026-09-28.
 */
const ARTISTOS_STATUS_MAP: Record<string, NormalizedStatus> = {
  /** created, not yet pitched */
  draft: 'identified',
  /** invited to pitch a property */
  invited: 'shortlisted',
  /** pitched, awaiting curator triage */
  pending_review: 'pitched_submitted',
  /** curator actively reviewing */
  in_review: 'reviewing',
  /** curator responded with feedback but no decision */
  feedback_submitted: 'responded',
  accepted: 'accepted',
  /** committed to promote — post-acceptance; native kept verbatim */
  promotion_committed: 'accepted',
  declined: 'declined',
  /** submitter-withdrawn; directionality preserved in the native value */
  withdrawn: 'declined',
  /** promotion ran to completion */
  completed: 'placement_live',
};

/**
 * ArtistOS `campaign_targets.status` — a SEPARATE vocabulary from
 * `campaign_submissions.status` in the same system. CHECK values verified
 * against the live constraint `campaign_targets_status_check`
 * (queued|pitched|replied|accepted|declined|placed) 2026-09-28. Kept in its
 * own namespace so the two ArtistOS lifecycles never share a map.
 */
const ARTISTOS_CAMPAIGN_TARGET_STATUS_MAP: Record<string, NormalizedStatus> = {
  /** added to the campaign, not yet pitched */
  queued: 'shortlisted',
  pitched: 'pitched_submitted',
  replied: 'responded',
  accepted: 'accepted',
  declined: 'declined',
  placed: 'placement_live',
};

const STATUS_MAPS: Record<StatusSource, Record<string, NormalizedStatus>> = {
  bvss: BVSS_STATUS_MAP,
  curatorfit: CURATORFIT_STATUS_MAP,
  artistos: ARTISTOS_STATUS_MAP,
  artistos_campaign_target: ARTISTOS_CAMPAIGN_TARGET_STATUS_MAP,
};

export function mapNativeStatus(
  native: string,
  source: StatusSource,
): NormalizedStatus | undefined {
  const map = STATUS_MAPS[source];
  const key = native.toLowerCase();
  // Own-property check: a native value like "constructor" must not resolve
  // to an Object.prototype member — unknown stays unknown.
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

/**
 * Fail-safe constructor for unmapped native statuses: native value
 * preserved verbatim, normalized status `unknown`, provenance `unknown`.
 */
export function submissionWithUnknownStatus(input: {
  id: string;
  target_id: string;
  status_native: string;
  campaign_id?: string;
  track_id?: string;
  submitted_at?: string;
  provenance: Provenance;
  raw?: Record<string, unknown>;
}): Normalized<SubmissionPitch> {
  return normalize<SubmissionPitch>(
    {
      id: input.id,
      campaign_id: input.campaign_id,
      target_id: input.target_id,
      track_id: input.track_id,
      status_normalized: 'unknown',
      status_native: input.status_native,
      submitted_at: input.submitted_at,
    },
    { ...input.provenance, provenance: 'unknown' },
    input.raw,
  );
}
