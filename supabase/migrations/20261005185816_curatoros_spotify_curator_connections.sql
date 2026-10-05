-- CuratorOS read-only Spotify ownership connection for external curators.
create table if not exists public.curatoros_spotify_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  curator_id uuid not null unique references public.bvss_curator_profiles(id) on delete cascade,
  spotify_account_id text not null,
  refresh_secret_id uuid not null,
  scopes text[] not null default '{}',
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  token_updated_at timestamptz not null default now(),
  last_verified_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint curatoros_spotify_connection_status_check check (status in ('connected','error','revoked'))
);

alter table public.curatoros_spotify_connections enable row level security;
revoke all on public.curatoros_spotify_connections from anon, authenticated;

create or replace function public.curatoros_spotify_store(
  p_user_id uuid,
  p_curator_id uuid,
  p_refresh_token text,
  p_account_id text,
  p_scopes text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_profile public.bvss_curator_profiles%rowtype;
  v_existing public.curatoros_spotify_connections%rowtype;
  v_secret uuid;
begin
  if p_user_id is null or p_curator_id is null or nullif(btrim(p_refresh_token),'') is null
     or nullif(btrim(p_account_id),'') is null then
    return jsonb_build_object('ok',false,'error','spotify_connection_fields_required');
  end if;
  if not ('playlist-read-private'=any(coalesce(p_scopes,'{}'))) then
    return jsonb_build_object('ok',false,'error','missing_playlist_read_scope');
  end if;
  if exists (select 1 from unnest(coalesce(p_scopes,'{}')) s where s ilike '%modify%' or s like 'user-%') then
    return jsonb_build_object('ok',false,'error','scope_broader_than_read_only');
  end if;

  select * into v_profile from public.bvss_curator_profiles where id=p_curator_id for update;
  if not found or v_profile.user_id<>p_user_id then
    return jsonb_build_object('ok',false,'error','curator_identity_mismatch');
  end if;

  select * into v_existing from public.curatoros_spotify_connections where user_id=p_user_id for update;
  if found then
    perform vault.update_secret(v_existing.refresh_secret_id,p_refresh_token,null,null,null);
    v_secret:=v_existing.refresh_secret_id;
  else
    select vault.create_secret(
      p_refresh_token,
      'curatoros_spotify_refresh_'||replace(p_user_id::text,'-',''),
      'CuratorOS read-only Spotify refresh token'
    ) into v_secret;
  end if;

  insert into public.curatoros_spotify_connections
    (user_id,curator_id,spotify_account_id,refresh_secret_id,scopes,status,connected_at,token_updated_at,last_error,updated_at)
  values
    (p_user_id,p_curator_id,p_account_id,v_secret,p_scopes,'connected',now(),now(),null,now())
  on conflict (user_id) do update set
    curator_id=excluded.curator_id,
    spotify_account_id=excluded.spotify_account_id,
    refresh_secret_id=excluded.refresh_secret_id,
    scopes=excluded.scopes,
    status='connected',
    token_updated_at=now(),
    last_error=null,
    updated_at=now();

  return jsonb_build_object('ok',true,'spotify_account_id',p_account_id,'scopes',p_scopes,'status','connected');
end
$$;

create or replace function public.curatoros_spotify_token(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  c public.curatoros_spotify_connections%rowtype;
  v_token text;
begin
  select * into c from public.curatoros_spotify_connections where user_id=p_user_id and status='connected';
  if not found then return jsonb_build_object('ok',false,'error','spotify_not_connected'); end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where id=c.refresh_secret_id;
  if v_token is null then return jsonb_build_object('ok',false,'error','spotify_token_missing'); end if;
  return jsonb_build_object('ok',true,'refresh_token',v_token,'spotify_account_id',c.spotify_account_id,
                            'curator_id',c.curator_id,'scopes',to_jsonb(c.scopes));
end
$$;

create or replace function public.curatoros_spotify_record_verification(
  p_user_id uuid,
  p_ok boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.curatoros_spotify_connections
  set status=case when p_ok then 'connected' else 'error' end,
      last_verified_at=case when p_ok then now() else last_verified_at end,
      last_error=case when p_ok then null else left(coalesce(p_error,'verification_failed'),300) end,
      updated_at=now()
  where user_id=p_user_id;
end
$$;

create or replace function public.curatoros_spotify_disconnect(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_secret uuid;
begin
  select refresh_secret_id into v_secret from public.curatoros_spotify_connections where user_id=p_user_id for update;
  if v_secret is null then return jsonb_build_object('ok',true,'disconnected',false); end if;
  delete from public.curatoros_spotify_connections where user_id=p_user_id;
  delete from vault.secrets where id=v_secret;
  return jsonb_build_object('ok',true,'disconnected',true);
end
$$;

revoke all on function public.curatoros_spotify_store(uuid,uuid,text,text,text[]) from public,anon,authenticated;
revoke all on function public.curatoros_spotify_token(uuid) from public,anon,authenticated;
revoke all on function public.curatoros_spotify_record_verification(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.curatoros_spotify_disconnect(uuid) from public,anon,authenticated;
grant execute on function public.curatoros_spotify_store(uuid,uuid,text,text,text[]) to service_role;
grant execute on function public.curatoros_spotify_token(uuid) to service_role;
grant execute on function public.curatoros_spotify_record_verification(uuid,boolean,text) to service_role;
grant execute on function public.curatoros_spotify_disconnect(uuid) to service_role;