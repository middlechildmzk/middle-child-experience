-- Keep a submission in review while any routed playlist still needs a decision.
-- Body is byte-identical to the statement recorded in the production ledger.
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
    when bool_and(status in ('rejected','withdrawn')) and bool_or(status = 'rejected') then 'rejected'
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
