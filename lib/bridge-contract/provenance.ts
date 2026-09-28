/**
 * Provenance envelope — carried on every normalized record in the
 * Promotion Intelligence Bridge.
 *
 * See Architecture Pack §5 (source/provenance model):
 * - exactly one source_system per record;
 * - `raw` preserves native values alongside normalized ones — nothing is
 *   dropped in normalization;
 * - no function in this package may promote a record's provenance label to
 *   `verified`. Only (a) a write in the source system of record or (b) an
 *   explicit human review action can do that. Adapter outputs default to
 *   `imported`; Muse/agent outputs default to `suggested`.
 */

/** Which ecosystem system a normalized record was read from. */
export type SourceSystem = 'bvss' | 'curatorfit' | 'artistos';

/**
 * The five provenance labels (§5.1):
 * - verified: confirmed by the authoritative source or by human review
 * - imported: copied verbatim from a source; not independently confirmed
 * - inferred: computed by deterministic rules from verified/imported inputs
 * - suggested: Muse/agent recommendation; not approved, not fact
 * - unknown: explicitly missing — rendered as missing, never estimated
 */
export type ProvenanceLabel =
  | 'verified'
  | 'imported'
  | 'inferred'
  | 'suggested'
  | 'unknown';

/**
 * Who owns the fact:
 * - source-of-record: the system that owns it (per the §1 authority map)
 * - derived: computed from >=1 source-of-record facts
 * - unresolved: conflicting values, or no owner (e.g. Track)
 */
export type Authority = 'source-of-record' | 'derived' | 'unresolved';

export interface Provenance {
  /** Which system this record was read from. */
  source_system: SourceSystem;
  /** Native PK / identifier in the source system. */
  source_id: string;
  /** Live table name or edge-function endpoint the record came from. */
  source_ref: string;
  /** ISO-8601: when the adapter read it. */
  observed_at: string;
  /**
   * ISO-8601: the source's own updated timestamp.
   * Falls back to observed_at when the source provides none.
   */
  updated_at: string;
  /** Who owns this fact. */
  authority: Authority;
  /** §5 labeling rule. */
  provenance: ProvenanceLabel;
  /** Link to an evidence record, where available. */
  evidence_ref?: string;
  /** 0–1, only when the source provides one. */
  confidence?: number;
  /** Human-readable caveat (e.g. "feed pending"). */
  note?: string;
}

/**
 * Every normalized record. `raw` keeps the native row/values next to the
 * normalized shape so an auditor can trace any pilot number back to its
 * origin row in under three hops (§5.4).
 */
export interface Normalized<T> {
  data: T;
  provenance: Provenance;
  raw?: Record<string, unknown>;
}

/**
 * The normalized submission/pitch lifecycle (§4.3, §6.4). Adapters map
 * native → normalized in the read layer; normalized values are never
 * written back to sources. Unmapped native values surface as `unknown`
 * (see `mapNativeStatus` in helpers) — never guessed.
 */
export type NormalizedStatus =
  | 'identified'
  | 'shortlisted'
  | 'approved'
  | 'pitched_submitted'
  | 'reviewing'
  | 'responded'
  | 'accepted'
  | 'declined'
  | 'placement_live'
  | 'measured'
  | 'unknown';
