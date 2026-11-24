create function public.cancel_catchup_plan(target_plan uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  perform 1 from public.matches match
  join public.catchup_plans plan on plan.match_id = match.id
  where plan.id = target_plan and caller in (match.first_user, match.second_user)
  for update of match;
  if not found then raise exception 'This plan is unavailable.'; end if;

  update public.catchup_plans set status = 'cancelled', decided_at = now()
  where id = target_plan and status = 'confirmed' and starts_at > now();
  if not found and not exists (
    select 1 from public.catchup_plans where id = target_plan and status = 'cancelled'
  ) then
    raise exception 'This plan can no longer be cancelled.';
  end if;
end;
$$;

revoke all on function public.cancel_catchup_plan(uuid) from public, anon, authenticated;
grant execute on function public.cancel_catchup_plan(uuid) to authenticated;
