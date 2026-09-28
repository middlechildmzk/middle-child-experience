create table if not exists public.bvss_curator_entitlements (
  curator_id uuid primary key references public.bvss_curator_profiles(id) on delete cascade,
  plan text not null default 'beta',
  max_registered_playlists integer not null default 5 check (max_registered_playlists between 1 and 100),
  max_monthly_routes integer not null default 500 check (max_monthly_routes between 0 and 100000),
  can_download_permitted_audio boolean not null default true,
  analytics_level text not null default 'basic',
  features jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='bvss_curator_entitlements_plan_check') then
    alter table public.bvss_curator_entitlements add constraint bvss_curator_entitlements_plan_check
      check (plan in ('beta','free','pro'));
  end if;
  if not exists (select 1 from pg_constraint where conname='bvss_curator_entitlements_analytics_check') then
    alter table public.bvss_curator_entitlements add constraint bvss_curator_entitlements_analytics_check
      check (analytics_level in ('basic','advanced'));
  end if;
end $$;

alter table public.bvss_curator_entitlements enable row level security;

create policy bvss_curator_entitlements_self_select on public.bvss_curator_entitlements
for select to authenticated
using (exists (
  select 1 from public.bvss_curator_profiles c
  where c.id=curator_id and c.user_id=auth.uid()
));

create policy bvss_admin_curator_entitlements_all on public.bvss_curator_entitlements
for all to authenticated
using (public.bvss_is_admin()) with check (public.bvss_is_admin());

drop trigger if exists bvss_curator_entitlements_touch on public.bvss_curator_entitlements;
create trigger bvss_curator_entitlements_touch
before update on public.bvss_curator_entitlements
for each row execute function public.bvss_touch_updated_at();

create or replace view public.bvss_curator_usage_monthly
with (security_invoker=true)
as
select
  c.id as curator_id,
  date_trunc('month',now())::date as month_start,
  count(distinct p.id) as registered_playlists,
  count(r.id) filter (where r.routed_at >= date_trunc('month',now())) as routes_this_month
from public.bvss_curator_profiles c
left join public.bvss_playlists p on p.curator_id=c.id
left join public.bvss_submission_routes r on r.curator_id=c.id
group by c.id;
