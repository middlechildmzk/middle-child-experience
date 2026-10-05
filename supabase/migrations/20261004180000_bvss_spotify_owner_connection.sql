-- P0: Spotify owner connection for verified live placements.
--
-- The Spotify account that owns the BVSS playlists is the canonical source for
-- "this track is live on this playlist" (decision 2026-10-04). It is connected
-- once with read-only scope (playlist-read-private) and used only to read the
-- contents of playlists that account owns.
--
-- Storage:
--   * the refresh token lives in Supabase Vault (secret
--     'bvss_spotify_owner_refresh_token'), never in a table column;
--   * connection facts (Spotify account id, granted scopes, who connected it,
--     when, and which BVSS playlists it was proven to own) live on the existing
--     bvss_integrations 'spotify' row, in configuration.owner_connection.
-- No new table. All functions are service-role only.
--
-- A scheduled observation reads the owned playlists every 6 hours (plus
-- on-demand from Playlist OS) through bvss-spotify-owner, which calls
-- bvss_record_playlist_observation (20261004170000). Only track ids,
-- positions, added times and an evidence hash are stored.
--
-- Rollback: supabase/rollback/20261004180000_bvss_spotify_owner_connection.down.sql

insert into public.bvss_integrations (provider, status, capabilities, notes)
values ('spotify', 'ready', '{}', null)
on conflict (provider) do nothing;

create or replace function public.bvss_spotify_owner_store(
  p_refresh_token text,
  p_account_id text,
  p_scopes text[],
  p_connected_by uuid,
  p_owned_playlists text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_id uuid;
begin
  if coalesce(btrim(p_refresh_token), '') = '' or coalesce(btrim(p_account_id), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'token_and_account_required');
  end if;
  if not ('playlist-read-private' = any (coalesce(p_scopes, '{}'))) then
    return jsonb_build_object('ok', false, 'error', 'missing_playlist_read_scope');
  end if;
  if exists (select 1 from unnest(coalesce(p_scopes, '{}')) s where s like '%modify%' or s like 'user-%') then
    return jsonb_build_object('ok', false, 'error', 'scope_broader_than_read_only');
  end if;
  if cardinality(coalesce(p_owned_playlists, '{}')) < 1 then
    return jsonb_build_object('ok', false, 'error', 'account_owns_no_bvss_playlist');
  end if;

  select id into v_id from vault.secrets where name = 'bvss_spotify_owner_refresh_token';
  if v_id is null then
    perform vault.create_secret(p_refresh_token, 'bvss_spotify_owner_refresh_token',
      'Spotify refresh token (playlist-read-private) for the account that owns the BVSS playlists');
  else
    perform vault.update_secret(v_id, p_refresh_token);
  end if;

  update public.bvss_integrations set
    status = 'connected',
    capabilities = (select array(select distinct c from unnest(capabilities || array['owned playlist contents (verification only)']) c)),
    configuration = configuration || jsonb_build_object('owner_connection', jsonb_build_object(
      'account_id', p_account_id,
      'scopes', to_jsonb(p_scopes),
      'connected_by', p_connected_by,
      'connected_at', now(),
      'owned_playlists_checked', to_jsonb(p_owned_playlists),
      'vault_secret', 'bvss_spotify_owner_refresh_token')),
    notes = 'Owner connection is read-only and used only to verify placements.',
    updated_at = now()
  where provider = 'spotify';
  return jsonb_build_object('ok', true, 'account_id', p_account_id);
end
$$;

-- Spotify may rotate the refresh token on use; keep the newest.
create or replace function public.bvss_spotify_owner_rotate(p_refresh_token text)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'bvss_spotify_owner_refresh_token';
  if v_id is not null and coalesce(btrim(p_refresh_token), '') <> '' then
    perform vault.update_secret(v_id, p_refresh_token);
  end if;
end
$$;

create or replace function public.bvss_spotify_owner_token()
returns jsonb
language sql
stable
security definer
set search_path = public, vault, pg_temp
as $$
  select jsonb_build_object(
    'refresh_token', (select decrypted_secret from vault.decrypted_secrets where name = 'bvss_spotify_owner_refresh_token'),
    'account_id', (select configuration -> 'owner_connection' ->> 'account_id' from public.bvss_integrations where provider = 'spotify'));
$$;

create or replace function public.bvss_spotify_owner_record_result(p_ok boolean, p_error text default null)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.bvss_integrations set
    status = case when p_ok then 'connected' else 'degraded' end,
    last_sync_at = case when p_ok then now() else last_sync_at end,
    configuration = jsonb_set(configuration, '{owner_connection,last_result}',
      jsonb_build_object('ok', p_ok, 'error', left(p_error, 300), 'at', now()), true),
    updated_at = now()
  where provider = 'spotify' and configuration ? 'owner_connection';
$$;

revoke all on function public.bvss_spotify_owner_store(text, text, text[], uuid, text[]) from public, anon, authenticated;
revoke all on function public.bvss_spotify_owner_rotate(text) from public, anon, authenticated;
revoke all on function public.bvss_spotify_owner_token() from public, anon, authenticated;
revoke all on function public.bvss_spotify_owner_record_result(boolean, text) from public, anon, authenticated;
grant execute on function public.bvss_spotify_owner_store(text, text, text[], uuid, text[]) to service_role;
grant execute on function public.bvss_spotify_owner_rotate(text) to service_role;
grant execute on function public.bvss_spotify_owner_token() to service_role;
grant execute on function public.bvss_spotify_owner_record_result(boolean, text) to service_role;

-- Scheduled verification read every 6 hours (only does work once connected).
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'bvss-spotify-owner-observe';
    perform cron.schedule('bvss-spotify-owner-observe', '25 */6 * * *', $job$
      select net.http_post(
        url := 'https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-spotify-owner',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-bvss-sync-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bvss_soundcharts_sync_token')),
        body := jsonb_build_object('action', 'observe', 'triggered_by', 'cron')
      );
    $job$);
  end if;
end
$cron$;
