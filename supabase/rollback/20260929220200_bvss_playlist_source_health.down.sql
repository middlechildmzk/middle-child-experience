-- Manual rollback for 20260929220200_bvss_playlist_source_health.
-- Drops the provenance foundation. Snapshot follower/track values are untouched;
-- only the added provenance columns, guards and status table are removed.
-- Deploy the previous bvss-soundcharts-sync and bvss-admin sources FIRST, since
-- the new function sources write these columns.
-- Not a migration: never place in supabase/migrations.

drop trigger if exists bvss_current_follower_monotonic on public.bvss_playlists;
drop function if exists public.bvss_guard_current_follower_monotonic();
drop trigger if exists bvss_snapshot_monotonic on public.bvss_playlist_metric_snapshots;
drop function if exists public.bvss_guard_snapshot_monotonic();
drop table if exists public.bvss_playlist_source_status;
drop index if exists public.bvss_snapshots_provider_measured_idx;
alter table public.bvss_playlist_metric_snapshots
  drop constraint if exists bvss_snapshot_retrieved_after_measured_check,
  drop constraint if exists bvss_snapshot_measurement_basis_check,
  drop column if exists measurement_basis,
  drop column if exists sync_run_id,
  drop column if exists retrieved_at,
  drop column if exists provider_measured_at;
