create table public.catchup_plans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  proposer_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  place text not null default '' check (char_length(place) <= 200),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'withdrawn', 'replaced', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((status = 'pending') = (decided_at is null))
);

create unique index catchup_plans_one_pending
  on public.catchup_plans (match_id) where status = 'pending';
create unique index catchup_plans_one_agreement
  on public.catchup_plans (match_id) where status in ('confirmed', 'cancelled');
create index catchup_plans_by_match
  on public.catchup_plans (match_id, created_at desc, id desc);
create index catchup_plans_upcoming
  on public.catchup_plans (starts_at, id) where status = 'confirmed';

alter table public.catchup_plans enable row level security;
revoke all on public.catchup_plans from public, anon, authenticated;
grant select on public.catchup_plans to authenticated;

create policy "Read proposals in own catch-ups" on public.catchup_plans for select to authenticated
  using (exists (select 1 from public.matches match where match.id = catchup_plans.match_id));
