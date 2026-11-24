create function public.accept_catchup_plan(target_plan uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target_match uuid;
begin
  select match.id into target_match
  from public.matches match
  join public.catchup_plans plan on plan.match_id = match.id
  where plan.id = target_plan and caller in (match.first_user, match.second_user)
    and caller <> plan.proposer_id
  for update of match;
  if not found then raise exception 'This plan is unavailable.'; end if;

  if exists (select 1 from public.catchup_plans where id = target_plan and status = 'confirmed') then
    return;
  end if;

  update public.catchup_plans set status = 'confirmed', decided_at = now()
  where id = target_plan and status = 'pending' and starts_at > now()
    and exists (select 1 from public.matches where id = target_match and closed_at is null);
  if not found then raise exception 'This proposal is no longer available.'; end if;

  update public.matches set closed_at = now() where id = target_match;
end;
$$;

revoke all on function public.accept_catchup_plan(uuid) from public, anon, authenticated;
grant execute on function public.accept_catchup_plan(uuid) to authenticated;
