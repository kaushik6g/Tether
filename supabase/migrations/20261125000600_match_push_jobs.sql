create table tether_private.match_push_jobs (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  token text not null references tether_private.push_devices(token) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  lease uuid,
  ticket text,
  finished_at timestamptz,
  unique (match_id, token)
);

create index match_push_jobs_available on tether_private.match_push_jobs (available_at, id)
where finished_at is null;

create function tether_private.enqueue_match_push()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into tether_private.match_push_jobs (match_id, token, recipient_id)
  select new.id, device.token, device.user_id
  from tether_private.push_devices device
  where device.user_id in (new.first_user, new.second_user);

  return new;
end;
$$;

revoke all on function tether_private.enqueue_match_push() from public, anon, authenticated;

create trigger enqueue_match_push_after_insert
after insert on public.matches
for each row execute function tether_private.enqueue_match_push();
