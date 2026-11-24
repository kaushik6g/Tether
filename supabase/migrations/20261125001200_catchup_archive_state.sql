create function public.list_catchups()
returns table (
  id uuid, display_name text, created_at timestamptz, closed_at timestamptz, closed_reason text
)
language sql stable security definer set search_path = ''
as $$
  select match.id, profile.display_name, match.created_at, match.closed_at, match.closed_reason
  from public.matches match
  join public.profiles profile
    on profile.id = case when match.first_user = (select auth.uid())
      then match.second_user else match.first_user end
  where (select auth.uid()) in (match.first_user, match.second_user)
  order by (match.closed_at is not null), match.created_at desc, match.id;
$$;

revoke all on function public.list_catchups() from public, anon, authenticated;
grant execute on function public.list_catchups() to authenticated;
