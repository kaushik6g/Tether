create table tether_private.taps (
  sender_id uuid not null,
  friend_id uuid not null,
  expires_at timestamptz not null,
  primary key (sender_id, friend_id),
  foreign key (sender_id, friend_id)
    references tether_private.circle_members(owner_id, friend_id) on delete cascade
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  first_user uuid not null references auth.users(id) on delete cascade,
  second_user uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (first_user < second_user)
);
create unique index one_open_match_per_pair on public.matches(first_user, second_user)
  where closed_at is null;
create index matches_by_second_user on public.matches(second_user, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_by_match on public.messages(match_id, created_at, id);

alter table public.matches enable row level security;
alter table public.messages enable row level security;
revoke all on public.matches, public.messages from public, anon, authenticated;
grant select on public.matches, public.messages to authenticated;
create policy "Read matches as a participant" on public.matches for select to authenticated
  using ((select auth.uid()) in (first_user, second_user));
create policy "Read messages in own matches" on public.messages for select to authenticated
  using (exists (select 1 from public.matches match where match.id = match_id));

create function public.tap_friend(friend uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  first_id uuid := least(caller, friend);
  second_id uuid := greatest(caller, friend);
  match_id uuid;
begin
  if caller is null or not exists (
    select 1 from tether_private.circle_members where owner_id = caller and friend_id = friend
  ) then
    raise exception 'That friend is unavailable.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(first_id::text || ':' || second_id::text, 0));

  select id into match_id from public.matches
  where first_user = first_id and second_user = second_id and closed_at is null;
  if found then return match_id; end if;

  insert into tether_private.taps values (caller, friend, now() + interval '7 days')
  on conflict (sender_id, friend_id) do update set expires_at = excluded.expires_at;

  if not exists (
    select 1 from tether_private.taps
    where sender_id = friend and friend_id = caller and expires_at > now()
  ) then
    return null;
  end if;

  insert into public.matches (first_user, second_user) values (first_id, second_id)
  returning id into match_id;
  insert into public.messages (match_id, body)
  values (match_id, 'Coffee this weekend? Suggest a time that works for you.');

  delete from tether_private.taps
  where (sender_id, friend_id) in ((caller, friend), (friend, caller));
  return match_id;
end;
$$;

revoke all on function public.tap_friend(uuid) from public, anon, authenticated;
grant execute on function public.tap_friend(uuid) to authenticated;
