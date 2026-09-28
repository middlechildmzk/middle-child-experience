alter table public.bvss_submissions
  alter column spotify_url drop not null;

alter table public.bvss_submissions
  add column if not exists release_state text not null default 'released',
  add column if not exists source_url text,
  add column if not exists source_platform text,
  add column if not exists artwork_url text,
  add column if not exists catalog_metadata jsonb not null default '{}'::jsonb,
  add column if not exists identified_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='bvss_submissions_release_state_check'
  ) then
    alter table public.bvss_submissions
      add constraint bvss_submissions_release_state_check
      check (release_state in ('released','unreleased'));
  end if;
end $$;

update public.bvss_submissions
set source_url = coalesce(source_url, spotify_url),
    source_platform = coalesce(source_platform, case when spotify_url is not null then 'spotify' else null end)
where source_url is null or source_platform is null;

create index if not exists bvss_submissions_release_state_idx
  on public.bvss_submissions(release_state, submitted_at desc);
create index if not exists bvss_submissions_spotify_track_idx
  on public.bvss_submissions(spotify_track_id) where spotify_track_id is not null;
