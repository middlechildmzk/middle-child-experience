-- T1C provenance foundation for BVSS playlist metrics.
--
-- Separates WHEN THE PROVIDER MEASURED a value from WHEN WE RETRIEVED it, keeps
-- per-playlist source health (request status, freshness, confidence, value
-- state), and makes it impossible for any writer to regress a newer measurement.
--
-- Verified defect (2026-09-29): Soundcharts can answer HTTP 200 with an old
-- latestCrawlDate. The previous sync counted that as success, stamped
-- now() when the crawl date was missing, and let any later write replace
-- current_follower_count. 8 active playlists showed a single 2026-09-26
-- reading of 0 as "0 followers" on public pages.
--
-- Additive only. Legacy rows keep their values; retrieved_at stays null on rows
-- written before this migration because the retrieval time was never recorded.
--
-- Rollback: supabase/rollback/20260929220200_bvss_playlist_source_health.down.sql

-- 1. Snapshot provenance -------------------------------------------------------
alter table public.bvss_playlist_metric_snapshots
  add column if not exists provider_measured_at timestamptz,
  add column if not exists retrieved_at timestamptz,
  add column if not exists sync_run_id uuid references public.bvss_sync_runs(id) on delete set null,
  add column if not exists measurement_basis text;

alter table public.bvss_playlist_metric_snapshots
  add constraint bvss_snapshot_measurement_basis_check
  check (measurement_basis is null or measurement_basis in ('provider_crawl', 'provider_history', 'manual', 'first_party'));

alter table public.bvss_playlist_metric_snapshots
  add constraint bvss_snapshot_retrieved_after_measured_check
  check (retrieved_at is null or provider_measured_at is null or retrieved_at >= provider_measured_at - interval '10 minutes');

-- Backfill: observed_at already carried the provider crawl date (metadata rows),
-- the history point date (history rows) or the moment an admin entered a value.
update public.bvss_playlist_metric_snapshots
set
  provider_measured_at = coalesce(provider_measured_at, observed_at),
  measurement_basis = coalesce(measurement_basis, case
    when raw_data ->> 'method' = 'audience_history' then 'provider_history'
    when raw_data ->> 'method' = 'playlist_metadata' then 'provider_crawl'
    when source = 'manual_admin' then 'manual'
    else null
  end);

create index if not exists bvss_snapshots_provider_measured_idx
  on public.bvss_playlist_metric_snapshots (playlist_id, source, provider_measured_at desc);

-- 2. Monotonic guards ------------------------------------------------------------
-- A snapshot row may never be replaced by an older measurement or lose its
-- measurement timestamp.
create or replace function public.bvss_guard_snapshot_monotonic()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.provider_measured_at is not null
     and (new.provider_measured_at is null or new.provider_measured_at < old.provider_measured_at) then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists bvss_snapshot_monotonic on public.bvss_playlist_metric_snapshots;
create trigger bvss_snapshot_monotonic
  before update on public.bvss_playlist_metric_snapshots
  for each row execute function public.bvss_guard_snapshot_monotonic();

-- The playlist's current follower value moves forward in measurement time only,
-- and can never be set without a measurement timestamp.
create or replace function public.bvss_guard_current_follower_monotonic()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.current_follower_count is not null and new.follower_count_observed_at is null then
    raise exception 'current_follower_count requires follower_count_observed_at (provider measurement time)'
      using errcode = '23514';
  end if;
  if tg_op = 'UPDATE'
     and old.follower_count_observed_at is not null
     and new.follower_count_observed_at is not null
     and new.follower_count_observed_at < old.follower_count_observed_at then
    new.current_follower_count := old.current_follower_count;
    new.follower_count_source := old.follower_count_source;
    new.follower_count_observed_at := old.follower_count_observed_at;
    new.current_track_count := old.current_track_count;
  end if;
  return new;
end;
$$;

drop trigger if exists bvss_current_follower_monotonic on public.bvss_playlists;
create trigger bvss_current_follower_monotonic
  before insert or update on public.bvss_playlists
  for each row execute function public.bvss_guard_current_follower_monotonic();

-- 3. Source status (current state, one row per playlist / provider / metric) ----
create table if not exists public.bvss_playlist_source_status (
  playlist_id uuid not null references public.bvss_playlists(id) on delete cascade,
  provider text not null,
  metric text not null check (metric in ('followers')),
  last_attempt_at timestamptz not null,
  last_request_status text not null
    check (last_request_status in ('ok', 'not_found', 'forbidden', 'error', 'auth_failed', 'not_monitored')),
  last_http_status integer,
  last_provider_measured_at timestamptz,
  last_value bigint check (last_value is null or last_value >= 0),
  previous_provider_measured_at timestamptz,
  previous_value bigint check (previous_value is null or previous_value >= 0),
  consecutive_unchanged_measurements integer not null default 0 check (consecutive_unchanged_measurements >= 0),
  freshness_state text not null check (freshness_state in ('fresh', 'delayed', 'stale', 'unavailable')),
  confidence text not null check (confidence in ('high', 'medium', 'low', 'none')),
  value_state text not null check (value_state in ('measured', 'unmeasured_zero', 'stale', 'anomalous', 'unavailable')),
  reason text,
  sync_run_id uuid references public.bvss_sync_runs(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (playlist_id, provider, metric),
  constraint bvss_source_status_previous_before_last check (
    previous_provider_measured_at is null or last_provider_measured_at is null
    or previous_provider_measured_at < last_provider_measured_at
  )
);

comment on table public.bvss_playlist_source_status is
  'Current source health per playlist metric. History lives in bvss_playlist_metric_snapshots. Written by the service role only.';

alter table public.bvss_playlist_source_status enable row level security;
revoke all on public.bvss_playlist_source_status from anon, authenticated;
grant select on public.bvss_playlist_source_status to authenticated;

create policy bvss_admin_source_status_select on public.bvss_playlist_source_status
  for select to authenticated
  using (public.bvss_is_admin());

drop trigger if exists bvss_source_status_touch on public.bvss_playlist_source_status;
create trigger bvss_source_status_touch
  before update on public.bvss_playlist_source_status
  for each row execute function public.bvss_touch_updated_at();
