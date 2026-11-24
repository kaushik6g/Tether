create function public.list_match_message_page(
  target_match uuid, before_at timestamptz default null, before_id uuid default null
)
returns table (id uuid, sender_id uuid, body text, created_at timestamptz)
language sql stable security invoker set search_path = ''
as $$
  select message.id, message.sender_id, message.body, message.created_at
  from public.messages message
  where message.match_id = target_match
    and (
      (before_at is null and before_id is null)
      or (message.created_at, message.id) < (before_at, before_id)
    )
  order by message.created_at desc, message.id desc
  limit 41;
$$;

revoke all on function public.list_match_message_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_match_message_page(uuid, timestamptz, uuid) to authenticated;
