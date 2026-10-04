-- Rollback for 20261004180000_bvss_spotify_owner_connection.
-- Stops scheduled reads, removes the stored refresh token and the functions.
-- The Spotify app authorization itself is revoked by the account owner at
-- https://www.spotify.com/account/apps/ .

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'bvss-spotify-owner-observe';
  end if;
end
$$;

delete from vault.secrets where name = 'bvss_spotify_owner_refresh_token';

update public.bvss_integrations
set configuration = configuration - 'owner_connection', status = 'ready',
    capabilities = array_remove(capabilities, 'owned playlist contents (verification only)'), updated_at = now()
where provider = 'spotify';

drop function if exists public.bvss_spotify_owner_record_result(boolean, text);
drop function if exists public.bvss_spotify_owner_token();
drop function if exists public.bvss_spotify_owner_rotate(text);
drop function if exists public.bvss_spotify_owner_store(text, text, text[], uuid, text[]);
