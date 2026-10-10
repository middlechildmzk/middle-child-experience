import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePlacementRow } from '../../lib/bridge/adapters/bvss';

const observed = '2026-10-10T21:00:00.000Z';
const base = {
  id: 'placement-1',
  playlist_id: 'playlist-1',
  spotify_track_id: '4CzteKxZWpQw81hZPbUXj1',
  status: 'scheduled',
  placed_at: null,
  actual_position: null,
  scheduled_for: '2026-10-15',
  verified_live_at: null,
  verification_source: null,
  verification_evidence: null,
  observed_track_id: null,
  updated_at: observed,
};
const verified = {
  ...base,
  status: 'live',
  placed_at: observed,
  actual_position: 7,
  verified_live_at: observed,
  observed_track_id: 'observed-track-1',
  verification_source: 'spotify_owner_api',
  verification_evidence: {
    source: 'spotify_owner_api',
    playlist_id: base.playlist_id,
    spotify_track_id: base.spotify_track_id,
    observed_at: observed,
    snapshot_id: 'approved-snapshot-1',
  },
};

test('a scheduled acceptance never produces an added date, chart position, or live state', () => {
  const p = normalizePlacementRow(base);
  assert.equal(p.data.verification_state, 'scheduled');
  assert.equal(p.data.added_at, undefined);
  assert.equal(p.data.track_position, undefined);
  assert.equal(p.data.track_id, undefined);
  assert.equal(p.raw?.['status'], 'scheduled');
  assert.equal(p.provenance.source_ref, 'bvss_playlist_placements');
});

test('a source-observed placement can show live state and position', () => {
  const p = normalizePlacementRow(verified);
  assert.equal(p.data.verification_state, 'verified_live');
  assert.equal(p.data.added_at, observed);
  assert.equal(p.data.track_position, 7);
  // Spotify's external ID and BVSS observed-track UUID are not ArtistOS Track.id.
  assert.equal(p.data.track_id, undefined);
  assert.equal(p.raw?.['spotify_track_id'], base.spotify_track_id);
});

test('a native live claim without source evidence never becomes verified', () => {
  const p = normalizePlacementRow({ ...verified, verification_evidence: null });
  assert.equal(p.data.verification_state, 'unverified_live_claim');
  assert.equal(p.data.added_at, undefined);
  assert.equal(p.data.track_position, undefined);
});

test('a mismatched observation playlist does not qualify as verified', () => {
  const p = normalizePlacementRow({
    ...verified,
    verification_evidence: { ...verified.verification_evidence, playlist_id: 'different-playlist' },
  });
  assert.equal(p.data.verification_state, 'unverified_live_claim');
});

test('pending verification remains pending even when an old snapshot exists', () => {
  const p = normalizePlacementRow({ ...verified, status: 'pending_verification' });
  assert.equal(p.data.verification_state, 'pending_verification');
  assert.equal(p.data.added_at, undefined);
});

test('removed is preserved, and removal date is not lost', () => {
  const removedAt = '2026-10-11T22:00:00.000Z';
  const p = normalizePlacementRow({ ...verified, status: 'removed', removed_at: removedAt });
  assert.equal(p.data.verification_state, 'removed');
  assert.equal(p.data.added_at, undefined);
  assert.equal(p.data.removed_at, removedAt);
});

test('unknown statuses remain unknown and cannot fabricate an outcome', () => {
  const p = normalizePlacementRow({ ...base, status: 'custom-state' });
  assert.equal(p.data.verification_state, 'custom-state');
  assert.equal(p.data.added_at, undefined);
});

test('missing status is never interpreted as verified placement', () => {
  const p = normalizePlacementRow({ id: 'p', playlist_id: 'x' });
  assert.equal(p.data.verification_state, 'unknown');
  assert.equal(p.data.track_position, undefined);
});
