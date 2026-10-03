import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MONITORED_LIFECYCLES,
  type MonitoredPlaylist,
  type ProviderResponse,
  type SnapshotRow,
  type SoundchartsProvider,
  type SourceStatusRow,
  type SyncStore,
  runSoundchartsSync,
} from '../../supabase/functions/_shared/soundcharts-sync-core.ts';

const NOW = new Date('2026-09-29T10:15:00.000Z');
const clock = () => new Date(NOW);

function playlist(overrides: Partial<MonitoredPlaylist> = {}): MonitoredPlaylist {
  return {
    id: 'pl-1',
    slug: 'middle-child-electronic',
    spotify_playlist_id: 'sp-1',
    lifecycle_state: 'active',
    source_metadata: { soundcharts_history_backfill_completed_at: '2026-09-26T19:58:45Z' },
    current_follower_count: 2244,
    follower_count_observed_at: '2026-09-28T05:00:02.000Z',
    current_track_count: 153,
    ...overrides,
  };
}

class MemoryStore implements SyncStore {
  playlists: MonitoredPlaylist[];
  statuses: SourceStatusRow[];
  snapshots: SnapshotRow[] = [];
  patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
  runs: Array<Record<string, unknown>> = [];
  integration: Record<string, unknown> | null = null;
  constructor(playlists: MonitoredPlaylist[], statuses: SourceStatusRow[] = []) {
    this.playlists = playlists;
    this.statuses = statuses;
  }
  async listMonitoredPlaylists() { return this.playlists; }
  async listStatuses() { return this.statuses; }
  async startRun(metadata: Record<string, unknown>) { this.runs.push({ id: 'run-1', status: 'started', metadata }); return 'run-1'; }
  async upsertSnapshots(rows: SnapshotRow[]) { this.snapshots.push(...rows); }
  async updatePlaylist(id: string, patch: Record<string, unknown>) {
    this.patches.push({ id, patch });
    const target = this.playlists.find((p) => p.id === id);
    if (target) Object.assign(target, patch);
  }
  async upsertStatuses(rows: SourceStatusRow[]) {
    for (const row of rows) {
      this.statuses = this.statuses.filter((s) => s.playlist_id !== row.playlist_id);
      this.statuses.push(row);
    }
  }
  async finishRun(_id: string | null, patch: Record<string, unknown>) { Object.assign(this.runs[0], patch); }
  async updateIntegration(patch: any) { this.integration = patch; }
  status(id = 'pl-1') { return this.statuses.find((s) => s.playlist_id === id)!; }
  playlist(id = 'pl-1') { return this.playlists.find((p) => p.id === id)!; }
}

function provider(lookups: Record<string, ProviderResponse | Error>, history: ProviderResponse[] = [], authError?: Error): SoundchartsProvider & { historyCalls: number } {
  let historyIndex = 0;
  return {
    historyCalls: 0,
    async authenticate() { if (authError) throw authError; },
    async lookupPlaylist(id: string) {
      const result = lookups[id];
      if (result instanceof Error) throw result;
      if (!result) throw new Error(`unexpected lookup ${id}`);
      return result;
    },
    async audienceHistory() {
      (this as any).historyCalls += 1;
      return history[historyIndex++] ?? { status: 200, body: { items: [] } };
    },
  };
}

const crawl = (latestCrawlDate: unknown, latestSubscriberCount: unknown, latestTrackCount: unknown = 150): ProviderResponse =>
  ({ status: 200, body: { object: { uuid: 'sc-uuid-1', latestCrawlDate, latestSubscriberCount, latestTrackCount } } });

describe('Soundcharts sync core', () => {
  test('monitors experimental playlists as well as active ones', () => {
    assert.deepEqual([...MONITORED_LIFECYCLES], ['active', 'experimental']);
  });

  test('fresh measurement: separate provider and retrieval timestamps, current value advanced', async () => {
    const store = new MemoryStore([playlist()]);
    const result = await runSoundchartsSync(store, provider({ 'sp-1': crawl('2026-09-29T05:00:02+00:00', 2269, 200) }), clock);
    const snap = store.snapshots[0];
    assert.equal(snap.provider_measured_at, '2026-09-29T05:00:02.000Z');
    assert.equal(snap.retrieved_at, NOW.toISOString());
    assert.equal(snap.metric_date, '2026-09-29');
    assert.equal(snap.measurement_basis, 'provider_crawl');
    assert.equal(snap.raw_data.latestCrawlDate, '2026-09-29T05:00:02+00:00');
    assert.deepEqual([store.playlist().current_follower_count, store.playlist().follower_count_observed_at, store.playlist().current_track_count],
      [2269, '2026-09-29T05:00:02.000Z', 200]);
    const status = store.status();
    assert.deepEqual([status.freshness_state, status.value_state, status.confidence, status.previous_value], ['fresh', 'measured', 'high', 2244]);
    assert.equal(result.status, 'completed');
    assert.equal(store.runs[0].status, 'completed');
  });

  test('delayed measurement: value updates but the run is partial, not completed', async () => {
    const store = new MemoryStore([playlist({ follower_count_observed_at: '2026-09-25T05:00:02.000Z' })]);
    const result = await runSoundchartsSync(store, provider({ 'sp-1': crawl('2026-09-27T05:00:02Z', 2250) }), clock);
    assert.equal(store.playlist().current_follower_count, 2250);
    assert.equal(store.status().freshness_state, 'delayed');
    assert.equal(result.status, 'partial');
    assert.equal(result.coverage.delayed, 1);
  });

  test('stale measurement: HTTP 200 with an old crawl is not reported as current', async () => {
    const store = new MemoryStore([playlist({ current_follower_count: 327, follower_count_observed_at: '2026-09-15T05:00:02.000Z' })]);
    const result = await runSoundchartsSync(store, provider({ 'sp-1': crawl('2026-09-15T05:00:02Z', 327) }), clock);
    assert.equal(result.request_ok, 1);
    assert.equal(result.new_measurements, 0);
    assert.equal(result.unchanged_measurements, 1);
    const status = store.status();
    assert.deepEqual([status.last_request_status, status.freshness_state, status.value_state], ['ok', 'stale', 'stale']);
    assert.equal(result.status, 'partial');
    assert.match(String(store.integration?.notes), /does not mean a fresh measurement/);
  });

  test('stale zero (production defect): single 0 reading never recrawled renders as Measuring', async () => {
    const zero = playlist({ id: 'pl-z', slug: 'trance-2026', spotify_playlist_id: 'sp-z', current_follower_count: 0, follower_count_observed_at: '2026-09-26T19:46:50.000Z' });
    const store = new MemoryStore([zero]);
    const first = await runSoundchartsSync(store, provider({ 'sp-z': crawl('2026-09-26T19:46:50.000Z', 0, 31) }), clock);
    assert.equal(store.status('pl-z').value_state, 'unmeasured_zero');
    assert.equal(store.status('pl-z').consecutive_unchanged_measurements, 1);
    assert.equal(first.coverage.unmeasuredZero, 1);
    assert.equal(first.status, 'partial');
    await runSoundchartsSync(store, provider({ 'sp-z': crawl('2026-09-26T19:46:50.000Z', 0, 31) }), clock);
    assert.equal(store.status('pl-z').consecutive_unchanged_measurements, 2);
    assert.equal(store.playlist('pl-z').follower_count_observed_at, '2026-09-26T19:46:50.000Z');
  });

  test('missing provider crawl timestamp: nothing is written as a measurement and now() is never used', async () => {
    const store = new MemoryStore([playlist()]);
    const result = await runSoundchartsSync(store, provider({ 'sp-1': crawl(undefined, 9999) }), clock);
    assert.equal(store.snapshots.length, 0);
    assert.equal(store.playlist().current_follower_count, 2244);
    assert.equal(store.playlist().follower_count_observed_at, '2026-09-28T05:00:02.000Z');
    assert.equal(result.missing_provider_timestamp, 1);
    assert.match(store.status().reason, /no valid crawl date/);
    assert.ok(!store.patches.some((p) => p.patch.follower_count_observed_at === NOW.toISOString()));
  });

  test('older measurement arriving after a newer one never replaces it', async () => {
    const store = new MemoryStore([playlist({ current_follower_count: 209, follower_count_observed_at: '2026-09-29T05:00:02.000Z' })]);
    await runSoundchartsSync(store, provider({ 'sp-1': crawl('2026-09-26T05:00:02Z', 604, 31) }), clock);
    assert.deepEqual([store.playlist().current_follower_count, store.playlist().follower_count_observed_at, store.playlist().current_track_count],
      [209, '2026-09-29T05:00:02.000Z', 153]);
    assert.match(store.status().reason, /older measurement/);
    assert.equal(store.status().last_value, 209);
  });

  for (const [label, response, expected] of [
    ['404 not found', { status: 404, body: null }, 'not_found'],
    ['403 forbidden', { status: 403, body: null }, 'forbidden'],
    ['500 provider error', { status: 500, body: null }, 'error'],
    ['network failure', new Error('ECONNRESET'), 'error'],
  ] as const) {
    test(`${label}: request status recorded, existing measurement kept and aging`, async () => {
      const store = new MemoryStore([playlist()]);
      const result = await runSoundchartsSync(store, provider({ 'sp-1': response as ProviderResponse | Error }), clock);
      const status = store.status();
      assert.equal(status.last_request_status, expected);
      assert.equal(status.last_value, 2244);
      assert.equal(status.freshness_state, 'fresh');
      assert.equal(store.playlist().current_follower_count, 2244);
      assert.equal(store.snapshots.length, 0);
      assert.equal(result.status, 'failed');
      assert.equal(result.coverage.requestFailures, 1);
    });
  }

  test('credentials failure: every playlist marked auth_failed, nothing overwritten, integration degraded', async () => {
    const store = new MemoryStore([playlist(), playlist({ id: 'pl-2', spotify_playlist_id: 'sp-2', lifecycle_state: 'experimental' })]);
    const result = await runSoundchartsSync(store, provider({}, [], new Error('soundcharts_token_401')), clock);
    assert.equal(result.status, 'failed');
    assert.deepEqual(store.statuses.map((s) => s.last_request_status), ['auth_failed', 'auth_failed']);
    assert.equal(store.patches.length, 0);
    assert.equal(store.snapshots.length, 0);
    assert.equal(store.integration?.status, 'degraded');
    assert.equal(store.integration?.last_sync_at, null);
    assert.equal(store.runs[0].status, 'failed');
  });

  describe('history backfill', () => {
    const fresh = () => ({ 'sp-1': crawl('2026-09-29T05:00:02Z', 2269) });
    const pending = () => playlist({ source_metadata: {} });

    test('empty history is not marked complete', async () => {
      const store = new MemoryStore([pending()]);
      await runSoundchartsSync(store, provider(fresh()), clock);
      const meta = store.playlist().source_metadata!;
      assert.equal(meta.soundcharts_history_backfill_completed_at, undefined);
      assert.equal(meta.soundcharts_history_backfill_last_rows, 0);
      assert.equal(meta.soundcharts_history_backfill_last_attempt_at, NOW.toISOString());
    });

    test('a failed range keeps the backfill incomplete even if others returned rows', async () => {
      const store = new MemoryStore([pending()]);
      const items = { status: 200, body: { items: [{ date: '2026-01-01T00:00:00Z', value: 100 }] } };
      await runSoundchartsSync(store, provider(fresh(), [items, { status: 404, body: null }, items, items]), clock);
      assert.equal(store.playlist().source_metadata!.soundcharts_history_backfill_completed_at, undefined);
      assert.equal(store.snapshots.filter((s) => s.measurement_basis === 'provider_history').length, 3);
    });

    test('complete only when every range succeeds and real points were written', async () => {
      const store = new MemoryStore([pending()]);
      const items = { status: 200, body: { items: [{ date: '2026-03-01T00:00:00Z', value: 500 }, { date: 'garbage', value: 1 }] } };
      await runSoundchartsSync(store, provider(fresh(), [items, items, items, items]), clock);
      assert.equal(store.playlist().source_metadata!.soundcharts_history_backfill_completed_at, NOW.toISOString());
      const history = store.snapshots.filter((s) => s.measurement_basis === 'provider_history');
      assert.equal(history.length, 4, 'the unparseable date is dropped, not stamped with now');
      assert.ok(history.every((s) => s.provider_measured_at === '2026-03-01T00:00:00.000Z' && s.retrieved_at === NOW.toISOString()));
    });

    test('an incomplete backfill is retried at most weekly', async () => {
      const store = new MemoryStore([playlist({ source_metadata: { soundcharts_history_backfill_last_attempt_at: '2026-09-27T10:15:00Z' } })]);
      const p = provider(fresh());
      await runSoundchartsSync(store, p, clock);
      assert.equal(p.historyCalls, 0);
    });
  });
});
