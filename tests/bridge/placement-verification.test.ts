import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasVerifiedLivePlacement, type NetworkPlacementEvidence } from '../../lib/bridge-contract';

const observedAt = '2026-10-10T20:00:00.000Z';
const placement: NetworkPlacementEvidence = {
  status: 'live',
  playlist_id: 'playlist-1',
  spotify_track_id: '4CzteKxZWpQw81hZPbUXj1',
  observed_track_id: 'observed-track-1',
  verified_live_at: observedAt,
  verification_source: 'spotify_owner_api',
  verification_evidence: {
    source: 'spotify_owner_api',
    snapshot_id: 'snapshot-1',
    observed_at: observedAt,
    playlist_id: 'playlist-1',
    spotify_track_id: '4CzteKxZWpQw81hZPbUXj1',
  },
};

test('source-backed observation qualifies for a verified-live label', () => {
  assert.equal(hasVerifiedLivePlacement(placement), true);
});
for (const status of ['scheduled', 'pending_verification', 'accepted', 'added', 'removed']) {
  test(`${status} is not verified live even with stale observed evidence`, () => {
    assert.equal(hasVerifiedLivePlacement({ ...placement, status }), false);
  });
}
test('curator assertion without an observation cannot claim live', () => {
  assert.equal(hasVerifiedLivePlacement({ ...placement, verified_live_at: null, observed_track_id: null, verification_source: null, verification_evidence: null }), false);
});
test('mismatched playlist or track evidence cannot claim live', () => {
  for (const changed of [{ playlist_id: 'other-playlist' }, { spotify_track_id: 'wrong-track' }]) {
    assert.equal(hasVerifiedLivePlacement({ ...placement, ...changed }), false);
  }
});
test('observation time cannot contradict the stored verified timestamp', () => {
  const verification_evidence = { ...(placement.verification_evidence as object), observed_at: '2026-10-09T20:00:00Z' };
  assert.equal(hasVerifiedLivePlacement({ ...placement, verification_evidence }), false);
});
test('unsupported or fabricated provider sources are rejected', () => {
  assert.equal(hasVerifiedLivePlacement({ ...placement, verification_source: 'curator_self_report', verification_evidence: { ...(placement.verification_evidence as object), source: 'curator_self_report' } }), false);
});
test('source identity and snapshot ID cannot be missing', () => {
  const verification_evidence = { ...(placement.verification_evidence as object), snapshot_id: '' };
  assert.equal(hasVerifiedLivePlacement({ ...placement, verification_evidence }), false);
});
