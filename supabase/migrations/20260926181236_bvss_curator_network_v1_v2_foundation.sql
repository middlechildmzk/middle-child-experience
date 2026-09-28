-- BVSS FVM Curator Network Beta / Submission Gate V1 + V2 foundation

create extension if not exists pgcrypto;

-- Extend submissions with artist delivery, permission, attribution and network consent.
alter table public.bvss_submissions
  add column if not exists artist_socials jsonb not null default '{}'::jsonb,
  add column if not exists private_stream_url text,
  add column if not exists download_source text not null default 'none',
  add column if not exists download_object_path text,
  add column if not exists download_external_url text,
  add column if not exists download_permission boolean not null default false,
  add column if not exists network_opt_in boolean not null default false,
  add column if not exists network_consent_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists submitter_ip_hash text,
  add column if not exists artist_status_token uuid not null default gen_random_uuid();

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='bvss_submissions_download_source_check'
  ) then
    alter table public.bvss_submissions
      add constraint bvss_submissions_download_source_check
      check (download_source in ('none','upload','external'));
  end if;
end $$;

create unique index if not exists bvss_submissions_status_token_uidx
  on public.bvss_submissions(artist_status_token);

-- Curator identity and application state.
create table if not exists public.bvss_curator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  contact_email text not null,
  bio text,
  website_url text,
  spotify_profile_url text,
  social_links jsonb not null default '{}'::jsonb,
  genres text[] not null default '{}',
  moods text[] not null default '{}',
  status text not null default 'pending',
  plan text not null default 'beta',
  public_profile boolean not null default false,
  application_notes text,
  terms_version text,
  terms_accepted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='bvss_curator_profiles_status_check') then
    alter table public.bvss_curator_profiles add constraint bvss_curator_profiles_status_check
      check (status in ('pending','approved','rejected','suspended'));
  end if;
  if not exists (select 1 from pg_constraint where conname='bvss_curator_profiles_plan_check') then
    alter table public.bvss_curator_profiles add constraint bvss_curator_profiles_plan_check
      check (plan in ('beta','free','pro'));
  end if;
end $$;

create index if not exists bvss_curator_profiles_status_idx on public.bvss_curator_profiles(status);
create index if not exists bvss_curator_profiles_public_idx on public.bvss_curator_profiles(public_profile,status);

-- Allow the canonical playlist registry to hold partner playlists safely.
alter table public.bvss_playlists
  add column if not exists network_owner_type text not null default 'bvss',
  add column if not exists curator_id uuid references public.bvss_curator_profiles(id) on delete set null,
  add column if not exists verification_status text not null default 'verified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists network_routing_enabled boolean not null default true;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='bvss_playlists_network_owner_type_check') then
    alter table public.bvss_playlists add constraint bvss_playlists_network_owner_type_check
      check (network_owner_type in ('bvss','partner'));
  end if;
  if not exists (select 1 from pg_constraint where conname='bvss_playlists_verification_status_check') then
    alter table public.bvss_playlists add constraint bvss_playlists_verification_status_check
      check (verification_status in ('unverified','pending','verified','rejected'));
  end if;
end $$;

update public.bvss_playlists
set network_owner_type='bvss',
    verification_status='verified',
    verified_at=coalesce(verified_at, created_at),
    network_routing_enabled=true
where curator_id is null;

create index if not exists bvss_playlists_curator_idx on public.bvss_playlists(curator_id);
create index if not exists bvss_playlists_network_routing_idx
  on public.bvss_playlists(network_owner_type, verification_status, network_routing_enabled, submission_status);

-- Explicit ownership/verification workflow.
create table if not exists public.bvss_curator_playlist_claims (
  id uuid primary key default gen_random_uuid(),
  curator_id uuid not null references public.bvss_curator_profiles(id) on delete cascade,
  playlist_id uuid not null references public.bvss_playlists(id) on delete cascade,
  verification_code text not null,
  verification_method text not null default 'description_code',
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  notes text,
  unique(curator_id, playlist_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='bvss_curator_playlist_claims_status_check') then
    alter table public.bvss_curator_playlist_claims add constraint bvss_curator_playlist_claims_status_check
      check (status in ('pending','verified','rejected','revoked'));
  end if;
end $$;

create index if not exists bvss_curator_playlist_claims_status_idx
  on public.bvss_curator_playlist_claims(status, submitted_at desc);

-- Network delivery is separate from matching. A match is a suggestion; a route is an actual curator inbox item.
create table if not exists public.bvss_submission_routes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.bvss_submissions(id) on delete cascade,
  playlist_id uuid not null references public.bvss_playlists(id) on delete cascade,
  curator_id uuid references public.bvss_curator_profiles(id) on delete cascade,
  route_type text not null default 'matched',
  status text not null default 'queued',
  match_score integer check (match_score is null or match_score between 0 and 100),
  match_reasons jsonb not null default '[]'::jsonb,
  routed_at timestamptz not null default now(),
  first_opened_at timestamptz,
  decided_at timestamptz,
  decision text,
  decision_notes text,
  placement_id uuid references public.bvss_playlist_placements(id) on delete set null,
  unique(submission_id, playlist_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='bvss_submission_routes_route_type_check') then
    alter table public.bvss_submission_routes add constraint bvss_submission_routes_route_type_check
      check (route_type in ('preferred','matched','manual','bvss_internal'));
  end if;
  if not exists (select 1 from pg_constraint where conname='bvss_submission_routes_status_check') then
    alter table public.bvss_submission_routes add constraint bvss_submission_routes_status_check
      check (status in ('queued','opened','hold','accepted','rejected','withdrawn'));
  end if;
  if not exists (select 1 from pg_constraint where conname='bvss_submission_routes_decision_check') then
    alter table public.bvss_submission_routes add constraint bvss_submission_routes_decision_check
      check (decision is null or decision in ('hold','accept','reject'));
  end if;
end $$;

create index if not exists bvss_submission_routes_curator_idx
  on public.bvss_submission_routes(curator_id,status,routed_at desc);
create index if not exists bvss_submission_routes_submission_idx
  on public.bvss_submission_routes(submission_id,routed_at desc);

-- Download access is auditable and always uses short-lived signed URLs.
create table if not exists public.bvss_submission_download_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.bvss_submissions(id) on delete cascade,
  curator_id uuid references public.bvss_curator_profiles(id) on delete set null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  access_type text not null default 'signed_url',
  accessed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists bvss_submission_download_events_submission_idx
  on public.bvss_submission_download_events(submission_id,accessed_at desc);

-- Artist-facing status log; public access is token-gated through an edge function, not direct RLS.
create table if not exists public.bvss_submission_status_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.bvss_submissions(id) on delete cascade,
  event_type text not null,
  public_label text not null,
  public_detail text,
  created_at timestamptz not null default now()
);
create index if not exists bvss_submission_status_events_submission_idx
  on public.bvss_submission_status_events(submission_id,created_at desc);

-- Moderation/reporting for V2.
create table if not exists public.bvss_network_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  curator_id uuid references public.bvss_curator_profiles(id) on delete cascade,
  playlist_id uuid references public.bvss_playlists(id) on delete cascade,
  submission_id uuid references public.bvss_submissions(id) on delete cascade,
  category text not null,
  detail text not null,
  status text not null default 'open',
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='bvss_network_reports_status_check') then
    alter table public.bvss_network_reports add constraint bvss_network_reports_status_check
      check (status in ('open','reviewing','resolved','dismissed'));
  end if;
end $$;

-- Transparent curator facts. No opaque quality score.
create or replace view public.bvss_curator_public_facts
with (security_invoker=true)
as
select
  c.id as curator_id,
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
  count(distinct p.id) filter (
    where p.verification_status='verified'
      and p.public_status='public'
      and p.website_status='published'
      and p.lifecycle_state='active'
  ) as verified_playlist_count,
  count(r.id) filter (where r.decided_at is not null) as reviews_completed,
  count(r.id) filter (where r.decision='accept') as accepted_count,
  count(r.id) filter (where r.decision='reject') as rejected_count,
  count(r.id) filter (where r.decision='hold') as held_count,
  percentile_cont(0.5) within group (
    order by extract(epoch from (r.decided_at-r.routed_at))/3600.0
  ) filter (where r.decided_at is not null) as median_response_hours,
  count(pl.id) filter (where pl.removed_at is null) as active_placements
from public.bvss_curator_profiles c
left join public.bvss_playlists p on p.curator_id=c.id
left join public.bvss_submission_routes r on r.curator_id=c.id
left join public.bvss_playlist_placements pl on pl.id=r.placement_id
group by c.id;

-- Network-level public playlist cards for approved curators.
create or replace view public.bvss_public_curator_playlists
with (security_invoker=true)
as
select
  p.id,
  p.slug,
  p.spotify_playlist_id,
  p.spotify_url,
  p.canonical_name,
  p.subtitle,
  p.description,
  p.cover_asset_url,
  p.primary_genre,
  p.secondary_genres,
  p.moods,
  p.activities,
  p.anchor_artists,
  p.submission_status,
  p.update_cadence,
  p.curator_id,
  c.handle as curator_handle,
  c.display_name as curator_name
from public.bvss_playlists p
join public.bvss_curator_profiles c on c.id=p.curator_id
where p.network_owner_type='partner'
  and p.verification_status='verified'
  and p.public_status='public'
  and p.website_status='published'
  and p.lifecycle_state='active'
  and c.status='approved'
  and c.public_profile=true;

-- Storage: private artist masters. 100 MB max, common audio types only.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'bvss-submission-audio',
  'bvss-submission-audio',
  false,
  104857600,
  array['audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/x-flac','audio/mp4','audio/aac']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Updated-at trigger reuse.
drop trigger if exists bvss_curator_profiles_touch on public.bvss_curator_profiles;
create trigger bvss_curator_profiles_touch
before update on public.bvss_curator_profiles
for each row execute function public.bvss_touch_updated_at();

-- RLS
alter table public.bvss_curator_profiles enable row level security;
alter table public.bvss_curator_playlist_claims enable row level security;
alter table public.bvss_submission_routes enable row level security;
alter table public.bvss_submission_download_events enable row level security;
alter table public.bvss_submission_status_events enable row level security;
alter table public.bvss_network_reports enable row level security;

-- Curators may see/update only their own profile.
drop policy if exists bvss_curator_profile_self_select on public.bvss_curator_profiles;
create policy bvss_curator_profile_self_select on public.bvss_curator_profiles
for select to authenticated
using (user_id=auth.uid() or (status='approved' and public_profile=true));

drop policy if exists bvss_curator_profile_self_update on public.bvss_curator_profiles;
create policy bvss_curator_profile_self_update on public.bvss_curator_profiles
for update to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid());

-- Claims/routes are self-visible for approved/pending curator accounts.
drop policy if exists bvss_claims_curator_select on public.bvss_curator_playlist_claims;
create policy bvss_claims_curator_select on public.bvss_curator_playlist_claims
for select to authenticated
using (exists (
  select 1 from public.bvss_curator_profiles c
  where c.id=curator_id and c.user_id=auth.uid()
));

drop policy if exists bvss_routes_curator_select on public.bvss_submission_routes;
create policy bvss_routes_curator_select on public.bvss_submission_routes
for select to authenticated
using (
  exists (
    select 1 from public.bvss_curator_profiles c
    where c.id=curator_id and c.user_id=auth.uid() and c.status='approved'
  )
  or public.bvss_is_admin()
);

-- Admins retain authority over all new network records.
create policy bvss_admin_curators_all on public.bvss_curator_profiles for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());
create policy bvss_admin_claims_all on public.bvss_curator_playlist_claims for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());
create policy bvss_admin_routes_all on public.bvss_submission_routes for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());
create policy bvss_admin_download_events_all on public.bvss_submission_download_events for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());
create policy bvss_admin_status_events_all on public.bvss_submission_status_events for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());
create policy bvss_admin_reports_all on public.bvss_network_reports for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());

-- Index supporting queue and public profile lookups.
create index if not exists bvss_playlists_public_network_idx
  on public.bvss_playlists(lifecycle_state,website_status,public_status,network_owner_type,verification_status);
