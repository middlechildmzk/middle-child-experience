/**
 * Suite shared-contract tests — run with `npm run bridge:smoke`.
 * Pure functions only; no network, no database.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SUITE_OWNERSHIP,
  canSendMarketing,
  isVerifiedArtist,
  writeAuthorityFor,
  type ConsentRecord,
  type SuiteEntity,
} from '../../lib/bridge-contract';

const base = { fan_id: 'f1', workspace_id: 'w1' } as const;
const scope = { fanId: base.fan_id, workspaceId: base.workspace_id } as const;

test('every shared entity has exactly one write authority', () => {
  for (const [key, own] of Object.entries(SUITE_OWNERSHIP)) {
    assert.equal(own.entity, key);
    assert.ok(own.write_authority, `${key} has no owner`);
    assert.ok(own.readers.length > 0, `${key} has no readers`);
  }
});

test('submissions stay with BVSS; ArtistOS may not become a second writer', () => {
  assert.equal(writeAuthorityFor('curator_submission', 'bvss').allowed, true);
  const artistos = writeAuthorityFor('curator_submission', 'artistos');
  assert.equal(artistos.allowed, false);
  assert.equal(artistos.reason, 'not_owner');
});

test('campaign writes wait for the ledger reconciliation verdict', () => {
  const d = writeAuthorityFor('campaign', 'artistos');
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'pending_reconciliation');
});

test('proposed entities cannot be written by anyone yet', () => {
  for (const entity of ['artist_event', 'artist_verification'] as SuiteEntity[]) {
    const owner = SUITE_OWNERSHIP[entity].write_authority;
    const d = writeAuthorityFor(entity, owner);
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'proposed_no_table');
  }
});

test('fan PII and consent are readable by ArtistOS only', () => {
  assert.deepEqual(SUITE_OWNERSHIP.audience_member.readers, ['artistos']);
  assert.deepEqual(SUITE_OWNERSHIP.consent_record.readers, ['artistos']);
});

test('explicit email opt-in with policy version allows email', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
  ];
  assert.deepEqual(canSendMarketing(r, 'email', { ...scope, suppressed: false }), { allowed: true, reason: 'consented' });
});

test('email consent never authorizes SMS', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
  ];
  assert.equal(canSendMarketing(r, 'sms', { ...scope, suppressed: false }).reason, 'no_consent_record');
});

test('suppression beats consent', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
  ];
  assert.equal(canSendMarketing(r, 'email', { ...scope, suppressed: true }).reason, 'suppressed');
});

test('imported legacy list permission requires reconfirmation', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'imported_legacy', granted: true, policy_version: null, recorded_at: '2026-07-12T00:00:00Z' },
  ];
  assert.equal(canSendMarketing(r, 'email', { ...scope, suppressed: false }).reason, 'reconfirmation_required');
});

test('the latest record wins, so a later withdrawal blocks contact', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-09-01T00:00:00Z' },
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: false, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
  ];
  assert.equal(canSendMarketing(r, 'email', { ...scope, suppressed: false }).reason, 'consent_withdrawn');
});

test('explicit opt-in without a policy version fails closed', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, recorded_at: '2026-10-01T00:00:00Z' },
  ];
  assert.equal(canSendMarketing(r, 'email', { ...scope, suppressed: false }).reason, 'missing_policy_version');
});

test('one fan cannot inherit a different fan\'s marketing permission', () => {
  const r: ConsentRecord[] = [
    { fan_id: 'another-fan', workspace_id: 'w1', consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
  ];
  assert.deepEqual(canSendMarketing(r, 'email', { ...scope, suppressed: false }), { allowed: false, reason: 'identity_mismatch' });
});

test('a mixed-workspace consent collection fails closed', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
    { fan_id: 'f1', workspace_id: 'w2', consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-02T00:00:00Z' },
  ];
  assert.equal(canSendMarketing(r, 'email', { ...scope, suppressed: false }).reason, 'identity_mismatch');
});

test('invalid timestamps fail closed rather than hide a withdrawal', () => {
  const r: ConsentRecord[] = [
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' },
    { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: false, policy_version: 'v1', recorded_at: 'not-a-time' },
  ];
  assert.equal(canSendMarketing(r, 'email', { ...scope, suppressed: false }).reason, 'invalid_consent_timestamp');
});

test('withdrawal wins a same-timestamp conflict regardless of record order', () => {
  const grant: ConsentRecord = { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' };
  const revoke: ConsentRecord = { ...grant, granted: false };
  assert.equal(canSendMarketing([grant, revoke], 'email', { ...scope, suppressed: false }).reason, 'consent_withdrawn');
  assert.equal(canSendMarketing([revoke, grant], 'email', { ...scope, suppressed: false }).reason, 'consent_withdrawn');
});

test('blank fan or workspace identity never permits marketing', () => {
  const grant: ConsentRecord = { ...base, consent_type: 'email_marketing', basis: 'explicit_opt_in', granted: true, policy_version: 'v1', recorded_at: '2026-10-01T00:00:00Z' };
  assert.equal(canSendMarketing([grant], 'email', { ...scope, fanId: '', suppressed: false }).reason, 'identity_mismatch');
  assert.equal(canSendMarketing([grant], 'email', { ...scope, workspaceId: '', suppressed: false }).reason, 'identity_mismatch');
});

test('artist verification needs state, evidence and a decider', () => {
  const v = { id: 'v', artist_id: 'a', claimant_user_id: 'u', verification_method: 'official_domain' as const };
  assert.equal(isVerifiedArtist(undefined), false);
  assert.equal(isVerifiedArtist({ ...v, state: 'verified' }), false);
  assert.equal(isVerifiedArtist({ ...v, state: 'verified', evidence_ref: 'e' }), false);
  assert.equal(isVerifiedArtist({ ...v, state: 'pending', evidence_ref: 'e', decided_by: 'd' }), false);
  assert.equal(isVerifiedArtist({ ...v, state: 'verified', evidence_ref: 'e', decided_by: 'd' }), true);
});
