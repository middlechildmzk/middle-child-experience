/**
 * P0: normalize live ArtistOS fan_consents rows into suite consent facts.
 *
 * Pure and fail-closed: NO HTTP, DB writes, messaging or authentication.
 * Live fan_consents contains evidence JSON, not a "basis" column. Basis is
 * derived from known, reviewed ArtistOS public-link evidence, never inferred
 * from the existing fans.consent_status or imported-list descriptions.
 *
 * The trusted caller must query a single authenticated workspace/fan,
 * resolve suppression, and independently verify contact ownership.
 */
import type { ConsentRecord, ConsentType } from './suite';

export interface StoredFanConsentRow {
  fan_id: unknown;
  workspace_id: unknown;
  consent_type: unknown;
  granted: unknown;
  policy_version: unknown;
  source_url: unknown;
  evidence: unknown;
  recorded_at: unknown;
}

export type ConsentEvidenceResult =
  | { ok: true; records: ConsentRecord[] }
  | { ok: false; reason: 'identity_mismatch' | 'invalid_stored_row' };

const CONSENT_TYPES: ReadonlySet<string> = new Set([
  'email_marketing', 'sms_marketing', 'privacy_terms', 'analytics',
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isExplicitPublicLinkOptIn(row: StoredFanConsentRow): boolean {
  // The only *currently confirmed* form-backed marketing flow is email.
  // SMS, imports, and unknown evidence stay unapproved until their source
  // contract has been audited. Do not infer permission from legacy flags.
  if (row.consent_type !== 'email_marketing' || row.granted !== true) return false;
  if (typeof row.policy_version !== 'string' || !row.policy_version.trim()) return false;
  if (typeof row.source_url !== 'string') return false;
  const link = /^\/l\/([a-z0-9-]+)$/.exec(row.source_url);
  if (!link || !isRecord(row.evidence)) return false;
  return (
    row.evidence.form_version === 'artistos-public-link-v1' &&
    row.evidence.action === 'email_updates_checked' &&
    row.evidence.smart_link_slug === link[1]
  );
}

/**
 * Reconciles the REAL stored schema with ConsentRecord.
 *
 * Never silently drop an invalid record: doing so could hide a later
 * withdrawal and incorrectly leave an older grant as the latest decision.
 * This parser fails the entire set on malformed rows, timestamps or scope.
 */
export function decodeStoredConsentEvidence(
  rows: readonly StoredFanConsentRow[],
  scope: { fanId: string; workspaceId: string },
): ConsentEvidenceResult {
  if (!scope.fanId?.trim() || !scope.workspaceId?.trim()) {
    return { ok: false, reason: 'identity_mismatch' };
  }
  const records: ConsentRecord[] = [];
  for (const row of rows) {
    if (row.fan_id !== scope.fanId || row.workspace_id !== scope.workspaceId) {
      return { ok: false, reason: 'identity_mismatch' };
    }
    if (
      typeof row.consent_type !== 'string' ||
      !CONSENT_TYPES.has(row.consent_type) ||
      typeof row.granted !== 'boolean' ||
      typeof row.recorded_at !== 'string' ||
      !Number.isFinite(Date.parse(row.recorded_at)) ||
      (row.policy_version !== null && typeof row.policy_version !== 'string') ||
      (row.source_url !== null && typeof row.source_url !== 'string') ||
      !isRecord(row.evidence)
    ) {
      return { ok: false, reason: 'invalid_stored_row' };
    }
    records.push({
      fan_id: scope.fanId,
      workspace_id: scope.workspaceId,
      consent_type: row.consent_type as ConsentType,
      granted: row.granted,
      policy_version: row.policy_version,
      source_url: row.source_url,
      recorded_at: row.recorded_at,
      basis: isExplicitPublicLinkOptIn(row) ? 'explicit_opt_in' : 'imported_legacy',
    });
  }
  return { ok: true, records };
}
