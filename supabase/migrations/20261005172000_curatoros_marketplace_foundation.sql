-- CuratorOS founding marketplace foundation.
-- Additive only: links the proven BVSS/CuratorOS workflow to canonical identity,
-- organization/network and playlist-property records, and adds beta routing controls.

alter table public.bvss_curator_profiles
  add column if not exists professional_profile_id uuid references public.professional_profiles(id) on delete set null,
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create unique index if not exists bvss_curator_profiles_professional_profile_uidx
  on public.bvss_curator_profiles(professional_profile_id)
  where professional_profile_id is not null;

alter table public.bvss_playlists
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists network_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists accepts_unreleased boolean not null default true,
  add column if not exists accepts_explicit boolean not null default true,
  add column if not exists hard_no_tags text[] not null default '{}',
  add column if not exists review_sla_hours integer,
  add column if not exists max_open_routes integer not null default 100,
  add column if not exists route_cooldown_days integer not null default 30;

alter table public.bvss_submission_routes
  add column if not exists network_organization_id uuid references public.organizations(id) on delete set null;

alter table public.bvss_playlists
  drop constraint if exists bvss_playlists_review_sla_hours_check,
  add constraint bvss_playlists_review_sla_hours_check
    check (review_sla_hours is null or review_sla_hours between 1 and 720),
  drop constraint if exists bvss_playlists_max_open_routes_check,
  add constraint bvss_playlists_max_open_routes_check
    check (max_open_routes between 1 and 10000),
  drop constraint if exists bvss_playlists_route_cooldown_days_check,
  add constraint bvss_playlists_route_cooldown_days_check
    check (route_cooldown_days between 0 and 365);

create index if not exists bvss_playlists_network_org_idx
  on public.bvss_playlists(network_organization_id);
create index if not exists bvss_playlists_property_idx
  on public.bvss_playlists(property_id);
create index if not exists bvss_routes_network_org_idx
  on public.bvss_submission_routes(network_organization_id);

do $$
declare
  v_org uuid;
begin
  select id into v_org
  from public.organizations
  where lower(canonical_name) = 'bvss fvm'
  order by created_at
  limit 1;

  if v_org is null then
    insert into public.organizations
      (canonical_name, display_name, org_type, website, activity_status, trust_tier,
       risk_tier, verification_status, verification_date, evidence_strength,
       primary_source_url, relationship_stage, org_category)
    values
      ('BVSS FVM', 'BVSS FVM', 'curator_network', 'https://bvssfvm.com',
       'active', 'verified', 'low', 'verified', current_date, 3,
       'https://bvssfvm.com', 'qualified', 'label')
    returning id into v_org;
  else
    update public.organizations
    set display_name = coalesce(display_name, 'BVSS FVM'),
        org_type = 'curator_network',
        website = coalesce(website, 'https://bvssfvm.com'),
        activity_status = 'active',
        verification_status = 'verified',
        verification_date = coalesce(verification_date, current_date),
        evidence_strength = greatest(coalesce(evidence_strength, 1), 3),
        updated_at = now()
    where id = v_org;
  end if;

  update public.bvss_playlists
  set network_organization_id = v_org
  where network_owner_type = 'bvss'
    and network_organization_id is null;

  insert into public.properties
    (organization_id, name, property_type, platform, url, genre_tags,
     followers_estimate, followers_asof, activity_status, verification_status,
     evidence_strength, source, spotify_playlist_id, platform_url,
     canonical_property_key, relationship_stage)
  select
    v_org,
    p.canonical_name,
    'spotify_playlist',
    'spotify',
    p.spotify_url,
    array_remove(array[p.primary_genre] || coalesce(p.secondary_genres, '{}'), null),
    case when p.current_follower_count is null then null else p.current_follower_count::text end,
    case when p.follower_count_observed_at is null then null else p.follower_count_observed_at::date end,
    case when p.lifecycle_state = 'active' then 'active' else 'unknown' end,
    p.verification_status,
    case when p.verification_status = 'verified' then 3 else 1 end,
    'curatoros_bvss_backfill',
    p.spotify_playlist_id,
    p.spotify_url,
    'spotify:playlist:' || p.spotify_playlist_id,
    'identified'
  from public.bvss_playlists p
  where p.network_owner_type = 'bvss'
    and not exists (
      select 1 from public.properties pr
      where pr.spotify_playlist_id = p.spotify_playlist_id
         or pr.canonical_property_key = 'spotify:playlist:' || p.spotify_playlist_id
    );

  update public.bvss_playlists p
  set property_id = pr.id
  from public.properties pr
  where p.property_id is null
    and p.spotify_playlist_id is not null
    and (pr.spotify_playlist_id = p.spotify_playlist_id
         or pr.canonical_property_key = 'spotify:playlist:' || p.spotify_playlist_id);

  update public.bvss_submission_routes r
  set network_organization_id = p.network_organization_id
  from public.bvss_playlists p
  where p.id = r.playlist_id
    and r.network_organization_id is distinct from p.network_organization_id;
end
$$;

create or replace function public.curatoros_route_network_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select network_organization_id into new.network_organization_id
  from public.bvss_playlists
  where id = new.playlist_id;
  return new;
end
$$;

drop trigger if exists curatoros_route_network_sync on public.bvss_submission_routes;
create trigger curatoros_route_network_sync
before insert or update of playlist_id on public.bvss_submission_routes
for each row execute function public.curatoros_route_network_sync();

create or replace function public.curatoros_provision_curator_identity(
  p_user_id uuid,
  p_display_name text,
  p_handle text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace uuid;
  v_profile uuid;
  v_existing public.professional_profiles%rowtype;
  v_slug text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user_required');
  end if;
  if coalesce(btrim(p_display_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'display_name_required');
  end if;

  select * into v_existing
  from public.professional_profiles
  where user_id = p_user_id
  limit 1;

  if found then
    update public.bvss_curator_profiles
    set professional_profile_id = v_existing.id,
        workspace_id = v_existing.workspace_id
    where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'professional_profile_id', v_existing.id, 'workspace_id', v_existing.workspace_id, 'existing', true);
  end if;

  insert into public.workspaces(name)
  values ('CuratorOS · ' || left(btrim(p_display_name), 120))
  returning id into v_workspace;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_workspace, p_user_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  v_slug := lower(regexp_replace(coalesce(nullif(btrim(p_handle), ''), btrim(p_display_name)), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'curator-' || left(replace(p_user_id::text, '-', ''), 10); end if;
  if exists (select 1 from public.professional_profiles where public_slug = v_slug) then
    v_slug := v_slug || '-' || left(replace(p_user_id::text, '-', ''), 6);
  end if;

  insert into public.professional_profiles
    (user_id, workspace_id, public_slug, display_name, professional_types,
     review_mode, review_fee_cents, currency, capacity_status,
     verification_status, is_public)
  values
    (p_user_id, v_workspace, v_slug, left(btrim(p_display_name), 160),
     array['playlist_curator']::text[], 'editorial_only', 0, 'USD',
     'open', 'unverified', false)
  returning id into v_profile;

  update public.bvss_curator_profiles
  set professional_profile_id = v_profile,
      workspace_id = v_workspace
  where user_id = p_user_id;

  return jsonb_build_object('ok', true, 'professional_profile_id', v_profile, 'workspace_id', v_workspace, 'existing', false);
end
$$;

revoke all on function public.curatoros_provision_curator_identity(uuid,text,text) from public, anon, authenticated;
grant execute on function public.curatoros_provision_curator_identity(uuid,text,text) to service_role;

create or replace view public.curatoros_public_networks
with (security_invoker = true) as
select
  o.id,
  o.canonical_name,
  coalesce(o.display_name, o.canonical_name) as display_name,
  o.website,
  o.verification_status,
  o.activity_status,
  count(distinct p.id) filter (
    where p.public_status='public' and p.website_status='published' and p.lifecycle_state='active'
  ) as active_playlist_count,
  coalesce(sum(p.current_follower_count) filter (
    where p.public_status='public' and p.website_status='published' and p.lifecycle_state='active'
      and p.current_follower_count is not null
  ),0) as measured_followers
from public.organizations o
left join public.bvss_playlists p on p.network_organization_id=o.id
where o.org_type='curator_network'
group by o.id;

grant select on public.curatoros_public_networks to anon, authenticated;
