create function public.resolve_catchup_proposal(target_plan uuid, decision text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if decision is null or decision not in ('declined', 'withdrawn') then
    raise exception 'This action is unavailable.';
  end if;

  perform 1 from public.matches match
  join public.catchup_plans plan on plan.match_id = match.id
  where plan.id = target_plan and caller in (match.first_user, match.second_user)
    and (caller = plan.proposer_id) = (decision = 'withdrawn')
  for update of match;
  if not found then raise exception 'This proposal is unavailable.'; end if;

  update public.catchup_plans set status = decision, decided_at = now()
  where id = target_plan and status = 'pending';
  if not found and not exists (
    select 1 from public.catchup_plans where id = target_plan and status = decision
  ) then
    raise exception 'This proposal is no longer available.';
  end if;
end;
$$;

revoke all on function public.resolve_catchup_proposal(uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_catchup_proposal(uuid, text) to authenticated;
