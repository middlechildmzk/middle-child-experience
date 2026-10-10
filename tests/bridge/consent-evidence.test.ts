import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canSendMarketing,
  decodeStoredConsentEvidence,
  type StoredFanConsentRow,
} from '../../lib/bridge-contract';

const scope = { fanId: 'fan-1', workspaceId: 'workspace-1' } as const;
const validRow: StoredFanConsentRow = {
  fan_id: scope.fanId,
  workspace_id: scope.workspaceId,
  consent_type: 'email_marketing',
  granted: true,
  policy_version: 'artistos-v1',
  source_url: '/l/new-song',
  recorded_at: '2026-10-10T18:00:00.000Z',
  evidence: {
    form_version: 'artistos-public-link-v1',
    action: 'email_updates_checked',
    smart_link_slug: 'new-song',
    email_confirmation_status: 'unverified',
  },
};

test('maps the deployed ArtistOS public-link consent row without inventing a basis column', () => {
  const result = decodeStoredConsentEvidence([validRow], scope);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].basis, 'explicit_opt_in');
  assert.equal(result.records[0].policy_version, 'artistos-v1');
});

test('a form opt-in is NOT send-ready until contact ownership is verified', () => {
  const result = decodeStoredConsentEvidence([validRow], scope);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    canSendMarketing(result.records, 'email', { ...scope, suppressed: false, contactVerified: false }),
    { allowed: false, reason: 'contact_unverified' },
  );
  assert.deepEqual(
    canSendMarketing(result.records, 'email', { ...scope, suppressed: false, contactVerified: true }),
    { allowed: true, reason: 'consented' },
  );
});

test('unknown or imported evidence never fabricates explicit opt-in', () => {
  const result = decodeStoredConsentEvidence([{ ...validRow, evidence: { import_file: 'old-list.csv', action: 'imported' } }], scope);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.records[0].basis, 'imported_legacy');
  assert.equal(canSendMarketing(result.records, 'email', { ...scope, suppressed: false, contactVerified: true }).reason, 'reconfirmation_required');
});

test('a mismatched smart link slug does not verify consent evidence', () => {
  const result = decodeStoredConsentEvidence([{ ...validRow, source_url: '/l/different-song' }], scope);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.records[0].basis, 'imported_legacy');
});

test('SMS cannot borrow an email-marketing consent form', () => {
  const result = decodeStoredConsentEvidence([{ ...validRow, consent_type: 'sms_marketing' }], scope);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.records[0].basis, 'imported_legacy');
    assert.equal(canSendMarketing(result.records, 'sms', { ...scope, suppressed: false, contactVerified: true }).reason, 'reconfirmation_required');
  }
});

test('a record from another tenant fails the entire consent set', () => {
  const result = decodeStoredConsentEvidence([
    validRow,
    { ...validRow, workspace_id: 'other-workspace', granted: false, recorded_at: '2026-10-11T18:00:00.000Z' },
  ], scope);
  assert.deepEqual(result, { ok: false, reason: 'identity_mismatch' });
});

test('malformed recent withdrawal fails the set rather than silently restoring old opt-in', () => {
  const result = decodeStoredConsentEvidence([
    validRow,
    { ...validRow, granted: false, recorded_at: 'not-a-date' },
  ], scope);
  assert.deepEqual(result, { ok: false, reason: 'invalid_stored_row' });
});

test('unknown consent types fail closed and are not silently discarded', () => {
  assert.deepEqual(
    decodeStoredConsentEvidence([{ ...validRow, consent_type: 'unapproved_channel' }], scope),
    { ok: false, reason: 'invalid_stored_row' },
  );
});

test('suppression still overrides validated consent evidence', () => {
  const result = decodeStoredConsentEvidence([validRow], scope);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(canSendMarketing(result.records, 'email', { ...scope, suppressed: true, contactVerified: true }).reason, 'suppressed');
});

test('an empty consent set is not marketing permission', () => {
  const result = decodeStoredConsentEvidence([], scope);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(canSendMarketing(result.records, 'email', { ...scope, suppressed: false, contactVerified: true }).reason, 'no_consent_record');
});
