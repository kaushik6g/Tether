create table tether_private.push_devices (
  token text primary key check (token ~ '^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{1,200}\]$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  registered_at timestamptz not null default now()
);
create index push_devices_by_user on tether_private.push_devices (user_id);

create function public.register_match_push_device(device_token text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in to enable notifications.'; end if;
  insert into tether_private.push_devices (token, user_id)
  values (device_token, caller)
  on conflict (token) do update
  set user_id = excluded.user_id, registered_at = now();
end;
$$;

create function public.unregister_match_push_device(device_token text)
returns void
language sql security definer set search_path = ''
as $$
  delete from tether_private.push_devices
  where token = device_token and user_id = (select auth.uid());
$$;

revoke all on function public.register_match_push_device(text) from public, anon, authenticated;
revoke all on function public.unregister_match_push_device(text) from public, anon, authenticated;
grant execute on function public.register_match_push_device(text) to authenticated;
grant execute on function public.unregister_match_push_device(text) to authenticated;
