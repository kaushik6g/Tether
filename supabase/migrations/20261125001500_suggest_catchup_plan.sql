create function public.suggest_catchup_plan(
  target_match uuid, expected_pending uuid, starts timestamptz, minutes integer, place text, note text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  pending_id uuid;
  plan_id uuid;
begin
  perform 1 from public.matches
  where id = target_match and caller in (first_user, second_user) and closed_at is null
  for update;
  if not found then raise exception 'This conversation is unavailable.'; end if;

  if starts is null or not isfinite(starts) or starts <= now() then
    raise exception 'Choose a time in the future.';
  end if;

  select plan.id into pending_id from public.catchup_plans plan
  where plan.match_id = target_match and plan.status = 'pending';
  if pending_id is distinct from expected_pending then
    raise exception 'The invitation to meet has changed. Go back to the chat and try again.';
  end if;

  update public.catchup_plans set status = 'replaced', decided_at = now() where id = pending_id;
  insert into public.catchup_plans (match_id, proposer_id, starts_at, duration_minutes, place, note)
  values (target_match, caller, starts, minutes, btrim(coalesce(place, '')), btrim(coalesce(note, '')))
  returning id into plan_id;
  return plan_id;
end;
$$;

revoke all on function public.suggest_catchup_plan(uuid, uuid, timestamptz, integer, text, text) from public, anon, authenticated;
grant execute on function public.suggest_catchup_plan(uuid, uuid, timestamptz, integer, text, text) to authenticated;
