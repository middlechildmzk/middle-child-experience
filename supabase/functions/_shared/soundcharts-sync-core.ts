// Soundcharts playlist-metrics sync, independent of Supabase and fetch so every
// provider outcome can be tested deterministically. The edge function
// (bvss-soundcharts-sync/index.ts) supplies the real store and provider.

import {
  type MetricAssessment,
  type RequestStatus,
  assessMetric,
  classifyHttpStatus,
  isNewerMeasurement,
  parseCount,
  parseProviderTimestamp,
  runStatusFor,
  summarizeCoverage,
} from './source-health.ts';

export const PROVIDER = 'soundcharts';
export const MONITORED_LIFECYCLES = ['active', 'experimental'] as const;
const BACKFILL_RETRY_DAYS = 7;
const HISTORY_RANGES: Array<[number, number]> = [[365, 276], [275, 186], [185, 96], [95, 0]];

export interface MonitoredPlaylist {
  id: string;
  slug: string;
  spotify_playlist_id: string;
  lifecycle_state: string;
  source_metadata: Record<string, unknown> | null;
  current_follower_count: number | null;
  follower_count_observed_at: string | null;
  current_track_count: number | null;
}

export interface SourceStatusRow {
  playlist_id: string;
  provider: string;
  metric: 'followers';
  last_attempt_at: string;
  last_request_status: RequestStatus;
  last_http_status: number | null;
  last_provider_measured_at: string | null;
  last_value: number | null;
  previous_provider_measured_at: string | null;
  previous_value: number | null;
  consecutive_unchanged_measurements: number;
  freshness_state: MetricAssessment['freshness'];
  confidence: MetricAssessment['confidence'];
  value_state: MetricAssessment['valueState'];
  reason: string;
  sync_run_id: string | null;
}

export interface SnapshotRow {
  playlist_id: string;
  metric_date: string;
  followers: number | null;
  track_count: number | null;
  source: string;
  source_ref: string;
  observed_at: string;
  provider_measured_at: string;
  retrieved_at: string;
  measurement_basis: 'provider_crawl' | 'provider_history';
  sync_run_id: string | null;
  raw_data: Record<string, unknown>;
}

export interface SyncStore {
  listMonitoredPlaylists(): Promise<MonitoredPlaylist[]>;
  listStatuses(): Promise<SourceStatusRow[]>;
  startRun(metadata: Record<string, unknown>): Promise<string | null>;
  upsertSnapshots(rows: SnapshotRow[]): Promise<void>;
  updatePlaylist(id: string, patch: Record<string, unknown>): Promise<void>;
  upsertStatuses(rows: SourceStatusRow[]): Promise<void>;
  finishRun(id: string | null, patch: Record<string, unknown>): Promise<void>;
  updateIntegration(patch: { status: string; notes: string; last_sync_at: string | null; configuration_patch: Record<string, unknown> }): Promise<void>;
}

export interface ProviderResponse { status: number; body: any }

export interface SoundchartsProvider {
  /** Throws on credential/authentication failure. */
  authenticate(): Promise<void>;
  lookupPlaylist(spotifyPlaylistId: string): Promise<ProviderResponse>;
  audienceHistory(uuid: string, startDate: string, endDate: string): Promise<ProviderResponse>;
}

export interface SyncResult {
  ok: boolean;
  status: 'completed' | 'partial' | 'failed';
  playlists: number;
  request_ok: number;
  request_failed: Record<string, number>;
  new_measurements: number;
  unchanged_measurements: number;
  missing_provider_timestamp: number;
  history_rows: number;
  coverage: ReturnType<typeof summarizeCoverage>;
  errors: Array<Record<string, unknown>>;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (now: Date, days: number) => isoDate(new Date(now.getTime() - days * 86_400_000));

function bootstrapPrevious(playlist: MonitoredPlaylist, status: SourceStatusRow | undefined) {
  if (status) {
    return {
      lastMeasuredAt: status.last_provider_measured_at,
      lastValue: status.last_value,
      previousMeasuredAt: status.previous_provider_measured_at,
      previousValue: status.previous_value,
      unchanged: status.consecutive_unchanged_measurements,
    };
  }
  // First run after the fix: the playlist row's current value is the only
  // prior evidence. It becomes "last"; nothing is known before it.
  return {
    lastMeasuredAt: playlist.follower_count_observed_at,
    lastValue: playlist.current_follower_count,
    previousMeasuredAt: null,
    previousValue: null,
    unchanged: 0,
  };
}

export async function runSoundchartsSync(store: SyncStore, provider: SoundchartsProvider, now: () => Date = () => new Date()): Promise<SyncResult> {
  const startedAt = now();
  const playlists = await store.listMonitoredPlaylists();
  const statusByPlaylist = new Map((await store.listStatuses()).map((s) => [s.playlist_id, s]));
  const runId = await store.startRun({ playlist_count: playlists.length, mode: 'daily_metrics', monitored_lifecycles: MONITORED_LIFECYCLES });

  const statuses: SourceStatusRow[] = [];
  const assessments: Array<{ assessment: MetricAssessment; requestStatus: RequestStatus }> = [];
  const errors: Array<Record<string, unknown>> = [];
  const requestFailed: Record<string, number> = {};
  let requestOk = 0;
  let newMeasurements = 0;
  let unchangedMeasurements = 0;
  let missingTimestamp = 0;
  let historyRows = 0;
  let historyForbidden = false;

  const record = (playlist: MonitoredPlaylist, requestStatus: RequestStatus, httpStatus: number | null, evidence: ReturnType<typeof bootstrapPrevious>, attemptAt: string, reasonPrefix = '') => {
    const assessment = assessMetric({
      value: evidence.lastValue,
      measuredAt: evidence.lastMeasuredAt,
      previousValue: evidence.previousValue,
      previousMeasuredAt: evidence.previousMeasuredAt,
      requestStatus,
      consecutiveUnchanged: evidence.unchanged,
    }, now());
    assessments.push({ assessment, requestStatus });
    statuses.push({
      playlist_id: playlist.id,
      provider: PROVIDER,
      metric: 'followers',
      last_attempt_at: attemptAt,
      last_request_status: requestStatus,
      last_http_status: httpStatus,
      last_provider_measured_at: evidence.lastMeasuredAt,
      last_value: evidence.lastValue,
      previous_provider_measured_at: evidence.previousMeasuredAt,
      previous_value: evidence.previousValue,
      consecutive_unchanged_measurements: evidence.unchanged,
      freshness_state: assessment.freshness,
      confidence: assessment.confidence,
      value_state: assessment.valueState,
      reason: `${reasonPrefix}${assessment.reason}`,
      sync_run_id: runId,
    });
  };

  try {
    await provider.authenticate();
  } catch (error) {
    const attemptAt = now().toISOString();
    for (const playlist of playlists) {
      record(playlist, 'auth_failed', null, bootstrapPrevious(playlist, statusByPlaylist.get(playlist.id)), attemptAt, 'Soundcharts authentication failed. ');
    }
    await store.upsertStatuses(statuses);
    const coverage = summarizeCoverage(assessments);
    await store.finishRun(runId, {
      status: 'failed',
      completed_at: now().toISOString(),
      records_seen: playlists.length,
      records_written: 0,
      error_summary: JSON.stringify([{ stage: 'auth', detail: error instanceof Error ? error.message.slice(0, 180) : 'unknown' }]),
      metadata: { stage: 'auth', coverage },
    });
    await store.updateIntegration({
      status: 'degraded',
      notes: 'Soundcharts authentication failed. Stored follower counts are kept but are aging; none were refreshed.',
      last_sync_at: null,
      configuration_patch: { last_run: { completed_at: now().toISOString(), status: 'failed', coverage } },
    });
    return { ok: false, status: 'failed', playlists: playlists.length, request_ok: 0, request_failed: { auth_failed: playlists.length }, new_measurements: 0, unchanged_measurements: 0, missing_provider_timestamp: 0, history_rows: 0, coverage, errors: [{ stage: 'auth' }] };
  }

  for (const playlist of playlists) {
    const attemptAt = now().toISOString();
    const evidence = bootstrapPrevious(playlist, statusByPlaylist.get(playlist.id));
    let lookup: ProviderResponse;
    try {
      lookup = await provider.lookupPlaylist(playlist.spotify_playlist_id);
    } catch (error) {
      requestFailed.error = (requestFailed.error ?? 0) + 1;
      errors.push({ slug: playlist.slug, stage: 'lookup', detail: error instanceof Error ? error.message.slice(0, 180) : 'network_error' });
      record(playlist, 'error', null, evidence, attemptAt);
      continue;
    }

    const requestStatus = classifyHttpStatus(lookup.status);
    if (requestStatus !== 'ok') {
      requestFailed[requestStatus] = (requestFailed[requestStatus] ?? 0) + 1;
      errors.push({ slug: playlist.slug, stage: 'lookup', status: lookup.status });
      record(playlist, requestStatus, lookup.status, evidence, attemptAt);
      continue;
    }
    requestOk += 1;

    const object = lookup.body?.object ?? lookup.body ?? {};
    const uuid: string | null = typeof object.uuid === 'string' ? object.uuid : null;
    const measuredAt = parseProviderTimestamp(object.latestCrawlDate, now());
    const followers = parseCount(object.latestSubscriberCount);
    const trackCount = parseCount(object.latestTrackCount);
    const metadataPatch: Record<string, unknown> = {
      ...(playlist.source_metadata ?? {}),
      soundcharts_uuid: uuid ?? playlist.source_metadata?.soundcharts_uuid ?? null,
      soundcharts_last_request_at: attemptAt,
    };

    if (!measuredAt) {
      // Provider answered but gave no usable crawl timestamp: nothing is written
      // as a measurement. The existing value keeps aging by its own timestamp.
      missingTimestamp += 1;
      await store.updatePlaylist(playlist.id, { source_metadata: metadataPatch, updated_at: attemptAt });
      record(playlist, 'ok', lookup.status, evidence, attemptAt, 'Provider returned no valid crawl date. ');
      continue;
    }

    const newer = isNewerMeasurement(measuredAt, evidence.lastMeasuredAt);
    const sameAsLast = !!evidence.lastMeasuredAt && new Date(evidence.lastMeasuredAt).getTime() === new Date(measuredAt).getTime();

    if (followers !== null || trackCount !== null) {
      await store.upsertSnapshots([{
        playlist_id: playlist.id,
        metric_date: measuredAt.slice(0, 10),
        followers,
        track_count: trackCount,
        source: PROVIDER,
        source_ref: uuid ?? playlist.spotify_playlist_id,
        observed_at: measuredAt,
        provider_measured_at: measuredAt,
        retrieved_at: attemptAt,
        measurement_basis: 'provider_crawl',
        sync_run_id: runId,
        raw_data: {
          method: 'playlist_metadata',
          soundcharts_uuid: uuid,
          latestCrawlDate: object.latestCrawlDate ?? null,
          latestSubscriberCount: object.latestSubscriberCount ?? null,
          latestTrackCount: object.latestTrackCount ?? null,
        },
      }]);
    }

    let next = evidence;
    if (newer && followers !== null) {
      newMeasurements += 1;
      next = {
        lastMeasuredAt: measuredAt,
        lastValue: followers,
        previousMeasuredAt: evidence.lastMeasuredAt,
        previousValue: evidence.lastValue,
        unchanged: 0,
      };
      metadataPatch.soundcharts_last_crawl_at = measuredAt;
      const patch: Record<string, unknown> = {
        source_metadata: metadataPatch,
        updated_at: attemptAt,
        current_follower_count: followers,
        follower_count_source: PROVIDER,
        follower_count_observed_at: measuredAt,
      };
      if (trackCount !== null) patch.current_track_count = trackCount;
      await store.updatePlaylist(playlist.id, patch);
    } else {
      if (sameAsLast) {
        unchangedMeasurements += 1;
        next = { ...evidence, unchanged: evidence.unchanged + 1 };
      }
      // Older or equal measurement: current follower values are never replaced.
      const patch: Record<string, unknown> = { source_metadata: metadataPatch, updated_at: attemptAt };
      if (newer && trackCount !== null) patch.current_track_count = trackCount;
      await store.updatePlaylist(playlist.id, patch);
    }

    const reasonPrefix = !newer && !sameAsLast ? 'Provider returned an older measurement than the one stored; ignored for current value. ' : '';
    record(playlist, 'ok', lookup.status, next, attemptAt, reasonPrefix);

    // History backfill: only marked complete when every range succeeded AND at
    // least one real history point was written. Retried at most weekly.
    const meta = playlist.source_metadata ?? {};
    const lastAttempt = typeof meta.soundcharts_history_backfill_last_attempt_at === 'string' ? new Date(meta.soundcharts_history_backfill_last_attempt_at) : null;
    const due = !meta.soundcharts_history_backfill_completed_at
      && (!lastAttempt || now().getTime() - lastAttempt.getTime() >= BACKFILL_RETRY_DAYS * 86_400_000);
    if (!historyForbidden && uuid && due) {
      let allRangesOk = true;
      let written = 0;
      for (const [startAgo, endAgo] of HISTORY_RANGES) {
        const history = await provider.audienceHistory(uuid, daysAgo(now(), startAgo), daysAgo(now(), endAgo));
        if (history.status === 403) { historyForbidden = true; allRangesOk = false; break; }
        if (history.status < 200 || history.status >= 300) {
          allRangesOk = false;
          errors.push({ slug: playlist.slug, stage: 'history', status: history.status });
          continue;
        }
        const retrievedAt = now().toISOString();
        const rows: SnapshotRow[] = (Array.isArray(history.body?.items) ? history.body.items : [])
          .map((item: any) => ({ at: parseProviderTimestamp(item?.date, now()), value: parseCount(item?.value) }))
          .filter((item: { at: string | null; value: number | null }) => item.at && item.value !== null)
          .map((item: { at: string; value: number }) => ({
            playlist_id: playlist.id,
            metric_date: item.at.slice(0, 10),
            followers: item.value,
            track_count: null,
            source: PROVIDER,
            source_ref: uuid,
            observed_at: item.at,
            provider_measured_at: item.at,
            retrieved_at: retrievedAt,
            measurement_basis: 'provider_history',
            sync_run_id: runId,
            raw_data: { method: 'audience_history', soundcharts_uuid: uuid },
          }));
        if (rows.length) {
          await store.upsertSnapshots(rows);
          written += rows.length;
        }
      }
      historyRows += written;
      const complete = allRangesOk && written > 0;
      await store.updatePlaylist(playlist.id, {
        source_metadata: {
          ...metadataPatch,
          soundcharts_history_backfill_last_attempt_at: now().toISOString(),
          soundcharts_history_backfill_last_rows: written,
          ...(complete ? { soundcharts_history_backfill_completed_at: now().toISOString() } : {}),
        },
        updated_at: now().toISOString(),
      });
    }
  }

  await store.upsertStatuses(statuses);
  const coverage = summarizeCoverage(assessments);
  const status = runStatusFor(coverage, requestOk > 0);
  const completedAt = now().toISOString();
  await store.finishRun(runId, {
    status,
    completed_at: completedAt,
    records_seen: playlists.length,
    records_written: newMeasurements + historyRows,
    error_summary: errors.length ? JSON.stringify(errors.slice(0, 20)) : null,
    metadata: {
      requests_ok: requestOk,
      requests_failed: requestFailed,
      new_measurements: newMeasurements,
      unchanged_measurements: unchangedMeasurements,
      missing_provider_timestamp: missingTimestamp,
      history_snapshots_written: historyRows,
      historical_endpoint_available: !historyForbidden,
      coverage,
      started_at: startedAt.toISOString(),
    },
  });
  await store.updateIntegration({
    status: requestOk > 0 ? 'ready' : 'degraded',
    last_sync_at: requestOk > 0 ? completedAt : null,
    notes: requestOk > 0
      ? `Soundcharts requests succeeded for ${requestOk} of ${playlists.length} monitored playlists. Fresh follower measurements: ${coverage.fresh} of ${coverage.monitored}. A successful request does not mean a fresh measurement.`
      : 'Soundcharts sync ran but no provider request succeeded. Stored counts are kept and aging.',
    configuration_patch: {
      historical_endpoint_available: !historyForbidden,
      last_run: { completed_at: completedAt, status, requests_ok: requestOk, new_measurements: newMeasurements, coverage },
    },
  });

  return {
    ok: requestOk > 0,
    status,
    playlists: playlists.length,
    request_ok: requestOk,
    request_failed: requestFailed,
    new_measurements: newMeasurements,
    unchanged_measurements: unchangedMeasurements,
    missing_provider_timestamp: missingTimestamp,
    history_rows: historyRows,
    coverage,
    errors,
  };
}
