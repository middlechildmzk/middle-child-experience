/**
 * Tiny pure helpers for the bridge contract. Zero runtime dependencies.
 *
 * - `makeProvenance` builds the provenance envelope every adapter attaches.
 * - `mapNativeStatus` is the initial repo-derived native→normalized mapping
 *   (Architecture Pack §3). It must be revalidated on first live rows.
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
 * Initial native→normalized status mapping, repo-derived (Pack §3).
 * BVSS statuses are repo-inferred (`waiting|accepted|held|rejected` —
 * unconfirmed live 2026-09-28); CuratorFit's 12-state enum comes from
 * supabase/schema.sql; ArtistOS values from repo migrations.
 *
 * Returns `undefined` for unmapped values — callers must NOT fall back to a
 * guess; use `submissionWithUnknownStatus` instead.
 */
const NATIVE_STATUS_MAP: Record<string, NormalizedStatus> = {
  // BVSS (repo-inferred)
  waiting: 'pitched_submitted',
  accepted: 'accepted',
  held: 'reviewing',
  rejected: 'declined',
  // CuratorFit submission_status enum
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
  // ArtistOS campaign_submissions (repo migrations; unconfirmed live)
  submitted: 'pitched_submitted',
  under_review: 'reviewing',
  approved: 'accepted',
  declined: 'declined',
};

export function mapNativeStatus(native: string): NormalizedStatus | undefined {
  return NATIVE_STATUS_MAP[native.toLowerCase()];
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
