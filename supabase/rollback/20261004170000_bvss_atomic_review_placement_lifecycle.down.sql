-- Rollback for 20261004170000_bvss_atomic_review_placement_lifecycle.
-- Emergency only. Refuses to run while any placement is unverified, because the
-- old schema would record those acceptances as live placements (placed_at NOT NULL).
-- Redeploy the previous bvss-curator and bvss-admin versions FIRST
-- (supabase/functions/DEPLOYED_MANIFEST.json), then run this.

do $$
begin
  if exists (select 1 from public.bvss_playlist_placements where placed_at is null) then
    raise exception 'rollback refused: unverified placements exist; cancel or verify them first';
  end if;
end
$$;

drop function if exists public.bvss_end_placement(uuid, jsonb, text, text);
drop function if exists public.bvss_record_playlist_observation(uuid, text, text, timestamptz, jsonb);
drop function if exists public.bvss_report_placement_added(uuid, jsonb);
drop function if exists public.bvss_decide_route(uuid, jsonb, text, text[], text, timestamptz, integer, date);
drop function if exists public.bvss_actor_can_act(jsonb, uuid);
drop function if exists public.bvss_refresh_submission_status(uuid);

alter table public.bvss_submission_routes
  drop constraint if exists bvss_routes_reject_requires_reason,
  drop constraint if exists bvss_routes_decline_reasons_valid,
  drop constraint if exists bvss_routes_hold_requires_date,
  drop column if exists decision_version,
  drop column if exists decline_reasons,
  drop column if exists hold_until;

drop index if exists public.bvss_placements_status_idx;
drop index if exists public.bvss_placements_open_track_unique;
drop index if exists public.bvss_placements_route_unique;
alter table public.bvss_playlist_placements
  drop constraint if exists bvss_placements_ended_requires_time,
  drop constraint if exists bvss_placements_pending_requires_report,
  drop constraint if exists bvss_placements_live_requires_evidence,
  drop constraint if exists bvss_placements_unverified_has_no_live_time,
  drop constraint if exists bvss_placements_verification_source_check,
  drop constraint if exists bvss_placements_status_check;
alter table public.bvss_playlist_placements alter column placed_at set default now();
alter table public.bvss_playlist_placements alter column placed_at set not null;
alter table public.bvss_playlist_placements
  drop column if exists updated_at, drop column if exists end_reason, drop column if exists ended_at,
  drop column if exists observed_track_id, drop column if exists verification_evidence,
  drop column if exists verification_source, drop column if exists verified_live_at,
  drop column if exists added_reported_by, drop column if exists added_reported_at,
  drop column if exists accepted_at, drop column if exists scheduled_for,
  drop column if exists route_id, drop column if exists status;

-- Direct admin writes return only with the old policies (they were never dropped).
grant insert, update, delete on public.bvss_submission_routes, public.bvss_submission_reviews,
  public.bvss_playlist_placements, public.bvss_submission_status_events, public.bvss_playlist_tracks to authenticated;
