create function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  methods jsonb := auth.jwt() -> 'amr';
  current_epoch numeric := extract(epoch from now());
begin
  if caller is null or jsonb_typeof(methods) is distinct from 'array' then
    raise exception 'Confirm your password to delete your account.';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(methods) method
    where method ->> 'method' = 'password'
      and case
        when (method ->> 'timestamp') ~ '^[0-9]{1,12}$'
        then (method ->> 'timestamp')::numeric between current_epoch - 300 and current_epoch + 30
        else false
      end
  ) then
    raise exception 'Confirm your password to delete your account.';
  end if;

  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
