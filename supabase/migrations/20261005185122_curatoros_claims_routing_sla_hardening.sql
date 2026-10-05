-- CuratorOS beta hardening: canonical claims, deterministic hard eligibility, atomic route reservation, and SLA expiry.

alter table public.bvss_submission_routes
  add column if not exists response_due_at timestamptz,
  add column if not exists expired_at timestamptz,
  add column if not exists eligibility_evidence jsonb not null default '{}'::jsonb,
  add column if not exists eligibility_version text;

alter table public.bvss_submission_routes
  drop constraint if exists bvss_submission_routes_status_check;
alter table public.bvss_submission_routes
  add constraint bvss_submission_routes_status_check
  check (status in ('queued','opened','hold','accepted','rejected','withdrawn','expired'));

create index if not exists bvss_routes_due_idx
  on public.bvss_submission_routes(response_due_at)
  where status in ('queued','opened');

alter table public.bvss_submission_matches alter column score drop not null;
alter table public.bvss_submission_matches
  add column if not exists fit_band text,
  add column if not exists fit_evidence jsonb not null default '{}'::jsonb,
  add column if not exists eligibility_status text not null default 'eligible',
  add column if not exists eligibility_reasons jsonb not null default '[]'::jsonb,
  add column if not exists evaluated_at timestamptz not null default now();

alter table public.bvss_submission_matches
  drop constraint if exists bvss_matches_fit_band_check;
alter table public.bvss_submission_matches
  add constraint bvss_matches_fit_band_check
  check (fit_band is null or fit_band in ('strong_fit','worth_a_look','long_shot'));

alter table public.bvss_submission_matches
  drop constraint if exists bvss_matches_eligibility_check;
alter table public.bvss_submission_matches
  add constraint bvss_matches_eligibility_check
  check (eligibility_status in ('eligible','ineligible'));

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
    when bool_or(status in ('queued','opened')) then 'in_review'
    when bool_or(status = 'hold') then 'hold'
    when bool_or(status = 'accepted') then 'accepted'
    when bool_and(status in ('rejected','withdrawn','expired')) and bool_or(status in ('rejected','expired')) then 'rejected'
    else null end
  into v_next
  from public.bvss_submission_routes
  where submission_id = p_submission_id;

  if v_next is not null then
    update public.bvss_submissions
    set status = v_next
    where id = p_submission_id
      and status is distinct from v_next
      and status <> 'withdrawn';
  end if;
  return v_next;
end
$$;

create or replace function public.curatoros_decide_playlist_claim(
  p_claim_id uuid,
  p_reviewer uuid,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.bvss_curator_playlist_claims%rowtype;
  p public.bvss_playlists%rowtype;
  cp public.bvss_curator_profiles%rowtype;
  pc public.property_claims%rowtype;
  v_now timestamptz := now();
  v_verified boolean;
begin
  if p_decision not in ('approve','reject') then
    return jsonb_build_object('ok',false,'error','invalid_decision');
  end if;

  select * into c from public.bvss_curator_playlist_claims where id=p_claim_id for update;
  if not found then return jsonb_build_object('ok',false,'error','claim_not_found'); end if;

  select * into p from public.bvss_playlists where id=c.playlist_id for update;
  if not found then return jsonb_build_object('ok',false,'error','playlist_not_found'); end if;
  select * into cp from public.bvss_curator_profiles where id=c.curator_id for update;
  if not found then return jsonb_build_object('ok',false,'error','curator_not_found'); end if;

  if p_decision='approve' and cp.status <> 'approved' then
    return jsonb_build_object('ok',false,'error','approve_curator_first');
  end if;
  if p.property_id is null or cp.professional_profile_id is null or cp.workspace_id is null then
    return jsonb_build_object('ok',false,'error','canonical_identity_missing');
  end if;

  v_verified := p_decision='approve';

  update public.bvss_curator_playlist_claims
  set status=case when v_verified then 'verified' else 'rejected' end,
      verified_at=case when v_verified then v_now else null end,
      verified_by=p_reviewer,
      notes=nullif(btrim(coalesce(p_notes,'')),'')
  where id=c.id;

  select * into pc
  from public.property_claims
  where property_id=p.property_id
    and claimant_user_id=cp.user_id
  order by created_at desc
  limit 1
  for update;

  if found then
    update public.property_claims
    set status=case when v_verified then 'approved' else 'rejected' end,
        reviewer_notes=nullif(btrim(coalesce(p_notes,'')),''),
        reviewed_by=p_reviewer,
        reviewed_at=v_now,
        updated_at=v_now
    where id=pc.id;
  end if;

  if v_verified then
    insert into public.professional_properties
      (professional_profile_id,property_id,role,status,verified_at)
    values
      (cp.professional_profile_id,p.property_id,'owner','active',v_now)
    on conflict (professional_profile_id,property_id)
    do update set role='owner',status='active',verified_at=excluded.verified_at;

    update public.properties
    set verification_status='verified',
        evidence_strength=greatest(coalesce(evidence_strength,1),3),
        updated_at=v_now
    where id=p.property_id;

    insert into public.evidence_records
      (workspace_id,evidence_type,source_type,source_uri,summary,confidence,
       observed_at,captured_by,content_hash,metadata,verification_level,
       verification_method,verification_status,confidence_score)
    values
      (cp.workspace_id,'playlist_ownership_claim','human_attestation',
       coalesce(pc.evidence_url,p.spotify_url),
       'CuratorOS verified control of Spotify playlist '||p.canonical_name,
       'verified',v_now,p_reviewer,
       md5(p.id::text||':'||c.id::text||':'||v_now::text),
       jsonb_build_object('property_id',p.property_id,'playlist_id',p.id,'legacy_claim_id',c.id,
                          'canonical_claim_id',pc.id,'method',coalesce(pc.verification_method,'website_token')),
       'L3',coalesce(pc.verification_method,'website_token'),'verified',1.0);
  else
    update public.professional_properties
    set status='revoked'
    where professional_profile_id=cp.professional_profile_id and property_id=p.property_id;

    update public.properties
    set verification_status='unverified',updated_at=v_now
    where id=p.property_id;
  end if;

  update public.bvss_playlists
  set verification_status=case when v_verified then 'verified' else 'rejected' end,
      verified_at=case when v_verified then v_now else null end,
      verified_by=p_reviewer,
      public_status=case when v_verified then 'public' else 'private' end,
      website_status=case when v_verified then 'published' else 'hidden' end,
      lifecycle_state=case when v_verified then 'active' else lifecycle_state end,
      submission_status=case when v_verified then 'open' else 'paused' end,
      network_routing_enabled=v_verified,
      updated_at=v_now
  where id=p.id;

  return jsonb_build_object('ok',true,'claim_id',c.id,'playlist_id',p.id,
                            'status',case when v_verified then 'verified' else 'rejected' end,
                            'property_id',p.property_id);
end
$$;

create or replace function public.bvss_evaluate_route(
  p_submission_id uuid,
  p_playlist_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  s public.bvss_submissions%rowtype;
  p public.bvss_playlists%rowtype;
  cp public.bvss_curator_profiles%rowtype;
  v_reasons text[] := '{}';
  v_material text[];
  v_open integer := 0;
  v_max integer;
  v_used integer;
  v_due timestamptz;
begin
  select * into s from public.bvss_submissions where id=p_submission_id;
  if not found then return jsonb_build_object('eligible',false,'reasons',jsonb_build_array('submission_not_found')); end if;
  select * into p from public.bvss_playlists where id=p_playlist_id;
  if not found then return jsonb_build_object('eligible',false,'reasons',jsonb_build_array('playlist_not_found')); end if;

  if p.submission_status <> 'open' or p.lifecycle_state <> 'active' or p.website_status <> 'published'
     or p.verification_status <> 'verified' or not p.network_routing_enabled then
    v_reasons := array_append(v_reasons,'playlist_not_open');
  end if;
  if s.release_state='unreleased' and not p.accepts_unreleased then v_reasons:=array_append(v_reasons,'unreleased_not_accepted'); end if;
  if s.is_explicit and not p.accepts_explicit then v_reasons:=array_append(v_reasons,'explicit_not_accepted'); end if;

  v_material := array(
    select regexp_replace(lower(x),'[^a-z0-9]+',' ','g')
    from unnest(array[s.genre] || coalesce(s.moods,'{}') || coalesce(s.comparable_artists,'{}')) x
    where nullif(btrim(x),'') is not null
  );
  if exists (
    select 1 from unnest(coalesce(p.hard_no_tags,'{}')) h
    where regexp_replace(lower(h),'[^a-z0-9]+',' ','g') = any(v_material)
  ) then v_reasons:=array_append(v_reasons,'hard_no_rule'); end if;

  select count(*) into v_open from public.bvss_submission_routes r
  where r.playlist_id=p.id and r.status in ('queued','opened','hold');
  if v_open >= p.max_open_routes then v_reasons:=array_append(v_reasons,'playlist_capacity'); end if;

  if s.spotify_track_id is not null and p.route_cooldown_days > 0 and exists (
    select 1 from public.bvss_submission_routes r
    join public.bvss_submissions rs on rs.id=r.submission_id
    where r.playlist_id=p.id
      and rs.spotify_track_id=s.spotify_track_id
      and r.routed_at > now()-(p.route_cooldown_days||' days')::interval
      and r.submission_id <> s.id
  ) then v_reasons:=array_append(v_reasons,'cooldown_active'); end if;

  if p.network_owner_type='partner' then
    if p.curator_id is null then
      v_reasons:=array_append(v_reasons,'curator_missing');
    else
      select * into cp from public.bvss_curator_profiles where id=p.curator_id;
      if not found or cp.status <> 'approved' then v_reasons:=array_append(v_reasons,'curator_not_approved'); end if;
      if cp.professional_profile_id is null or p.property_id is null or not exists (
        select 1 from public.professional_properties pp
        where pp.professional_profile_id=cp.professional_profile_id
          and pp.property_id=p.property_id
          and pp.status='active'
          and pp.verified_at is not null
      ) then v_reasons:=array_append(v_reasons,'canonical_claim_not_verified'); end if;

      select max_monthly_routes into v_max from public.bvss_curator_entitlements where curator_id=p.curator_id;
      select routes_this_month::integer into v_used from public.bvss_curator_usage_monthly where curator_id=p.curator_id;
      if coalesce(v_max,0) <= coalesce(v_used,0) then v_reasons:=array_append(v_reasons,'curator_capacity'); end if;
    end if;
  end if;

  v_due := case when p.review_sla_hours is null then null else now()+(p.review_sla_hours||' hours')::interval end;

  return jsonb_build_object(
    'eligible',coalesce(array_length(v_reasons,1),0)=0,
    'reasons',to_jsonb(v_reasons),
    'response_due_at',v_due,
    'curator_id',p.curator_id,
    'network_organization_id',p.network_organization_id,
    'version','eligibility-v1'
  );
end
$$;

create or replace function public.bvss_reserve_route(
  p_submission_id uuid,
  p_playlist_id uuid,
  p_route_type text,
  p_fit_band text default null,
  p_fit_evidence jsonb default '{}'::jsonb,
  p_rank integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p public.bvss_playlists%rowtype;
  v_eval jsonb;
  v_route public.bvss_submission_routes%rowtype;
  v_match uuid;
begin
  if p_route_type not in ('preferred','matched','manual','bvss_internal') then
    return jsonb_build_object('ok',false,'error','invalid_route_type');
  end if;
  if p_fit_band is not null and p_fit_band not in ('strong_fit','worth_a_look','long_shot') then
    return jsonb_build_object('ok',false,'error','invalid_fit_band');
  end if;
  if p_rank < 1 then return jsonb_build_object('ok',false,'error','invalid_rank'); end if;

  select * into p from public.bvss_playlists where id=p_playlist_id for update;
  if not found then return jsonb_build_object('ok',false,'error','playlist_not_found'); end if;

  select * into v_route from public.bvss_submission_routes
  where submission_id=p_submission_id and playlist_id=p_playlist_id;
  if found then
    return jsonb_build_object('ok',true,'idempotent',true,'route_id',v_route.id,'status',v_route.status);
  end if;

  v_eval := public.bvss_evaluate_route(p_submission_id,p_playlist_id);

  insert into public.bvss_submission_matches
    (submission_id,playlist_id,score,reasons,rank,matcher_version,fit_band,fit_evidence,
     eligibility_status,eligibility_reasons,evaluated_at)
  values
    (p_submission_id,p_playlist_id,null,coalesce(p_fit_evidence->'reasons','[]'::jsonb),
     p_rank,'evidence-v1',p_fit_band,coalesce(p_fit_evidence,'{}'::jsonb),
     case when (v_eval->>'eligible')::boolean then 'eligible' else 'ineligible' end,
     coalesce(v_eval->'reasons','[]'::jsonb),now())
  on conflict (submission_id,playlist_id) do update set
    score=null,
    reasons=excluded.reasons,
    rank=excluded.rank,
    matcher_version=excluded.matcher_version,
    fit_band=excluded.fit_band,
    fit_evidence=excluded.fit_evidence,
    eligibility_status=excluded.eligibility_status,
    eligibility_reasons=excluded.eligibility_reasons,
    evaluated_at=excluded.evaluated_at
  returning id into v_match;

  if not (v_eval->>'eligible')::boolean then
    return jsonb_build_object('ok',false,'error','route_ineligible','reasons',v_eval->'reasons','match_id',v_match);
  end if;

  insert into public.bvss_submission_routes
    (submission_id,playlist_id,curator_id,route_type,status,match_score,match_reasons,
     network_organization_id,response_due_at,eligibility_evidence,eligibility_version)
  values
    (p_submission_id,p_playlist_id,p.curator_id,p_route_type,'queued',null,
     coalesce(p_fit_evidence->'reasons','[]'::jsonb),p.network_organization_id,
     nullif(v_eval->>'response_due_at','')::timestamptz,v_eval,'eligibility-v1')
  returning * into v_route;

  perform public.bvss_refresh_submission_status(p_submission_id);

  return jsonb_build_object('ok',true,'idempotent',false,'route_id',v_route.id,
                            'status',v_route.status,'response_due_at',v_route.response_due_at,
                            'match_id',v_match);
end
$$;

create or replace function public.bvss_expire_due_routes()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    update public.bvss_submission_routes
    set status='expired',expired_at=now(),decision_notes=coalesce(decision_notes,'Review window expired without a curator decision.')
    where status in ('queued','opened')
      and response_due_at is not null
      and response_due_at <= now()
    returning id,submission_id,playlist_id
  loop
    v_count:=v_count+1;
    insert into public.bvss_submission_status_events
      (submission_id,event_type,public_label,public_detail)
    values
      (r.submission_id,'route_expired','Review window ended','This playlist did not make a decision within its stated review window.');
    perform public.bvss_refresh_submission_status(r.submission_id);
  end loop;
  return jsonb_build_object('ok',true,'expired',v_count);
end
$$;

revoke all on function public.curatoros_decide_playlist_claim(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.bvss_evaluate_route(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bvss_reserve_route(uuid,uuid,text,text,jsonb,integer) from public,anon,authenticated;
revoke all on function public.bvss_expire_due_routes() from public,anon,authenticated;
grant execute on function public.curatoros_decide_playlist_claim(uuid,uuid,text,text) to service_role;
grant execute on function public.bvss_evaluate_route(uuid,uuid) to service_role;
grant execute on function public.bvss_reserve_route(uuid,uuid,text,text,jsonb,integer) to service_role;
grant execute on function public.bvss_expire_due_routes() to service_role;