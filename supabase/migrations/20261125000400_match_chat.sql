create function public.list_matches()
returns table (id uuid, display_name text, created_at timestamptz, closed_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select match.id, profile.display_name, match.created_at, match.closed_at
  from public.matches match
  join public.profiles profile
    on profile.id = case when match.first_user = (select auth.uid())
      then match.second_user else match.first_user end
  where (select auth.uid()) in (match.first_user, match.second_user)
  order by (match.closed_at is not null), match.created_at desc, match.id;
$$;

create function public.send_match_message(match uuid, message text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  perform 1 from public.matches
  where id = match and caller in (first_user, second_user) and closed_at is null
  for update;
  if not found then raise exception 'This conversation is unavailable.'; end if;

  insert into public.messages (match_id, sender_id, body)
  values (match, caller, btrim(message));
end;
$$;

create function public.close_match(match uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.matches set closed_at = now()
  where id = match and (select auth.uid()) in (first_user, second_user) and closed_at is null;
$$;

revoke all on function public.list_matches() from public, anon, authenticated;
revoke all on function public.send_match_message(uuid, text) from public, anon, authenticated;
revoke all on function public.close_match(uuid) from public, anon, authenticated;
grant execute on function public.list_matches() to authenticated;
grant execute on function public.send_match_message(uuid, text) to authenticated;
grant execute on function public.close_match(uuid) to authenticated;

alter publication supabase_realtime add table public.matches, public.messages;
