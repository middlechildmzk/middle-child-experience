/**
 * ArtistOS Suite shared contracts (ArtistOS Master Suite audit, 2026-10-10).
 *
 * Extends the One Campaign read contract with the entities the suite needs
 * to share across ArtistOS, BVSS FVM / CuratorOS and the proposed Encore
 * event surface: smart links, audience members, consent records, artist
 * events and artist verification. Also records which product holds WRITE
 * authority for each shared entity, so no second product quietly becomes a
 * competing source of truth.
 *
 * Rules:
 * - Pure types and pure functions. Zero runtime dependencies, no I/O.
 * - Field names follow live `artistos-core` columns where a table exists
 *   (smart_links, smart_link_destinations, fan_consents, suppressions,
 *   read 2026-10-10). Entities with no table yet are marked `proposed`.
 * - Nothing here grants a write. `writeAuthorityFor` only answers which
 *   product is allowed to own writes for an entity under this contract.
 */

/* ------------------------------------------------------------------ */
/* Products and write authority                                        */
/* ------------------------------------------------------------------ */

export type SuiteProduct =
  | 'artistos'
  | 'bvss'
  | 'curatoros'
  | 'encore'
  | 'curatorfit';

export type SuiteEntity =
  | 'artist_identity'
  | 'release'
  | 'campaign'
  | 'smart_link'
  | 'audience_member'
  | 'consent_record'
  | 'playlist'
  | 'curator_submission'
  | 'network_placement'
  | 'external_placement'
  | 'outcome'
  | 'artist_event'
  | 'artist_verification';

/**
 * - live: a production table exists and the authority writes to it today.
 * - pending_reconciliation: authority decided, but writes wait on the
 *   cross-repo migration-ledger verdict (see PRODUCTION_AUTHORITY doc).
 * - proposed: no table yet; contract shape only.
 */
export type OwnershipStatus = 'live' | 'pending_reconciliation' | 'proposed';

export interface EntityOwnership {
  entity: SuiteEntity;
  /** Exactly one product may own writes. */
  write_authority: SuiteProduct;
  /** Products allowed to read through the bridge. */
  readers: SuiteProduct[];
  status: OwnershipStatus;
  /** Live table(s) or endpoint backing the authority, if any. */
  backing: string | null;
  note: string;
}

const ALL_READERS: SuiteProduct[] = ['artistos', 'bvss', 'curatoros', 'encore'];

export const SUITE_OWNERSHIP: Readonly<Record<SuiteEntity, EntityOwnership>> = {
  artist_identity: {
    entity: 'artist_identity',
    write_authority: 'artistos',
    readers: ALL_READERS,
    status: 'live',
    backing: 'artistos-core: artists, artist_platform_profiles',
    note: 'One artist record per workspace. Other products reference artists.id; they never create artists.',
  },
  release: {
    entity: 'release',
    write_authority: 'artistos',
    readers: ALL_READERS,
    status: 'live',
    backing: 'artistos-core: releases, release_milestones',
    note: 'Release Workspace is the recurring entry point.',
  },
  campaign: {
    entity: 'campaign',
    write_authority: 'artistos',
    readers: ['artistos', 'bvss', 'curatoros'],
    status: 'pending_reconciliation',
    backing: 'artistos-core: campaigns (1 row); pilot identity in lib/bridge/pilot-manifest.ts',
    note: 'Pilot manifest stays the fallback until the ledger verdict flips ARTISTOS_AUTHORITY_VERDICT.',
  },
  smart_link: {
    entity: 'smart_link',
    write_authority: 'artistos',
    readers: ALL_READERS,
    status: 'live',
    backing: 'artistos-core: smart_links, smart_link_destinations, link_events',
    note: 'Public route /l/[slug] in ArtistOS.',
  },
  audience_member: {
    entity: 'audience_member',
    write_authority: 'artistos',
    readers: ['artistos'],
    status: 'live',
    backing: 'artistos-core: fans',
    note: 'Fan PII never crosses the bridge. Other products receive counts or consented segments only.',
  },
  consent_record: {
    entity: 'consent_record',
    write_authority: 'artistos',
    readers: ['artistos'],
    status: 'live',
    backing: 'artistos-core: fan_consents, suppressions',
    note: 'Append-only evidence. Contact eligibility is decided by canSendMarketing().',
  },
  playlist: {
    entity: 'playlist',
    write_authority: 'bvss',
    readers: ALL_READERS,
    status: 'live',
    backing: 'artistos-core: bvss_playlists (linked to properties via property_id)',
    note: 'Network playlist registry. ArtistOS properties remains the wider external inventory.',
  },
  curator_submission: {
    entity: 'curator_submission',
    write_authority: 'bvss',
    readers: ['artistos', 'bvss', 'curatoros'],
    status: 'live',
    backing: 'artistos-core: bvss_submissions, bvss_submission_routes, bvss_submission_reviews',
    note: 'CuratorOS is the curator-facing UI over the same BVSS pipeline. ArtistOS campaign_submissions stays dormant (0 rows) and must not become a second writer.',
  },
  network_placement: {
    entity: 'network_placement',
    write_authority: 'bvss',
    readers: ['artistos', 'bvss', 'curatoros'],
    status: 'live',
    backing: 'artistos-core: bvss_playlist_placements',
    note: 'Placements on BVSS FVM and CuratorOS partner playlists.',
  },
  external_placement: {
    entity: 'external_placement',
    write_authority: 'artistos',
    readers: ['artistos', 'bvss', 'curatoros'],
    status: 'live',
    backing: 'artistos-core: playlist_placements',
    note: 'Placements on third-party playlists outside the network, with evidence.',
  },
  outcome: {
    entity: 'outcome',
    write_authority: 'artistos',
    readers: ['artistos', 'bvss', 'curatoros'],
    status: 'live',
    backing: 'artistos-core: outcomes, evidence_records',
    note: 'A verified outcome needs an evidence record. BVSS reviews feed outcomes through the bridge, read-only.',
  },
  artist_event: {
    entity: 'artist_event',
    write_authority: 'encore',
    readers: ALL_READERS,
    status: 'proposed',
    backing: null,
    note: 'No table yet. ArtistOS integrations.sync_ticketmaster imports metrics only and must not become the event store.',
  },
  artist_verification: {
    entity: 'artist_verification',
    write_authority: 'artistos',
    readers: ALL_READERS,
    status: 'proposed',
    backing: null,
    note: 'One verification per artist identity, reused by CuratorOS and Encore claims.',
  },
};

export interface WriteAuthorityDecision {
  allowed: boolean;
  authority: SuiteProduct;
  status: OwnershipStatus;
  reason:
    | 'owner'
    | 'not_owner'
    | 'pending_reconciliation'
    | 'proposed_no_table';
}

/**
 * May `product` write `entity` under the suite contract?
 * Only the owner may, and only once the entity is `live`.
 */
export function writeAuthorityFor(
  entity: SuiteEntity,
  product: SuiteProduct,
): WriteAuthorityDecision {
  const own = SUITE_OWNERSHIP[entity];
  const base = { authority: own.write_authority, status: own.status };
  if (product !== own.write_authority) {
    return { ...base, allowed: false, reason: 'not_owner' };
  }
  if (own.status === 'pending_reconciliation') {
    return { ...base, allowed: false, reason: 'pending_reconciliation' };
  }
  if (own.status === 'proposed') {
    return { ...base, allowed: false, reason: 'proposed_no_table' };
  }
  return { ...base, allowed: true, reason: 'owner' };
}

/* ------------------------------------------------------------------ */
/* Smart links (live: smart_links, smart_link_destinations)            */
/* ------------------------------------------------------------------ */

export interface SmartLink {
  id: string;
  workspace_id: string;
  /** → Release.id */
  release_id?: string | null;
  slug: string;
  /** Native mode, preserved verbatim. */
  mode?: string;
  headline?: string | null;
  capture_email: boolean;
  /** Required whenever capture_email is true. */
  consent_copy_version?: string | null;
  is_active: boolean;
}

export interface SmartLinkDestination {
  id: string;
  smart_link_id: string;
  /** e.g. spotify, apple_music. Native value preserved. */
  service: string;
  url: string;
  position: number;
  is_active: boolean;
}

/* ------------------------------------------------------------------ */
/* Audience and consent (live: fans, fan_consents, suppressions)        */
/* ------------------------------------------------------------------ */

/** Matches fan_consents.consent_type check constraint. */
export type ConsentType =
  | 'email_marketing'
  | 'sms_marketing'
  | 'privacy_terms'
  | 'analytics';

/**
 * How the permission was obtained. This is a DERIVED contract field, NOT a
 * column in live fan_consents. A trusted server adapter must derive it from
 * validated evidence and policy provenance; unknown/imported evidence MUST
 * never be promoted to explicit_opt_in.
 * - explicit_opt_in: captured by a consent form with recorded copy version
 * - imported_legacy: came in with a list import; no per-person evidence
 */
export type ConsentBasis = 'explicit_opt_in' | 'imported_legacy';

export interface ConsentRecord {
  fan_id: string;
  workspace_id: string;
  consent_type: ConsentType;
  basis: ConsentBasis;
  granted: boolean;
  policy_version?: string | null;
  source_url?: string | null;
  recorded_at: string;
}

export type MarketingChannel = 'email' | 'sms';

export interface ContactDecision {
  allowed: boolean;
  reason:
    | 'consented'
    | 'suppressed'
    | 'no_consent_record'
    | 'consent_withdrawn'
    | 'reconfirmation_required'
    | 'missing_policy_version'
    | 'identity_mismatch'
    | 'invalid_consent_timestamp';
}

const CHANNEL_CONSENT: Record<MarketingChannel, ConsentType> = {
  email: 'email_marketing',
  sms: 'sms_marketing',
};

/**
 * Fail-closed marketing eligibility for one fan on one channel.
 *
 * - A suppression always wins.
 * - The most recent record for the channel's consent type decides.
 * - A withdrawn (granted=false) latest record blocks contact.
 * - Imported legacy permission never qualifies on its own: the fan must
 *   reconfirm through an explicit opt-in first.
 * - An explicit opt-in must carry the policy/copy version it agreed to.
 */
export function canSendMarketing(
  records: readonly ConsentRecord[],
  channel: MarketingChannel,
  opts: { suppressed: boolean; fanId: string; workspaceId: string },
): ContactDecision {
  // The server-side caller must resolve suppression and the fan's records
  // under an authenticated workspace; never trust client-supplied records.
  if (opts.suppressed) return { allowed: false, reason: 'suppressed' };
  if (
    !opts.fanId.trim() ||
    !opts.workspaceId.trim() ||
    records.some((r) => r.fan_id !== opts.fanId || r.workspace_id !== opts.workspaceId)
  ) {
    return { allowed: false, reason: 'identity_mismatch' };
  }
  if (records.some((r) => !Number.isFinite(Date.parse(r.recorded_at)))) {
    return { allowed: false, reason: 'invalid_consent_timestamp' };
  }
  const type = CHANNEL_CONSENT[channel];
  const latest = records
    .filter((r) => r.consent_type === type)
    .reduce<ConsentRecord | undefined>((acc, r) => {
      if (!acc) return r;
      const delta = Date.parse(r.recorded_at) - Date.parse(acc.recorded_at);
      // When timestamps tie, a withdrawal takes precedence over a grant.
      return delta > 0 || (delta === 0 && acc.granted && !r.granted) ? r : acc;
    }, undefined);
  if (!latest) return { allowed: false, reason: 'no_consent_record' };
  if (!latest.granted) return { allowed: false, reason: 'consent_withdrawn' };
  if (latest.basis !== 'explicit_opt_in') {
    return { allowed: false, reason: 'reconfirmation_required' };
  }
  if (!latest.policy_version) {
    return { allowed: false, reason: 'missing_policy_version' };
  }
  return { allowed: true, reason: 'consented' };
}

/* ------------------------------------------------------------------ */
/* Artist events (proposed: Encore)                                    */
/* ------------------------------------------------------------------ */

export type ArtistEventStatus =
  | 'scheduled'
  | 'postponed'
  | 'rescheduled'
  | 'cancelled';

export type ArtistEventSource =
  | 'artist_submitted'
  | 'venue_submitted'
  | 'ticketmaster'
  | 'jambase';

export interface ArtistEvent {
  id: string;
  /** → Artist.id. Encore never creates artists. */
  artist_id: string;
  /** ISO-8601 with offset, e.g. 2026-11-14T20:00:00-06:00. */
  starts_at: string;
  /** IANA zone of the venue, e.g. America/Chicago. */
  timezone: string;
  venue_name: string;
  city: string;
  region?: string;
  country: string;
  ticket_url?: string;
  status: ArtistEventStatus;
  source: ArtistEventSource;
  /** Native id in the source system, for dedupe and takedown. */
  source_id?: string;
}

/* ------------------------------------------------------------------ */
/* Artist verification (proposed)                                      */
/* ------------------------------------------------------------------ */

export type VerificationMethod =
  | 'official_domain'
  | 'linked_social_account'
  | 'spotify_for_artists'
  | 'distributor_evidence'
  | 'manual_review';

export type VerificationState = 'pending' | 'verified' | 'rejected' | 'revoked';

export interface ArtistVerification {
  id: string;
  artist_id: string;
  /** auth user who claimed the artist. */
  claimant_user_id: string;
  verification_method: VerificationMethod;
  state: VerificationState;
  /** → evidence_records.id; required before state can be `verified`. */
  evidence_ref?: string;
  decided_by?: string;
  decided_at?: string;
}

/** A verification counts only when verified with evidence and a decider. */
export function isVerifiedArtist(v: ArtistVerification | undefined): boolean {
  return Boolean(v && v.state === 'verified' && v.evidence_ref && v.decided_by);
}
