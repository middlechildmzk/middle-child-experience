// Pure helpers for the Spotify owner connection (verification only).
// Web Crypto only, so the same code runs in Deno edge functions and Node tests.

export const SPOTIFY_SCOPES = ['playlist-read-private'] as const;
export const OBSERVATION_METHOD = 'spotify_owner_api:GET /v1/playlists/{id}/items';

const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function hmac(key: string, data: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
export async function sha256Hex(value: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Signed, expiring OAuth state that names the admin who started the connection. */
export async function signState(key: string, userId: string, nowMs = Date.now(), ttlMs = 10 * 60 * 1000) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const payload = b64url(enc.encode(JSON.stringify({ u: userId, exp: nowMs + ttlMs, n: b64url(nonce) })));
  return payload + '.' + b64url(await hmac(key, payload));
}

export async function verifyState(key: string, state: string, nowMs = Date.now()): Promise<{ userId: string } | { error: string }> {
  const [payload, sig] = String(state || '').split('.');
  if (!payload || !sig) return { error: 'state_malformed' };
  const expected = b64url(await hmac(key, payload));
  if (expected.length !== sig.length) return { error: 'state_invalid' };
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return { error: 'state_invalid' };
  let body: { u?: string; exp?: number };
  try { body = JSON.parse(new TextDecoder().decode(fromB64url(payload))); } catch { return { error: 'state_malformed' }; }
  if (!body.u || typeof body.exp !== 'number') return { error: 'state_malformed' };
  if (body.exp < nowMs) return { error: 'state_expired' };
  return { userId: body.u };
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(' '),
    state,
    show_dialog: 'true',
  });
  return 'https://accounts.spotify.com/authorize?' + q.toString();
}

/** Granted scopes must include playlist-read-private and nothing that can modify. */
export function checkScopes(granted: string) {
  const scopes = String(granted || '').split(/\s+/).filter(Boolean);
  if (!scopes.includes('playlist-read-private')) return { ok: false as const, error: 'missing_playlist_read_scope', scopes };
  if (scopes.some((s) => s.includes('modify') || s.startsWith('user-'))) return { ok: false as const, error: 'scope_broader_than_read_only', scopes };
  return { ok: true as const, scopes };
}

export type ObservedTrack = { spotify_track_id: string; position: number; added_at: string | null };

/**
 * Turn playlist item pages into verification facts only: Spotify track id,
 * 0-based position in the playlist and the added time. Episodes, local files
 * and unavailable entries keep their position but are not recorded.
 * Accepts both the current item shape ({ item }) and the older ({ track }).
 */
export function extractObservation(pages: Array<{ items?: any[] }>) {
  const tracks: ObservedTrack[] = [];
  let position = 0;
  let skipped = 0;
  for (const page of pages) {
    for (const entry of page.items || []) {
      const obj = entry?.item ?? entry?.track ?? null;
      const id = obj?.id;
      const type = obj?.type ?? 'track';
      if (type === 'track' && typeof id === 'string' && /^[A-Za-z0-9]{22}$/.test(id) && !entry?.is_local) {
        tracks.push({ spotify_track_id: id, position, added_at: typeof entry?.added_at === 'string' ? entry.added_at : null });
      } else {
        skipped++;
      }
      position++;
    }
  }
  return { tracks, total_entries: position, skipped_entries: skipped };
}

/** Evidence reference: hash of exactly what was observed (playlist, version, ordered ids). */
export function evidenceHash(spotifyPlaylistId: string, snapshotId: string | null, tracks: ObservedTrack[]) {
  return sha256Hex(JSON.stringify({ playlist: spotifyPlaylistId, snapshot_id: snapshotId, ids: tracks.map((t) => [t.position, t.spotify_track_id]) }));
}
