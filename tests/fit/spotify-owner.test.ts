import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorizeUrl, checkScopes, evidenceHash, extractObservation, signState, verifyState } from '../../supabase/functions/_shared/spotify-owner.ts';

const KEY = 'test-signing-key';
const ID_A = '4uLU6hMCjMI75M1A2tKUQC';
const ID_B = '7ouMYWpwJ422jRcDASZB7P';

test('state round-trips and names the admin', async () => {
  const s = await signState(KEY, 'user-1');
  assert.deepEqual(await verifyState(KEY, s), { userId: 'user-1' });
});

test('state rejects tampering, wrong key and expiry', async () => {
  const s = await signState(KEY, 'user-1', 1_000, 60_000);
  const [p, sig] = s.split('.');
  const forged = Buffer.from(JSON.stringify({ u: 'attacker', exp: 9e15, n: 'x' })).toString('base64url');
  assert.equal(((await verifyState(KEY, forged + '.' + sig, 2_000)) as any).error, 'state_invalid');
  assert.equal(((await verifyState('other-key', s, 2_000)) as any).error, 'state_invalid');
  assert.equal(((await verifyState(KEY, s, 1_000 + 60_001)) as any).error, 'state_expired');
  assert.equal(((await verifyState(KEY, p, 2_000)) as any).error, 'state_malformed');
});

test('authorize URL asks only for playlist-read-private', () => {
  const u = new URL(authorizeUrl('cid', 'https://x.supabase.co/functions/v1/bvss-spotify-owner/callback', 'st'));
  assert.equal(u.origin + u.pathname, 'https://accounts.spotify.com/authorize');
  assert.equal(u.searchParams.get('scope'), 'playlist-read-private');
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://x.supabase.co/functions/v1/bvss-spotify-owner/callback');
});

test('granted scopes: read-only required, modify refused', () => {
  assert.equal(checkScopes('playlist-read-private').ok, true);
  assert.equal(checkScopes('playlist-read-private playlist-read-collaborative').ok, true);
  assert.equal(checkScopes('').ok, false);
  assert.equal((checkScopes('playlist-read-private playlist-modify-public') as any).error, 'scope_broader_than_read_only');
  assert.equal((checkScopes('playlist-read-private user-read-email') as any).error, 'scope_broader_than_read_only');
});

test('extraction keeps only ids, positions and added time across pages and item shapes', () => {
  const r = extractObservation([
    { items: [
      { added_at: '2026-10-04T10:00:00Z', item: { id: ID_A, type: 'track', name: 'Never Alone', artists: [{ name: 'Middle Child' }] } },
      { added_at: '2026-10-04T10:00:00Z', item: { id: 'ep1', type: 'episode' } },
    ] },
    { items: [
      { added_at: '2026-10-04T11:00:00Z', track: { id: ID_B, type: 'track' } },
      { added_at: null, is_local: true, track: { id: null, type: 'track' } },
    ] },
  ]);
  assert.deepEqual(r.tracks, [
    { spotify_track_id: ID_A, position: 0, added_at: '2026-10-04T10:00:00Z' },
    { spotify_track_id: ID_B, position: 2, added_at: '2026-10-04T11:00:00Z' },
  ]);
  assert.equal(r.total_entries, 4);
  assert.equal(r.skipped_entries, 2);
  assert.ok(!JSON.stringify(r.tracks).includes('Never Alone'), 'no titles or artists carried');
});

test('evidence hash changes with order or snapshot, not with anything else', async () => {
  const t = [{ spotify_track_id: ID_A, position: 0, added_at: null }, { spotify_track_id: ID_B, position: 1, added_at: null }];
  const h1 = await evidenceHash('pl', 'snap1', t);
  assert.equal(h1, await evidenceHash('pl', 'snap1', t.map((x) => ({ ...x, added_at: '2026-01-01T00:00:00Z' }))));
  assert.notEqual(h1, await evidenceHash('pl', 'snap2', t));
  assert.notEqual(h1, await evidenceHash('pl', 'snap1', [{ ...t[1], position: 0 }, { ...t[0], position: 1 }]));
  assert.match(h1, /^[0-9a-f]{64}$/);
});
