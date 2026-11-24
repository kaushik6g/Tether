create table tether_private.circle_blocks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  primary key (owner_id, blocked_id),
  check (owner_id <> blocked_id)
);

create function public.block_circle_friend(friend uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or friend is null or caller = friend then
    raise exception 'This person is unavailable.';
  end if;

  perform tether_private.lock_circle_pair(caller, friend);
  insert into tether_private.circle_blocks (owner_id, blocked_id) values (caller, friend)
  on conflict do nothing;
  perform tether_private.disconnect_circle_pair(caller, friend);
end;
$$;

create function public.unblock_circle_friend(friend uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or friend is null or caller = friend then return; end if;
  perform tether_private.lock_circle_pair(caller, friend);
  delete from tether_private.circle_blocks where owner_id = caller and blocked_id = friend;
end;
$$;

create function public.list_circle_blocks()
returns table (friend_id uuid, display_name text)
language sql stable security definer set search_path = ''
as $$
  select block.blocked_id, coalesce(profile.display_name, 'Tether member')
  from tether_private.circle_blocks block
  left join public.profiles profile on profile.id = block.blocked_id
  where block.owner_id = (select auth.uid())
  order by lower(coalesce(profile.display_name, 'Tether member')), block.blocked_id;
$$;

revoke all on function public.block_circle_friend(uuid) from public, anon, authenticated;
revoke all on function public.unblock_circle_friend(uuid) from public, anon, authenticated;
revoke all on function public.list_circle_blocks() from public, anon, authenticated;
grant execute on function public.block_circle_friend(uuid) to authenticated;
grant execute on function public.unblock_circle_friend(uuid) to authenticated;
grant execute on function public.list_circle_blocks() to authenticated;
