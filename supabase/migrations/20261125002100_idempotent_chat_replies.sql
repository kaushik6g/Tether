alter table public.messages add column client_request_id uuid;
create unique index messages_by_client_request
  on public.messages (match_id, sender_id, client_request_id)
  where client_request_id is not null;

create function public.send_match_message_once(target_match uuid, message text, request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  ended_at timestamptz;
  existing_body text;
  clean_body text := btrim(message);
begin
  select closed_at into ended_at from public.matches
  where id = target_match and caller in (first_user, second_user)
  for update;
  if not found or request_id is null then raise exception 'This conversation is unavailable.'; end if;

  select body into existing_body from public.messages
  where match_id = target_match and sender_id = caller and client_request_id = request_id;
  if found then
    if existing_body is distinct from clean_body then raise exception 'Use a new request for a different reply.'; end if;
    return;
  end if;

  if ended_at is not null then raise exception 'This conversation is closed.'; end if;

  insert into public.messages (match_id, sender_id, body, client_request_id)
  values (target_match, caller, clean_body, request_id);
end;
$$;

revoke all on function public.send_match_message_once(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.send_match_message_once(uuid, text, uuid) to authenticated;
