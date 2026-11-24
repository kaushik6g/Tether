create function tether_private.close_pending_catchup_plan()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.catchup_plans set status = 'closed', decided_at = now()
  where match_id = new.id and status = 'pending';
  return new;
end;
$$;

revoke all on function tether_private.close_pending_catchup_plan() from public, anon, authenticated;

create trigger close_pending_catchup_plan_after_match_ends
after update of closed_at on public.matches
for each row when (old.closed_at is null and new.closed_at is not null)
execute function tether_private.close_pending_catchup_plan();

alter publication supabase_realtime add table public.catchup_plans;
