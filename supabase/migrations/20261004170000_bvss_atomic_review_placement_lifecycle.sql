-- P0: atomic curator decisions and an honest placement lifecycle.
--
-- Verified 2026-10-04 against production (routes, reviews, placements, status
-- events and playlist tracks all have 0 rows, so no data is reinterpreted):
--   * bvss-curator review_route and bvss-admin review wrote placement, route,
--     review and status event in 4 separate requests (partial success possible);
--   * neither checked the route's current state, so a decided route could be
--     decided again (a second accept inserted a second placement);
--   * bvss_playlist_placements.placed_at was NOT NULL DEFAULT now(), so an
--     acceptance was recorded as a live placement with no evidence;
--   * decline reasons and hold dates were not validated server-side;
--   * admins held direct INSERT/UPDATE/DELETE on routes, reviews, placements,
--     status events and playlist tracks through bvss_admin_* policies.
--
-- After this migration:
--   * Placement lifecycle: scheduled -> pending_verification -> live ->
--     removed | completed (cancelled before live). Accept creates a SCHEDULED
--     placement. placed_at is the verified live time and is NULL until then.
--   * Live is reachable only through bvss_record_playlist_observation(), i.e. an
--     observed playlist snapshot from an automated source. "I've added it"
--     moves a placement to pending_verification and no further.
--   * Every decision and transition is one SECURITY DEFINER function call: one
--     transaction, row lock, server-side validation, status history.
--   * Route, review, placement, status-event and track rows are written only by
--     these functions (service role). Clients keep their existing SELECT access.
--
-- Route lifecycle is unchanged (queued, opened, hold, accepted, rejected,
-- withdrawn); fulfilment lives on the placement, linked by route_id. No new
-- table, no second status model.
--
-- Rollback: supabase/rollback/20261004170000_bvss_atomic_review_placement_lifecycle.down.sql

-- ---------------------------------------------------------------------------
-- 1. Placement lifecycle columns
-- ---------------------------------------------------------------------------
alter table public.bvss_playlist_placements
  add column if not exists status text not null default 'scheduled',
  add column if not exists route_id uuid references public.bvss_submission_routes(id) on delete set null,
  add column if not exists scheduled_for date,
  add column if not exists accepted_at timestamptz,
  add column if not exists added_reported_at timestamptz,
  add column if not exists added_reported_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_live_at timestamptz,
  add column if not exists verification_source text,
  add column if not exists verification_evidence jsonb,
  add column if not exists observed_track_id uuid references public.bvss_playlist_tracks(id) on delete set null,
  add column if not exists ended_at timestamptz,
  add column if not exists end_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.bvss_playlist_placements alter column placed_at drop default;
alter table public.bvss_playlist_placements alter column placed_at drop not null;

-- Rows written by the old code (none in production) were never verified. Keep
-- them, labelled honestly, rather than inventing evidence.
update public.bvss_playlist_placements
set status = case when removed_at is not null then 'removed' else 'live' end,
    verified_live_at = placed_at,
    verification_source = 'legacy_pre_lifecycle',
    verification_evidence = jsonb_build_object('note', 'created before the placement lifecycle; not verified'),
    ended_at = removed_at,
    end_reason = case when removed_at is not null then 'legacy_removed' end
where verification_source is null and placed_at is not null;

alter table public.bvss_playlist_placements
  add constraint bvss_placements_status_check
    check (status in ('scheduled','pending_verification','live','removed','completed','cancelled')),
  add constraint bvss_placements_verification_source_check
    check (verification_source is null or verification_source in ('spotify_owner_api','soundcharts_tracklist','legacy_pre_lifecycle')),
  -- Not live yet: no live time, no verification.
  add constraint bvss_placements_unverified_has_no_live_time
    check (status not in ('scheduled','pending_verification','cancelled') or (placed_at is null and verified_live_at is null)),
  -- Live or after: must carry verification evidence.
  add constraint bvss_placements_live_requires_evidence
    check (status not in ('live','removed','completed')
           or (placed_at is not null and verified_live_at is not null and verification_source is not null and verification_evidence is not null)),
  add constraint bvss_placements_pending_requires_report
    check (status <> 'pending_verification' or added_reported_at is not null),
  add constraint bvss_placements_ended_requires_time
    check (status not in ('removed','completed','cancelled') or ended_at is not null);

-- One placement per route; one open placement per track per playlist.
create unique index if not exists bvss_placements_route_unique
  on public.bvss_playlist_placements (route_id) where route_id is not null;
create unique index if not exists bvss_placements_open_track_unique
  on public.bvss_playlist_placements (playlist_id, spotify_track_id)
  where spotify_track_id is not null and status in ('scheduled','pending_verification','live');
create index if not exists bvss_placements_status_idx
  on public.bvss_playlist_placements (playlist_id, status);

-- ---------------------------------------------------------------------------
-- 2. Route decision fields
-- ---------------------------------------------------------------------------
alter table public.bvss_submission_routes
  add column if not exists hold_until timestamptz,
  add column if not exists decline_reasons text[] not null default '{}',
  add column if not exists decision_version integer not null default 0;

alter table public.bvss_submission_routes
  add constraint bvss_routes_hold_requires_date
    check (status <> 'hold' or hold_until is not null),
  add constraint bvss_routes_decline_reasons_valid
    check (decline_reasons <@ array['energy_mismatch','not_my_genre_lane','production_not_ready','too_similar_to_recent_adds','wrong_mood','vocal_style','mix_master','other']::text[]),
  add constraint bvss_routes_reject_requires_reason
    check (status <> 'rejected' or cardinality(decline_reasons) >= 1);

-- ---------------------------------------------------------------------------
-- 3. Writes only through the transition functions
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.bvss_submission_routes from anon, authenticated;
revoke insert, update, delete, truncate on public.bvss_submission_reviews from anon, authenticated;
revoke insert, update, delete, truncate on public.bvss_playlist_placements from anon, authenticated;
revoke insert, update, delete, truncate on public.bvss_submission_status_events from anon, authenticated;
revoke insert, update, delete, truncate on public.bvss_playlist_tracks from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3b. Dashboards count only verified live placements as "active"
-- ---------------------------------------------------------------------------
-- Previously active = removed_at IS NULL, which would count every scheduled
-- acceptance as an active placement. Definitions are the live 2026-10-04
-- definitions with only that predicate changed.
create or replace view public.bvss_playlist_daily_rollup with (security_invoker = true) as
 SELECT id AS playlist_id,
    slug,
    canonical_name,
    spotify_playlist_id,
    spotify_url,
    cover_asset_url,
    current_follower_count,
    follower_count_source,
    follower_count_observed_at,
    current_track_count,
    last_editorial_update_at,
    spotify_last_synced_at,
    submission_status,
    lifecycle_state,
    ( SELECT s.followers
           FROM bvss_playlist_metric_snapshots s
          WHERE s.playlist_id = p.id AND s.metric_date <= (CURRENT_DATE - 1) AND s.followers IS NOT NULL
          ORDER BY s.metric_date DESC, s.observed_at DESC
         LIMIT 1) AS followers_1d_ago,
    ( SELECT s.followers
           FROM bvss_playlist_metric_snapshots s
          WHERE s.playlist_id = p.id AND s.metric_date <= (CURRENT_DATE - 7) AND s.followers IS NOT NULL
          ORDER BY s.metric_date DESC, s.observed_at DESC
         LIMIT 1) AS followers_7d_ago,
    ( SELECT s.followers
           FROM bvss_playlist_metric_snapshots s
          WHERE s.playlist_id = p.id AND s.metric_date <= (CURRENT_DATE - 30) AND s.followers IS NOT NULL
          ORDER BY s.metric_date DESC, s.observed_at DESC
         LIMIT 1) AS followers_30d_ago,
    ( SELECT s.followers
           FROM bvss_playlist_metric_snapshots s
          WHERE s.playlist_id = p.id AND s.metric_date <= (CURRENT_DATE - 90) AND s.followers IS NOT NULL
          ORDER BY s.metric_date DESC, s.observed_at DESC
         LIMIT 1) AS followers_90d_ago,
    ( SELECT count(*) AS count
           FROM bvss_submissions s
          WHERE (p.id = ANY (s.preferred_playlist_ids)) AND (s.status = ANY (ARRAY['pending'::text, 'in_review'::text, 'hold'::text]))) AS submissions_waiting,
    ( SELECT count(*) AS count
           FROM bvss_playlist_placements pl
          WHERE pl.playlist_id = p.id AND pl.status = 'live'::text) AS active_placements,
    ( SELECT count(*) AS count
           FROM bvss_playlist_placements pl
          WHERE pl.playlist_id = p.id) AS placements_total,
    ( SELECT count(*) AS count
           FROM bvss_web_events e
          WHERE e.playlist_id = p.id AND e.event_name = 'playlist_view'::text AND e.occurred_at >= (now() - '30 days'::interval)) AS pageviews_30d,
    ( SELECT count(*) AS count
           FROM bvss_web_events e
          WHERE e.playlist_id = p.id AND e.event_name = 'spotify_click'::text AND e.occurred_at >= (now() - '30 days'::interval)) AS spotify_clicks_30d,
    ( SELECT COALESCE(sum(sm.impressions), 0::bigint) AS "coalesce"
           FROM bvss_search_metrics sm
          WHERE sm.playlist_id = p.id AND sm.metric_date >= (CURRENT_DATE - 30)) AS search_impressions_30d,
    ( SELECT COALESCE(sum(sm.clicks), 0::bigint) AS "coalesce"
           FROM bvss_search_metrics sm
          WHERE sm.playlist_id = p.id AND sm.metric_date >= (CURRENT_DATE - 30)) AS search_clicks_30d,
    ( SELECT count(*) AS count
           FROM bvss_playlist_tracks t
          WHERE t.playlist_id = p.id AND t.is_active AND (lower(array_to_string(t.artists, '|'::text)) ~~ '%middle child%'::text OR lower(array_to_string(t.artists, '|'::text)) ~~ '%subflower%'::text)) AS own_artist_placements
   FROM bvss_playlists p;

create or replace view public.bvss_curator_public_facts with (security_invoker = true) as
 SELECT c.id AS curator_id,
    c.handle,
    c.display_name,
    c.bio,
    c.website_url,
    c.spotify_profile_url,
    c.social_links,
    c.genres,
    c.moods,
    c.status,
    c.public_profile,
    count(DISTINCT p.id) FILTER (WHERE p.verification_status = 'verified'::text AND p.public_status = 'public'::text AND p.website_status = 'published'::text AND p.lifecycle_state = 'active'::text) AS verified_playlist_count,
    count(r.id) FILTER (WHERE r.decided_at IS NOT NULL) AS reviews_completed,
    count(r.id) FILTER (WHERE r.decision = 'accept'::text) AS accepted_count,
    count(r.id) FILTER (WHERE r.decision = 'reject'::text) AS rejected_count,
    count(r.id) FILTER (WHERE r.decision = 'hold'::text) AS held_count,
    percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ((EXTRACT(epoch FROM r.decided_at - r.routed_at) / 3600.0)::double precision)) FILTER (WHERE r.decided_at IS NOT NULL) AS median_response_hours,
    count(pl.id) FILTER (WHERE pl.status = 'live'::text) AS active_placements
   FROM bvss_curator_profiles c
     LEFT JOIN bvss_playlists p ON p.curator_id = c.id
     LEFT JOIN bvss_submission_routes r ON r.curator_id = c.id
     LEFT JOIN bvss_playlist_placements pl ON pl.id = r.placement_id
  GROUP BY c.id;

revoke insert, update, delete, truncate, trigger on public.bvss_playlist_daily_rollup, public.bvss_curator_public_facts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.bvss_refresh_submission_status(p_submission_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next text;
begin
  select case
    when bool_or(status = 'accepted') then 'accepted'
    when bool_or(status in ('queued','opened')) then 'in_review'
    when bool_or(status = 'hold') then 'hold'
    when bool_and(status in ('rejected','withdrawn')) and bool_or(status = 'rejected') then 'rejected'
    else null end
  into v_next
  from public.bvss_submission_routes where submission_id = p_submission_id;
  if v_next is not null then
    update public.bvss_submissions set status = v_next
    where id = p_submission_id and status is distinct from v_next and status <> 'withdrawn';
  end if;
  return v_next;
end
$$;

-- Actor: {"kind":"curator","user_id":..,"curator_id":..,"label":..}
--     or {"kind":"admin","user_id":..,"label":..}
-- Curators act on routes assigned to them; BVSS admins act on BVSS-owned
-- routes (curator_id is null). Edge functions authenticate before calling.
create or replace function public.bvss_actor_can_act(p_actor jsonb, p_route_curator uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := p_actor ->> 'kind';
  v_curator uuid := nullif(p_actor ->> 'curator_id', '')::uuid;
  v_status text;
begin
  if v_kind = 'admin' then
    if p_route_curator is not null then return 'not_bvss_route'; end if;
    return null;
  elsif v_kind = 'curator' then
    if v_curator is null or p_route_curator is distinct from v_curator then return 'route_not_found'; end if;
    select status into v_status from public.bvss_curator_profiles where id = v_curator;
    if v_status is distinct from 'approved' then return 'curator_not_approved'; end if;
    return null;
  end if;
  return 'invalid_actor';
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Decide a route (accept / hold / reject), atomically
-- ---------------------------------------------------------------------------
create or replace function public.bvss_decide_route(
  p_route_id uuid,
  p_actor jsonb,
  p_decision text,
  p_reasons text[] default '{}',
  p_notes text default null,
  p_hold_until timestamptz default null,
  p_target_position integer default null,
  p_scheduled_for date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.bvss_submission_routes%rowtype;
  v_track text;
  v_deny text;
  v_next text;
  v_now timestamptz := now();
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_reasons text[] := coalesce(p_reasons, '{}');
  v_placement uuid;
  v_sched date;
  v_label text;
  v_detail text;
begin
  if p_decision not in ('accept','hold','reject') then
    return jsonb_build_object('ok', false, 'error', 'invalid_decision');
  end if;

  select * into r from public.bvss_submission_routes where id = p_route_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'route_not_found'); end if;

  v_deny := public.bvss_actor_can_act(p_actor, r.curator_id);
  if v_deny is not null then return jsonb_build_object('ok', false, 'error', v_deny); end if;

  v_next := case p_decision when 'accept' then 'accepted' when 'reject' then 'rejected' else 'hold' end;

  -- Already decided: same decision is a no-op, a different one is refused.
  if r.status in ('accepted','rejected') then
    if r.status = v_next then
      return jsonb_build_object('ok', true, 'idempotent', true, 'status', r.status, 'placement_id', r.placement_id);
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_decided', 'status', r.status);
  end if;
  if r.status = 'withdrawn' then return jsonb_build_object('ok', false, 'error', 'route_withdrawn'); end if;
  if r.status not in ('queued','opened','hold') then
    return jsonb_build_object('ok', false, 'error', 'invalid_route_state', 'status', r.status);
  end if;

  -- Server-side validation.
  if v_notes is not null and char_length(v_notes) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'notes_too_long');
  end if;
  if p_decision = 'reject' then
    if cardinality(v_reasons) < 1 then return jsonb_build_object('ok', false, 'error', 'decline_reason_required'); end if;
    if not v_reasons <@ array['energy_mismatch','not_my_genre_lane','production_not_ready','too_similar_to_recent_adds','wrong_mood','vocal_style','mix_master','other']::text[] then
      return jsonb_build_object('ok', false, 'error', 'invalid_decline_reason');
    end if;
    if v_notes is not null and char_length(v_notes) > 280 then
      return jsonb_build_object('ok', false, 'error', 'decline_note_too_long');
    end if;
  elsif cardinality(v_reasons) > 0 then
    return jsonb_build_object('ok', false, 'error', 'reasons_only_for_decline');
  end if;
  if p_decision = 'hold' then
    if p_hold_until is null or p_hold_until <= v_now or p_hold_until > v_now + interval '30 days' then
      return jsonb_build_object('ok', false, 'error', 'hold_date_invalid');
    end if;
  elsif p_hold_until is not null then
    return jsonb_build_object('ok', false, 'error', 'hold_date_only_for_hold');
  end if;
  if p_target_position is not null and p_target_position < 1 then
    return jsonb_build_object('ok', false, 'error', 'target_position_invalid');
  end if;
  if p_decision = 'accept' then
    v_sched := coalesce(p_scheduled_for, current_date);
    if v_sched < current_date - 1 or v_sched > current_date + 60 then
      return jsonb_build_object('ok', false, 'error', 'scheduled_date_invalid');
    end if;
    select spotify_track_id into v_track from public.bvss_submissions where id = r.submission_id;
    if v_track is not null and exists (
      select 1 from public.bvss_playlist_placements
      where playlist_id = r.playlist_id and spotify_track_id = v_track
        and status in ('scheduled','pending_verification','live')
    ) then
      return jsonb_build_object('ok', false, 'error', 'track_already_placed_on_playlist');
    end if;
  end if;

  -- Writes (one transaction).
  if p_decision = 'accept' then
    insert into public.bvss_playlist_placements
      (submission_id, playlist_id, spotify_track_id, route_id, status, scheduled_for, accepted_at, target_position, notes)
    values
      (r.submission_id, r.playlist_id, v_track, r.id, 'scheduled', v_sched, v_now, p_target_position, v_notes)
    returning id into v_placement;
  end if;

  update public.bvss_submission_routes set
    status = v_next,
    decision = p_decision,
    decision_notes = v_notes,
    decline_reasons = case when p_decision = 'reject' then v_reasons else '{}' end,
    hold_until = case when p_decision = 'hold' then p_hold_until else null end,
    decided_at = case when p_decision = 'hold' then null else v_now end,
    first_opened_at = coalesce(first_opened_at, v_now),
    placement_id = coalesce(v_placement, placement_id),
    decision_version = decision_version + 1
  where id = r.id;

  insert into public.bvss_submission_reviews
    (submission_id, decision, playlist_id, reviewer_id, reviewer_label, target_position, review_notes)
  values
    (r.submission_id, p_decision, r.playlist_id, nullif(p_actor ->> 'user_id', '')::uuid, p_actor ->> 'label', p_target_position,
     case when p_decision = 'reject' then concat_ws(E'\n', 'reasons: ' || array_to_string(v_reasons, ', '), v_notes) else v_notes end);

  v_label := case p_decision when 'accept' then 'Accepted, placing' when 'hold' then 'On hold' else 'Declined' end;
  v_detail := case p_decision
    when 'accept' then 'A curator accepted your track. It is scheduled and will show as placed once the playlist confirms it.'
    when 'hold' then 'A curator is keeping your track in their queue and will revisit it by ' || to_char(p_hold_until at time zone 'UTC', 'Mon DD') || '.'
    else 'A curator reviewed your track and passed. Reason: ' || replace(array_to_string(v_reasons, ', '), '_', ' ') || '.' end;
  insert into public.bvss_submission_status_events (submission_id, event_type, public_label, public_detail)
  values (r.submission_id, 'curator_' || p_decision, v_label, v_detail);

  perform public.bvss_refresh_submission_status(r.submission_id);

  return jsonb_build_object('ok', true, 'idempotent', false, 'status', v_next, 'placement_id', v_placement,
                            'placement_status', case when v_placement is not null then 'scheduled' end);
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Curator reports "I've added it" -> pending verification (never live)
-- ---------------------------------------------------------------------------
create or replace function public.bvss_report_placement_added(p_placement_id uuid, p_actor jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p public.bvss_playlist_placements%rowtype;
  v_route_curator uuid;
  v_deny text;
begin
  select * into p from public.bvss_playlist_placements where id = p_placement_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'placement_not_found'); end if;
  select curator_id into v_route_curator from public.bvss_submission_routes where id = p.route_id;
  if p.route_id is null then return jsonb_build_object('ok', false, 'error', 'placement_not_found'); end if;
  v_deny := public.bvss_actor_can_act(p_actor, v_route_curator);
  if v_deny is not null then return jsonb_build_object('ok', false, 'error', v_deny); end if;

  if p.status in ('pending_verification','live') then
    return jsonb_build_object('ok', true, 'idempotent', true, 'status', p.status);
  end if;
  if p.status <> 'scheduled' then
    return jsonb_build_object('ok', false, 'error', 'invalid_placement_state', 'status', p.status);
  end if;

  update public.bvss_playlist_placements
  set status = 'pending_verification', added_reported_at = now(),
      added_reported_by = nullif(p_actor ->> 'user_id', '')::uuid, updated_at = now()
  where id = p.id;

  if p.submission_id is not null then
    insert into public.bvss_submission_status_events (submission_id, event_type, public_label, public_detail)
    values (p.submission_id, 'placement_added_reported', 'Pending sync confirmation',
            'The curator reports adding your track. It shows as placed once the playlist sync confirms it (usually within 24 hours).');
  end if;
  return jsonb_build_object('ok', true, 'idempotent', false, 'status', 'pending_verification');
end
$$;

-- ---------------------------------------------------------------------------
-- 7. Observed playlist snapshot -> the only path to live / removed
-- ---------------------------------------------------------------------------
-- p_tracks: [{"spotify_track_id":"..","position":0,"added_at":".."}, ...] (the full playlist).
-- Only verification facts are kept: track id, position, added time. No titles,
-- artists or other playlist content are stored from this path.
-- p_context: {"evidence_hash":"sha256 of the observed id list","method":"..","triggered_by":".."}
create or replace function public.bvss_record_playlist_observation(
  p_playlist_id uuid,
  p_source text,
  p_snapshot_id text,
  p_observed_at timestamptz,
  p_tracks jsonb,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_live integer := 0;
  v_removed integer := 0;
  rec record;
  v_track public.bvss_playlist_tracks%rowtype;
  v_name text;
begin
  if p_source not in ('spotify_owner_api','soundcharts_tracklist') then
    return jsonb_build_object('ok', false, 'error', 'invalid_observation_source');
  end if;
  if p_observed_at is null or p_observed_at > now() + interval '5 minutes' or p_observed_at < now() - interval '2 days' then
    return jsonb_build_object('ok', false, 'error', 'observed_at_invalid');
  end if;
  if jsonb_typeof(coalesce(p_context, '{}'::jsonb)) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'error', 'context_must_be_object');
  end if;
  if jsonb_typeof(p_tracks) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'error', 'tracks_must_be_array');
  end if;
  if exists (select 1 from jsonb_array_elements(p_tracks) t where coalesce(t ->> 'spotify_track_id', '') !~ '^[A-Za-z0-9]{22}$') then
    return jsonb_build_object('ok', false, 'error', 'invalid_track_id');
  end if;
  select canonical_name into v_name from public.bvss_playlists where id = p_playlist_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'playlist_not_found'); end if;

  -- Upsert the observed contents; tracks absent from the snapshot become inactive.
  insert into public.bvss_playlist_tracks
    (playlist_id, spotify_track_id, position, added_at, first_seen_at, last_seen_at, is_active, source, source_metadata)
  select p_playlist_id, t ->> 'spotify_track_id', nullif(t ->> 'position', '')::integer,
         nullif(t ->> 'added_at', '')::timestamptz, p_observed_at, p_observed_at, true, p_source,
         jsonb_build_object('snapshot_id', p_snapshot_id, 'evidence_hash', p_context ->> 'evidence_hash')
  from jsonb_array_elements(p_tracks) t
  on conflict (playlist_id, spotify_track_id) do update set
    position = excluded.position,
    added_at = coalesce(excluded.added_at, bvss_playlist_tracks.added_at),
    first_seen_at = case when bvss_playlist_tracks.is_active then bvss_playlist_tracks.first_seen_at else excluded.first_seen_at end,
    last_seen_at = excluded.last_seen_at,
    is_active = true,
    source = excluded.source,
    source_metadata = excluded.source_metadata
  where bvss_playlist_tracks.last_seen_at <= excluded.last_seen_at;
  get diagnostics v_count = row_count;

  update public.bvss_playlist_tracks set is_active = false
  where playlist_id = p_playlist_id and is_active and last_seen_at < p_observed_at
    and spotify_track_id not in (select t ->> 'spotify_track_id' from jsonb_array_elements(p_tracks) t);

  -- Open placements whose track is now observed become live, with evidence.
  for rec in
    select pl.id, pl.submission_id, pl.status, pl.spotify_track_id
    from public.bvss_playlist_placements pl
    where pl.playlist_id = p_playlist_id and pl.status in ('scheduled','pending_verification') and pl.spotify_track_id is not null
    for update
  loop
    select * into v_track from public.bvss_playlist_tracks
    where playlist_id = p_playlist_id and spotify_track_id = rec.spotify_track_id and is_active;
    if found then
      update public.bvss_playlist_placements set
        status = 'live',
        placed_at = coalesce(v_track.added_at, p_observed_at),
        verified_live_at = p_observed_at,
        actual_position = v_track.position,
        observed_track_id = v_track.id,
        verification_source = p_source,
        verification_evidence = jsonb_build_object(
          'source', p_source, 'snapshot_id', p_snapshot_id, 'observed_at', p_observed_at,
          'playlist_id', p_playlist_id, 'spotify_track_id', rec.spotify_track_id,
          'position', v_track.position, 'added_at', v_track.added_at,
          'playlist_size', jsonb_array_length(p_tracks), 'reported_before_detection', rec.status = 'pending_verification',
          'evidence_hash', p_context ->> 'evidence_hash', 'method', coalesce(p_context ->> 'method', p_source),
          'triggered_by', p_context ->> 'triggered_by'),
        updated_at = now()
      where id = rec.id;
      v_live := v_live + 1;
      if rec.submission_id is not null then
        insert into public.bvss_submission_status_events (submission_id, event_type, public_label, public_detail)
        values (rec.submission_id, 'placement_live', 'Placed on ' || v_name,
                'Confirmed in the playlist' || coalesce(' at position ' || (v_track.position + 1)::text, '') || ' on ' || to_char(p_observed_at at time zone 'UTC', 'Mon DD') || '.');
      end if;
    end if;
  end loop;

  -- Live placements whose track disappeared are removed (detected, not assumed).
  for rec in
    select pl.id, pl.submission_id
    from public.bvss_playlist_placements pl
    join public.bvss_playlist_tracks t on t.playlist_id = pl.playlist_id and t.spotify_track_id = pl.spotify_track_id
    where pl.playlist_id = p_playlist_id and pl.status = 'live' and not t.is_active
    for update of pl
  loop
    update public.bvss_playlist_placements set
      status = 'removed', removed_at = p_observed_at, ended_at = p_observed_at, end_reason = 'not_in_playlist_snapshot',
      verification_evidence = verification_evidence || jsonb_build_object('removed_snapshot_id', p_snapshot_id, 'removed_observed_at', p_observed_at),
      updated_at = now()
    where id = rec.id;
    v_removed := v_removed + 1;
    if rec.submission_id is not null then
      insert into public.bvss_submission_status_events (submission_id, event_type, public_label, public_detail)
      values (rec.submission_id, 'placement_removed', 'Removed from ' || v_name,
              'The playlist sync no longer finds your track as of ' || to_char(p_observed_at at time zone 'UTC', 'Mon DD') || '.');
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'tracks_observed', jsonb_array_length(p_tracks), 'rows_written', v_count,
                            'placements_live', v_live, 'placements_removed', v_removed);
end
$$;

-- ---------------------------------------------------------------------------
-- 8. End a placement: live -> completed, scheduled/pending -> cancelled
-- ---------------------------------------------------------------------------
create or replace function public.bvss_end_placement(p_placement_id uuid, p_actor jsonb, p_outcome text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p public.bvss_playlist_placements%rowtype;
  v_route_curator uuid;
  v_deny text;
begin
  if p_outcome not in ('completed','cancelled') then return jsonb_build_object('ok', false, 'error', 'invalid_outcome'); end if;
  select * into p from public.bvss_playlist_placements where id = p_placement_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'placement_not_found'); end if;
  if p.route_id is not null then
    select curator_id into v_route_curator from public.bvss_submission_routes where id = p.route_id;
  end if;
  v_deny := public.bvss_actor_can_act(p_actor, v_route_curator);
  if v_deny is not null then return jsonb_build_object('ok', false, 'error', v_deny); end if;
  if p.status = p_outcome then return jsonb_build_object('ok', true, 'idempotent', true, 'status', p.status); end if;
  if p_outcome = 'completed' and p.status <> 'live' then
    return jsonb_build_object('ok', false, 'error', 'only_live_can_complete', 'status', p.status);
  end if;
  if p_outcome = 'cancelled' and p.status not in ('scheduled','pending_verification') then
    return jsonb_build_object('ok', false, 'error', 'only_unverified_can_cancel', 'status', p.status);
  end if;
  update public.bvss_playlist_placements
  set status = p_outcome, ended_at = now(), end_reason = left(coalesce(nullif(btrim(p_reason), ''), p_outcome), 500), updated_at = now()
  where id = p.id;
  if p.submission_id is not null then
    insert into public.bvss_submission_status_events (submission_id, event_type, public_label, public_detail)
    values (p.submission_id, 'placement_' || p_outcome,
            case p_outcome when 'completed' then 'Placement completed' else 'Placement cancelled' end,
            case p_outcome when 'completed' then 'The agreed placement period has ended.' else 'The scheduled placement did not go ahead.' end);
  end if;
  return jsonb_build_object('ok', true, 'idempotent', false, 'status', p_outcome);
end
$$;

-- ---------------------------------------------------------------------------
-- 9. Execute: service role only
-- ---------------------------------------------------------------------------
revoke all on function public.bvss_refresh_submission_status(uuid) from public, anon, authenticated;
revoke all on function public.bvss_actor_can_act(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.bvss_decide_route(uuid, jsonb, text, text[], text, timestamptz, integer, date) from public, anon, authenticated;
revoke all on function public.bvss_report_placement_added(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.bvss_record_playlist_observation(uuid, text, text, timestamptz, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.bvss_end_placement(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.bvss_refresh_submission_status(uuid) to service_role;
grant execute on function public.bvss_actor_can_act(jsonb, uuid) to service_role;
grant execute on function public.bvss_decide_route(uuid, jsonb, text, text[], text, timestamptz, integer, date) to service_role;
grant execute on function public.bvss_report_placement_added(uuid, jsonb) to service_role;
grant execute on function public.bvss_record_playlist_observation(uuid, text, text, timestamptz, jsonb, jsonb) to service_role;
grant execute on function public.bvss_end_placement(uuid, jsonb, text, text) to service_role;
