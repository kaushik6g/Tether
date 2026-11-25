create table tether_private.account_birth_dates (
  user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
  date_of_birth date not null
);

alter table tether_private.account_birth_dates enable row level security;
revoke all on tether_private.account_birth_dates from public, anon, authenticated;

create function tether_private.eligible_birth_date(value text)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  birthday date;
begin
  if value is null or value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;

  birthday := value::date;
  if birthday > (timezone('UTC', now())::date - interval '18 years')::date then
    return null;
  end if;
  return birthday;
exception when invalid_datetime_format or datetime_field_overflow then
  return null;
end;
$$;

revoke all on function tether_private.eligible_birth_date(text) from public, anon, authenticated;
grant usage on schema tether_private to supabase_auth_admin;
grant execute on function tether_private.eligible_birth_date(text) to supabase_auth_admin;

create or replace function public.require_tether_signup_age(event jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when tether_private.eligible_birth_date(event #>> '{user,user_metadata,tether_date_of_birth}') is not null
      then '{}'::jsonb
    else jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Enter a valid date of birth and confirm you are at least 18 to create an account.'
      )
    )
  end;
$$;

create function tether_private.save_signup_birth_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  birthday date;
begin
  if new.raw_user_meta_data ? 'tether_date_of_birth' then
    birthday := tether_private.eligible_birth_date(new.raw_user_meta_data ->> 'tether_date_of_birth');
    if birthday is null then
      raise exception using errcode = '22007', message = 'Signup requires a valid adult date of birth.';
    end if;

    -- The deferred foreign key is checked once the auth user insert has completed.
    insert into tether_private.account_birth_dates (user_id, date_of_birth)
    values (new.id, birthday);
    new.raw_user_meta_data := new.raw_user_meta_data - 'tether_date_of_birth';
  end if;
  return new;
end;
$$;

revoke all on function tether_private.save_signup_birth_date() from public, anon, authenticated;

create trigger tether_save_signup_birth_date
before insert on auth.users
for each row execute function tether_private.save_signup_birth_date();

-- The client checks this before including a birth date in signup metadata.
create function public.tether_birth_date_signup_ready()
returns boolean
language sql
stable
set search_path = ''
as $$ select true; $$;

revoke all on function public.tether_birth_date_signup_ready() from public, anon, authenticated;
grant execute on function public.tether_birth_date_signup_ready() to anon;
