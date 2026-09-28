/**
 * Tranche 2 smoke tests — run with `npm run bridge:smoke`.
 *
 * ArtistOS and BVSS fixtures are REAL read shapes captured read-only from
 * artistos-core on 2026-09-28 (see each fixture's `_provenance`).
 * CuratorFit has no live database anywhere, so its rows are built from the
 * repo DDL (supabase/schema.sql @ c675dd3) — labeled as such below; there is
 * no observed CuratorFit read shape to use.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { mapNativeStatus } from '../../lib/bridge-contract';
import {
  ARTISTOS_AUTHORITY_VERDICT,
  artistosConfigFromEnv,
  fetchArtistosPlacements,
  normalizeArtistosArtist,
  normalizeArtistosCampaign,
  normalizeArtistosCampaignTarget,
  normalizeArtistosEvidence,
  normalizeArtistosOutcome,
  normalizeArtistosPlacement,
  normalizeArtistosRelease,
  normalizeArtistosSubmission,
} from '../../lib/bridge/adapters/artistos';
import {
  curatorfitConfigFromEnv,
  fetchCuratorfitTargets,
  normalizeCuratorfitCampaignTarget,
  normalizeCuratorfitCurator,
  normalizeCuratorfitSubmission,
  normalizeCuratorfitTarget,
} from '../../lib/bridge/adapters/curatorfit';
import {
  fetchPlaylists,
  normalizeMetricSnapshot,
  normalizePlaylist,
  parseMetricSnapshotRows,
  promotionTargetForPlaylist,
} from '../../lib/bridge/adapters/bvss';
import { buildReadUrl } from '../../lib/bridge/postgrest-read';
import { BridgeValidationError, parseAt, parseRowsAt } from '../../lib/bridge/validation/core';
import {
  artistosArtistRowSchema,
  artistosCampaignRowSchema,
  artistosCampaignSubmissionRowSchema,
  artistosCampaignTargetRowSchema,
  artistosEvidenceRowSchema,
  artistosOutcomeRowSchema,
  artistosPlacementRowSchema,
  artistosReleaseRowSchema,
} from '../../lib/bridge/validation/artistos';
import {
  curatorfitCampaignTargetRowSchema,
  curatorfitCuratorProfileRowSchema,
  curatorfitPromotionTargetRowSchema,
  curatorfitSubmissionRowSchema,
} from '../../lib/bridge/validation/curatorfit';
import { bvssPlaylistRecordSchema } from '../../lib/bridge/validation/bvss';
import type { PlaylistRecord } from '../../lib/playlist-os';

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const A = load('artistos-live-2026-09-28.json');
const B = load('bvss-live-2026-09-28.json');

/* ---------------- fetch mock: records every request ---------------- */

type Seen = { url: string; method: string; hasBody: boolean; headers: Record<string, string> };
function mockFetch(respond: (url: string) => unknown): Seen[] {
  const seen: Seen[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push({
      url,
      method: init?.method ?? 'GET',
      hasBody: init !== undefined && 'body' in init,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return new Response(JSON.stringify(respond(url)), { status: 200 });
  }) as typeof fetch;
  return seen;
}

/* ============================ ArtistOS ============================= */

test('ArtistOS: real rows validate and normalize with provenance + raw', () => {
  const artists = parseRowsAt('t', artistosArtistRowSchema, A.artists).map(normalizeArtistosArtist);
  const mc = artists.find((a) => a.data.name === 'Middle Child')!;
  assert.equal(mc.provenance.source_system, 'artistos');
  assert.equal(mc.provenance.source_id, '9857b77c-f702-4e1e-9eb2-88dd9a543ee8');
  assert.equal(mc.provenance.authority, 'source-of-record');
  assert.equal(mc.provenance.provenance, 'imported');
  assert.match(mc.provenance.note!, new RegExp(ARTISTOS_AUTHORITY_VERDICT));
  assert.equal(mc.data.spotify_url, undefined, 'null stays missing, not invented');
  assert.deepEqual(mc.raw, A.artists[0], 'native row preserved verbatim');

  const releases = parseRowsAt('t', artistosReleaseRowSchema, A.releases).map(normalizeArtistosRelease);
  const na = releases.find((r) => r.data.title === 'Never Alone')!;
  assert.equal(na.data.isrc, 'QT6EX2615333');
  assert.equal(na.data.upc, '882877618355');
  assert.equal(na.data.status, 'released', 'native release status verbatim');
});

test('ArtistOS campaigns are readable but never campaign authority', () => {
  const [c] = parseRowsAt('t', artistosCampaignRowSchema, A.campaigns).map(normalizeArtistosCampaign);
  assert.equal(c.provenance.authority, 'unresolved');
  assert.match(c.provenance.note!, /source-controlled manifest/);
  assert.equal(c.data.status, 'active');
});

test('ArtistOS placements: no fabricated follower-at-placement, native verification not promoted', () => {
  const rows = parseRowsAt('t', artistosPlacementRowSchema, A.playlist_placements);
  const [p] = rows.map(normalizeArtistosPlacement);
  assert.equal(p.data.follower_count_at_placement, undefined);
  assert.equal(p.data.playlist_id, undefined, 'external playlist, not a BVSS Playlist FK');
  assert.equal(p.data.verification_state, 'verified', 'native value preserved');
  assert.equal(p.provenance.provenance, 'imported', 'label NOT promoted to verified');
  assert.equal(p.provenance.confidence, 1);
  assert.equal(p.raw!.followers, null);
});

test('ArtistOS evidence: numeric confidence from confidence_score; text grade kept in raw', () => {
  const [e] = parseRowsAt('t', artistosEvidenceRowSchema, A.evidence_records).map(normalizeArtistosEvidence);
  assert.equal(e.data.confidence, 0.95);
  assert.equal(e.raw!.confidence, 'supported');
  const nullScore = normalizeArtistosEvidence(
    parseAt('t', artistosEvidenceRowSchema, { ...A.evidence_records[0], confidence_score: null }),
  );
  assert.equal(nullScore.data.confidence, undefined, 'missing score stays missing');
});

test('ArtistOS outcomes are NOT forced into contract Outcome (contract gap)', () => {
  const [o] = parseRowsAt('t', artistosOutcomeRowSchema, A.outcomes).map(normalizeArtistosOutcome);
  assert.equal(o.data.outcome_type_native, 'press_mention');
  assert.equal(o.provenance.authority, 'unresolved');
  assert.equal('submission_id' in o.data, false);
});

test('ArtistOS campaign_targets and campaign_submissions use separate status namespaces', () => {
  const ct = parseAt('t', artistosCampaignTargetRowSchema, {
    id: 'ct1', campaign_id: 'c1', target_kind: 'property', target_id: 'p1', status: 'queued',
    added_at: '2026-09-28T00:00:00Z', updated_at: '2026-09-28T00:00:00Z', notes: null, workspace_id: null,
  });
  const nct = normalizeArtistosCampaignTarget(ct);
  assert.equal(nct.data.status_normalized, 'shortlisted');
  assert.equal(nct.data.target_id, 'artistos:property:p1');

  const replied = normalizeArtistosCampaignTarget({ ...ct, status: 'replied' });
  assert.equal(replied.data.status_normalized, 'responded');
  assert.equal(mapNativeStatus('replied', 'artistos'), undefined);
  assert.equal(mapNativeStatus('in_review', 'artistos_campaign_target'), undefined);

  const sub = parseAt('t', artistosCampaignSubmissionRowSchema, {
    id: 's1', workspace_id: 'w', campaign_id: 'c1', release_id: 'r1', campaign_target_id: 'ct1',
    property_id: 'p1', professional_profile_id: null, submission_mode: 'marketplace',
    status: 'promotion_committed', match_score: 80, match_reasons: [], response_due_at: null,
    submitted_at: '2026-09-28T00:00:00Z', completed_at: null,
    created_at: '2026-09-28T00:00:00Z', updated_at: '2026-09-28T00:00:00Z',
  });
  const ns = normalizeArtistosSubmission(sub);
  assert.equal(ns.data.status_normalized, 'accepted');
  assert.equal(ns.data.status_native, 'promotion_committed');
  assert.equal(ns.data.follow_up_at, undefined, 'response_due_at is not a follow-up date');

  const weird = normalizeArtistosSubmission({ ...sub, status: 'constructor' });
  assert.equal(weird.data.status_normalized, 'unknown', 'prototype keys never map');
  assert.equal(weird.provenance.provenance, 'unknown');
});

test('ArtistOS fetch: GET only, explicit columns, validated, key required', async () => {
  assert.throws(() => artistosConfigFromEnv({}), /not configured/);
  const seen = mockFetch(() => A.playlist_placements);
  const out = await fetchArtistosPlacements('47210a7f-d595-4ec4-8d7b-639e0049dd16', {
    url: 'https://example.supabase.co', key: 'test-key',
  });
  assert.equal(out.length, 2);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].method, 'GET');
  assert.equal(seen[0].hasBody, false);
  assert.match(seen[0].url, /\/rest\/v1\/playlist_placements\?select=/);
  assert.match(seen[0].url, /release_id=eq\.47210a7f/);
  assert.doesNotMatch(seen[0].url, /contact_email|select=\*/, 'PII columns never selected');

  mockFetch(() => [A.playlist_placements[0], { ...A.playlist_placements[1], confidence: 'high' }]);
  await assert.rejects(
    fetchArtistosPlacements('x', { url: 'https://example.supabase.co', key: 'k' }),
    (err: unknown) => err instanceof BridgeValidationError && /\[1\]\.confidence/.test(err.message),
  );
});

/* =========================== CuratorFit ============================ */

const cfTarget = {
  id: 't1', curator_id: null, type: 'spotify_playlist', external_id: null,
  url: 'https://open.spotify.com/playlist/example', slug: 'example-melodic-bass', name: 'Example Melodic Bass',
  description: null, genre: 'melodic bass', genres: [], moods: ['emotional'], fit_tags: [],
  audience_size_label: null, audience_count: 1200, contact_method: null, submission_rules: null,
  fit_notes: null, risk_notes: null, source_url: null, verification_notes: null, last_reviewed_at: null,
  status: 'seed', risk_level: 'review', trust_score: 50, update_signal: null, last_checked_at: null,
  created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-02T00:00:00Z',
};

test('CuratorFit: targets normalize as external, unresolved, trust kept out of confidence', () => {
  const t = normalizeCuratorfitTarget(parseAt('t', curatorfitPromotionTargetRowSchema, cfTarget));
  assert.equal(t.data.id, 'tgt-cf-t1');
  assert.equal(t.data.target_source, 'curatorfit_external');
  assert.equal(t.data.channel, 'spotify_playlist');
  assert.deepEqual(t.data.genres, ['melodic bass'], 'falls back to single genre when array empty');
  assert.equal(t.data.status, 'seed', 'native target_status verbatim');
  assert.equal(t.provenance.authority, 'unresolved');
  assert.equal(t.provenance.confidence, undefined, 'trust_score is not source confidence');
  assert.equal(t.raw!.trust_score, 50);
});

test('CuratorFit: enum drift in DDL-typed fields is rejected', () => {
  assert.throws(
    () => parseAt('t', curatorfitPromotionTargetRowSchema, { ...cfTarget, type: 'instagram_creator' }),
    BridgeValidationError,
    'instagram_creator exists in the app seed type but NOT in the DB enum',
  );
});

test('CuratorFit: curator, campaign target, submission use the curatorfit namespace', () => {
  const c = normalizeCuratorfitCurator(parseAt('t', curatorfitCuratorProfileRowSchema, {
    id: 'cp1', display_name: 'Example Curator', bio: null, website_url: null,
    instagram_url: 'https://instagram.com/example', tiktok_url: null, youtube_url: null,
    accepted_genres: ['melodic bass'], accepted_channels: ['spotify_playlist'], hard_nos: ['brostep'],
    status: 'unclaimed', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
  }));
  assert.equal(c.data.curator_side, 'curatorfit_external');
  assert.deepEqual(c.data.hard_nos, ['brostep']);
  assert.deepEqual(c.data.social_links, { instagram: 'https://instagram.com/example' });

  const ct = normalizeCuratorfitCampaignTarget(parseAt('t', curatorfitCampaignTargetRowSchema, {
    id: 'ct1', campaign_id: 'c1', promotion_target_id: 't1', playlist_id: null, channel: 'spotify_playlist',
    fit_score: 72, pitch_status: 'follow_up', response_notes: null,
    follow_up_at: '2026-10-05T00:00:00Z', created_at: '2026-09-28T00:00:00Z',
  }));
  assert.equal(ct.data.status_normalized, 'responded');
  assert.equal(ct.data.target_id, 'tgt-cf-t1', 'joins to the normalized target id');
  assert.equal(ct.data.follow_up_at, '2026-10-05T00:00:00Z');

  const sub = normalizeCuratorfitSubmission(parseAt('t', curatorfitSubmissionRowSchema, {
    id: 's1', campaign_id: 'c1', promotion_target_id: 't1', playlist_id: null, status: 'not_a_fit',
    curator_feedback: 'Too aggressive for this list', submitted_at: '2026-09-28T00:00:00Z',
    reviewed_at: null, created_at: '2026-09-28T00:00:00Z',
  }));
  assert.equal(sub.data.status_normalized, 'declined');
  assert.equal(sub.data.curator_feedback, 'Too aggressive for this list');

  const unmapped = normalizeCuratorfitSubmission({ ...parseAt('t', curatorfitSubmissionRowSchema, {
    id: 's2', campaign_id: null, promotion_target_id: null, playlist_id: null, status: 'queued',
    curator_feedback: null, submitted_at: null, reviewed_at: null, created_at: '2026-09-28T00:00:00Z',
  }) });
  assert.equal(unmapped.data.status_normalized, 'unknown');
  assert.equal(unmapped.data.status_native, 'queued');
});

test('CuratorFit fetch: refuses to run without a live source and refuses artistos-core', async () => {
  assert.throws(() => curatorfitConfigFromEnv({}), /design-dormant/);
  assert.throws(
    () => curatorfitConfigFromEnv({
      CURATORFIT_SUPABASE_URL: 'https://myrtdfyjoxvtubusrrmf.supabase.co',
      CURATORFIT_READ_KEY: 'k',
    }),
    /refusing to read artistos-core/,
  );
  const seen = mockFetch(() => [cfTarget]);
  const out = await fetchCuratorfitTargets({ url: 'https://cf.example.supabase.co', key: 'k' });
  assert.equal(out.length, 1);
  assert.equal(seen[0].method, 'GET');
  assert.equal(seen[0].hasBody, false);
});

/* ============================== BVSS =============================== */

test('BVSS: live playlist row validates; fetchPlaylists validates the response', async () => {
  const record = parseAt('t', bvssPlaylistRecordSchema, B.playlist) as unknown as PlaylistRecord;
  const p = normalizePlaylist(record);
  assert.equal(p.data.follower_count, 204);
  assert.equal(p.provenance.authority, 'source-of-record');
  const tgt = promotionTargetForPlaylist(p);
  assert.equal(tgt.data.target_source, 'bvss_playlist');
  assert.equal(tgt.provenance.provenance, 'inferred');

  const seen = mockFetch(() => ({ playlists: [B.playlist] }));
  const list = await fetchPlaylists('https://example.test/functions/v1');
  assert.equal(list.length, 1);
  assert.equal(seen[0].method, 'GET');

  mockFetch(() => ({ playlists: [{ ...B.playlist, submission_status: 'maybe' }] }));
  await assert.rejects(fetchPlaylists('https://example.test/functions/v1'), BridgeValidationError);
});

test('BVSS: snapshot rows validate; NULL track_count yields no fabricated metric', () => {
  const [row] = parseMetricSnapshotRows([B.metric_snapshot]);
  assert.equal(normalizeMetricSnapshot(row).length, 2);
  const [nullTracks] = parseMetricSnapshotRows([{ ...B.metric_snapshot, track_count: null }]);
  const metrics = normalizeMetricSnapshot(nullTracks);
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].data.metric_name, 'followers');
  assert.equal(metrics[0].provenance.source_id, B.metric_snapshot.id);
  assert.throws(() => parseMetricSnapshotRows([{ ...B.metric_snapshot, followers: -3 }]), BridgeValidationError);
});

/* ======================= PostgREST reader ========================== */

test('PostgREST reader rejects injection-shaped identifiers and `*`', () => {
  const cfg = { url: 'https://x.supabase.co', key: 'k' };
  assert.throws(() => buildReadUrl(cfg, { table: 'artists;drop', columns: ['id'] }), /invalid table/);
  assert.throws(() => buildReadUrl(cfg, { table: 'artists', columns: ['*'] }), /invalid column/);
  assert.throws(() => buildReadUrl(cfg, { table: 'artists', columns: [] }), /explicit column list/);
  assert.throws(() => buildReadUrl(cfg, { table: 'rpc', columns: ['id'], limit: 5000 }), /limit/);
});
