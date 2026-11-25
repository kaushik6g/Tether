-- Select this function as the Supabase Auth Before User Created hook.
create or replace function public.require_tether_signup_age(event jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when event #> '{user,user_metadata,tether_age_eligible}' = 'true'::jsonb then '{}'::jsonb
    else jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Confirm that you are at least 18 in the latest Tether app to create an account.'
      )
    )
  end;
$$;

revoke execute on function public.require_tether_signup_age(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.require_tether_signup_age(jsonb) to supabase_auth_admin;
