alter table public.matches add column closed_reason text
  check (closed_reason is null or (closed_at is not null and closed_reason = 'connection_ended'));

create function tether_private.lock_circle_pair(member_a uuid, member_b uuid)
returns void
language sql set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended(
    least(member_a, member_b)::text || ':' || greatest(member_a, member_b)::text, 0
  ));
$$;

create function tether_private.disconnect_circle_pair(member_a uuid, member_b uuid)
returns void
language plpgsql set search_path = ''
as $$
begin
  delete from tether_private.circle_members
  where (owner_id, friend_id) in ((member_a, member_b), (member_b, member_a));

  with ended as (
    update public.matches
    set closed_at = now(), closed_reason = 'connection_ended'
    where first_user = least(member_a, member_b) and second_user = greatest(member_a, member_b)
      and closed_at is null
    returning id
  )
  delete from tether_private.match_push_jobs job
  using ended
  where job.match_id = ended.id and job.finished_at is null;
end;
$$;

create function public.remove_circle_friend(friend uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or friend is null or caller = friend then return; end if;
  perform tether_private.lock_circle_pair(caller, friend);
  perform tether_private.disconnect_circle_pair(caller, friend);
end;
$$;

revoke all on function tether_private.lock_circle_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function tether_private.disconnect_circle_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_circle_friend(uuid) from public, anon, authenticated;
grant execute on function public.remove_circle_friend(uuid) to authenticated;
