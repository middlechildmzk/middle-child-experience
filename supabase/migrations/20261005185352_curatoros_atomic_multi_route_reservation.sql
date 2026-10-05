-- Atomic reservation of a multi-playlist CuratorOS submission.
create or replace function public.bvss_reserve_routes(
  p_submission_id uuid,
  p_routes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec record;
  v_eval jsonb;
  v_result jsonb;
  v_failures jsonb := '[]'::jsonb;
  v_created jsonb := '[]'::jsonb;
  v_count integer;
  v_playlist_id uuid;
begin
  if jsonb_typeof(p_routes) <> 'array' then
    return jsonb_build_object('ok',false,'error','routes_must_be_array');
  end if;
  v_count := jsonb_array_length(p_routes);
  if v_count < 1 or v_count > 8 then
    return jsonb_build_object('ok',false,'error','route_count_invalid');
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_routes) x
    group by x->>'playlist_id'
    having count(*) > 1
  ) then
    return jsonb_build_object('ok',false,'error','duplicate_playlist_route');
  end if;

  for rec in
    select value from jsonb_array_elements(p_routes)
    order by value->>'playlist_id'
  loop
    begin
      v_playlist_id := (rec.value->>'playlist_id')::uuid;
    exception when others then
      return jsonb_build_object('ok',false,'error','invalid_playlist_id');
    end;
    perform 1 from public.bvss_playlists where id=v_playlist_id for update;
    if not found then
      v_failures := v_failures || jsonb_build_array(
        jsonb_build_object('playlist_id',v_playlist_id,'reasons',jsonb_build_array('playlist_not_found'))
      );
    end if;
  end loop;

  for rec in select value from jsonb_array_elements(p_routes)
  loop
    v_playlist_id := (rec.value->>'playlist_id')::uuid;
    v_eval := public.bvss_evaluate_route(p_submission_id,v_playlist_id);
    if not coalesce((v_eval->>'eligible')::boolean,false) then
      v_failures := v_failures || jsonb_build_array(
        jsonb_build_object('playlist_id',v_playlist_id,'reasons',coalesce(v_eval->'reasons','[]'::jsonb))
      );
    end if;
  end loop;

  if jsonb_array_length(v_failures) > 0 then
    return jsonb_build_object('ok',false,'error','route_ineligible','unavailable',v_failures);
  end if;

  for rec in
    select value from jsonb_array_elements(p_routes)
    order by coalesce((value->>'rank')::integer,1), value->>'playlist_id'
  loop
    v_result := public.bvss_reserve_route(
      p_submission_id,
      (rec.value->>'playlist_id')::uuid,
      coalesce(nullif(rec.value->>'route_type',''),'matched'),
      nullif(rec.value->>'fit_band',''),
      coalesce(rec.value->'fit_evidence','{}'::jsonb),
      coalesce((rec.value->>'rank')::integer,1)
    );
    if not coalesce((v_result->>'ok')::boolean,false) then
      raise exception 'atomic route reservation failed: %', v_result using errcode='P0001';
    end if;
    v_created := v_created || jsonb_build_array(v_result);
  end loop;

  return jsonb_build_object('ok',true,'routes',v_created,'count',jsonb_array_length(v_created));
end
$$;

revoke all on function public.bvss_reserve_routes(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.bvss_reserve_routes(uuid,jsonb) to service_role;
