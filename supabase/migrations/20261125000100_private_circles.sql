create schema tether_private;
revoke all on schema tether_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60)
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

create policy "Read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Create own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "Update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create table tether_private.circle_members (
  owner_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);

create function public.list_circle()
returns table (friend_id uuid, display_name text)
language sql stable security definer set search_path = ''
as $$
  select membership.friend_id, profile.display_name
  from tether_private.circle_members membership
  join public.profiles profile on profile.id = membership.friend_id
  where membership.owner_id = (select auth.uid())
  order by lower(profile.display_name), membership.friend_id;
$$;

revoke all on function public.list_circle() from public, anon, authenticated;
grant execute on function public.list_circle() to authenticated;
