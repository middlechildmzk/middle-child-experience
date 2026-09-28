-- BVSS FVM canonical playlist follower-growth report
-- READ ONLY. Uses same-playlist Soundcharts intersections for deltas.

with eligible as (
  select id, slug, canonical_name
  from public.bvss_playlists
  where public_status = 'public'
    and lifecycle_state = 'active'
),
dates as (
  select
    max(s.metric_date) as current_date,
    max(s.metric_date) filter (
      where s.metric_date < (
        select max(s2.metric_date)
        from public.bvss_playlist_metric_snapshots s2
        join eligible e2 on e2.id = s2.playlist_id
        where s2.source = 'soundcharts'
          and s2.followers is not null
      )
    ) as previous_date
  from public.bvss_playlist_metric_snapshots s
  join eligible e on e.id = s.playlist_id
  where s.source = 'soundcharts'
    and s.followers is not null
),
resolved_dates as (
  select
    current_date,
    previous_date,
    (
      select max(s.metric_date)
      from public.bvss_playlist_metric_snapshots s
      join eligible e on e.id=s.playlist_id
      where s.source='soundcharts'
        and s.followers is not null
        and s.metric_date <= dates.current_date - 7
    ) as seven_day_date
  from dates
),
current_snap as (
  select s.playlist_id, s.followers, s.metric_date
  from public.bvss_playlist_metric_snapshots s
  join eligible e on e.id=s.playlist_id
  cross join resolved_dates d
  where s.source='soundcharts'
    and s.followers is not null
    and s.metric_date=d.current_date
),
previous_snap as (
  select s.playlist_id, s.followers, s.metric_date
  from public.bvss_playlist_metric_snapshots s
  join eligible e on e.id=s.playlist_id
  cross join resolved_dates d
  where s.source='soundcharts'
    and s.followers is not null
    and s.metric_date=d.previous_date
),
seven_day_snap as (
  select s.playlist_id, s.followers, s.metric_date
  from public.bvss_playlist_metric_snapshots s
  join eligible e on e.id=s.playlist_id
  cross join resolved_dates d
  where s.source='soundcharts'
    and s.followers is not null
    and s.metric_date=d.seven_day_date
),
daily as (
  select
    e.id as playlist_id,
    e.slug,
    e.canonical_name,
    c.followers as current_followers,
    p.followers as previous_followers,
    c.followers - p.followers as delta_1d
  from current_snap c
  join previous_snap p using (playlist_id)
  join eligible e on e.id=c.playlist_id
),
weekly as (
  select
    c.playlist_id,
    c.followers as current_followers,
    w.followers as baseline_followers,
    c.followers - w.followers as delta_7d
  from current_snap c
  join seven_day_snap w using (playlist_id)
)
select json_build_object(
  'dates', (
    select json_build_object(
      'current', current_date,
      'previous', previous_date,
      'seven_day', seven_day_date
    ) from resolved_dates
  ),
  'registry', json_build_object(
    'eligible_playlists', (select count(*) from eligible),
    'current_measured_playlists', (select count(*) from current_snap),
    'current_measured_followers', (select coalesce(sum(followers),0) from current_snap)
  ),
  'daily', json_build_object(
    'comparable_count', (select count(*) from daily),
    'previous_total', (select coalesce(sum(previous_followers),0) from daily),
    'current_total', (select coalesce(sum(current_followers),0) from daily),
    'net_change', (select coalesce(sum(delta_1d),0) from daily),
    'gainers', (
      select coalesce(json_agg(json_build_object(
        'playlist', canonical_name,
        'slug', slug,
        'followers', current_followers,
        'delta', delta_1d
      ) order by delta_1d desc), '[]'::json)
      from daily where delta_1d > 0
    ),
    'decliners', (
      select coalesce(json_agg(json_build_object(
        'playlist', canonical_name,
        'slug', slug,
        'followers', current_followers,
        'delta', delta_1d
      ) order by delta_1d asc), '[]'::json)
      from daily where delta_1d < 0
    ),
    'flat', (
      select coalesce(json_agg(json_build_object(
        'playlist', canonical_name,
        'slug', slug,
        'followers', current_followers
      ) order by canonical_name), '[]'::json)
      from daily where delta_1d = 0
    ),
    'coverage_added', (
      select coalesce(json_agg(json_build_object(
        'playlist', e.canonical_name,
        'slug', e.slug,
        'followers', c.followers
      ) order by e.canonical_name), '[]'::json)
      from current_snap c
      join eligible e on e.id=c.playlist_id
      where not exists (
        select 1 from previous_snap p where p.playlist_id=c.playlist_id
      )
    ),
    'coverage_missing', (
      select coalesce(json_agg(json_build_object(
        'playlist', e.canonical_name,
        'slug', e.slug,
        'previous_followers', p.followers
      ) order by e.canonical_name), '[]'::json)
      from previous_snap p
      join eligible e on e.id=p.playlist_id
      where not exists (
        select 1 from current_snap c where c.playlist_id=p.playlist_id
      )
    )
  ),
  'seven_day', json_build_object(
    'comparable_count', (select count(*) from weekly),
    'baseline_total', (select coalesce(sum(baseline_followers),0) from weekly),
    'current_total', (select coalesce(sum(current_followers),0) from weekly),
    'net_change', (select coalesce(sum(delta_7d),0) from weekly)
  )
) as report;
