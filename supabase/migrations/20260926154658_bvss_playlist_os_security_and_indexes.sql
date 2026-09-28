create or replace function public.bvss_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at=now();
  return new;
end
$$;

create or replace function public.bvss_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists(select 1 from public.bvss_admin_users a where a.user_id=auth.uid());
$$;

drop view if exists public.bvss_playlist_daily_rollup;
create view public.bvss_playlist_daily_rollup
with (security_invoker=true)
as
select
  p.id as playlist_id,
  p.slug,
  p.canonical_name,
  p.spotify_playlist_id,
  p.spotify_url,
  p.cover_asset_url,
  p.current_follower_count,
  p.follower_count_source,
  p.follower_count_observed_at,
  p.current_track_count,
  p.last_editorial_update_at,
  p.spotify_last_synced_at,
  p.submission_status,
  p.lifecycle_state,
  (
    select s.followers from public.bvss_playlist_metric_snapshots s
    where s.playlist_id=p.id and s.metric_date <= current_date-1 and s.followers is not null
    order by s.metric_date desc, s.observed_at desc limit 1
  ) as followers_1d_ago,
  (
    select s.followers from public.bvss_playlist_metric_snapshots s
    where s.playlist_id=p.id and s.metric_date <= current_date-7 and s.followers is not null
    order by s.metric_date desc, s.observed_at desc limit 1
  ) as followers_7d_ago,
  (
    select s.followers from public.bvss_playlist_metric_snapshots s
    where s.playlist_id=p.id and s.metric_date <= current_date-30 and s.followers is not null
    order by s.metric_date desc, s.observed_at desc limit 1
  ) as followers_30d_ago,
  (
    select s.followers from public.bvss_playlist_metric_snapshots s
    where s.playlist_id=p.id and s.metric_date <= current_date-90 and s.followers is not null
    order by s.metric_date desc, s.observed_at desc limit 1
  ) as followers_90d_ago,
  (select count(*) from public.bvss_submissions s where p.id=any(s.preferred_playlist_ids) and s.status in ('pending','in_review','hold')) as submissions_waiting,
  (select count(*) from public.bvss_playlist_placements pl where pl.playlist_id=p.id and pl.removed_at is null) as active_placements,
  (select count(*) from public.bvss_playlist_placements pl where pl.playlist_id=p.id) as placements_total,
  (select count(*) from public.bvss_web_events e where e.playlist_id=p.id and e.event_name='playlist_view' and e.occurred_at >= now()-interval '30 days') as pageviews_30d,
  (select count(*) from public.bvss_web_events e where e.playlist_id=p.id and e.event_name='spotify_click' and e.occurred_at >= now()-interval '30 days') as spotify_clicks_30d,
  (select coalesce(sum(sm.impressions),0) from public.bvss_search_metrics sm where sm.playlist_id=p.id and sm.metric_date>=current_date-30) as search_impressions_30d,
  (select coalesce(sum(sm.clicks),0) from public.bvss_search_metrics sm where sm.playlist_id=p.id and sm.metric_date>=current_date-30) as search_clicks_30d,
  (select count(*) from public.bvss_playlist_tracks t where t.playlist_id=p.id and t.is_active and (
     lower(array_to_string(t.artists,'|')) like '%middle child%' or lower(array_to_string(t.artists,'|')) like '%subflower%'
   )) as own_artist_placements
from public.bvss_playlists p;

create index if not exists bvss_track_events_playlist_idx on public.bvss_playlist_track_events(playlist_id,event_at desc);
create index if not exists bvss_search_metrics_playlist_idx on public.bvss_search_metrics(playlist_id,metric_date desc);
create index if not exists bvss_submission_matches_playlist_idx on public.bvss_submission_matches(playlist_id);
create index if not exists bvss_submission_reviews_submission_idx on public.bvss_submission_reviews(submission_id,reviewed_at desc);
create index if not exists bvss_submission_reviews_playlist_idx on public.bvss_submission_reviews(playlist_id);
create index if not exists bvss_submission_reviews_reviewer_idx on public.bvss_submission_reviews(reviewer_id);
create index if not exists bvss_placements_submission_idx on public.bvss_playlist_placements(submission_id);
create index if not exists bvss_sync_runs_playlist_idx on public.bvss_sync_runs(playlist_id,requested_at desc);
