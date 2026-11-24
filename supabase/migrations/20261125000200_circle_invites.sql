create table tether_private.circle_invites (
  token uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete cascade
);

create function public.create_circle_invite()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  invite_token uuid;
begin
  if caller is null or not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Save your display name before inviting a friend.';
  end if;

  insert into tether_private.circle_invites (inviter_id) values (caller)
  returning token into invite_token;
  return invite_token;
end;
$$;

create function public.preview_circle_invite(invite_token uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select profile.display_name
  from tether_private.circle_invites invite
  join public.profiles profile on profile.id = invite.inviter_id
  where invite.token = invite_token and invite.accepted_by is null and invite.expires_at > now();
$$;

create function public.accept_circle_invite(invite_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  invite tether_private.circle_invites%rowtype;
begin
  if caller is null or not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Save your display name before accepting an invite.';
  end if;

  select * into invite from tether_private.circle_invites
  where token = invite_token for update;

  if invite.accepted_by = caller then return; end if;
  if not found or invite.accepted_by is not null or invite.expires_at <= now() then
    raise exception 'This invitation has expired or has already been used.';
  end if;
  if invite.inviter_id = caller then
    raise exception 'Send the invitation to a friend to add them to your circle.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(caller, invite.inviter_id)::text || ':' || greatest(caller, invite.inviter_id)::text, 0
  ));

  insert into tether_private.circle_members (owner_id, friend_id)
  values (caller, invite.inviter_id), (invite.inviter_id, caller)
  on conflict do nothing;

  update tether_private.circle_invites set accepted_by = caller where token = invite_token;
end;
$$;

revoke all on function public.create_circle_invite() from public, anon, authenticated;
revoke all on function public.preview_circle_invite(uuid) from public, anon, authenticated;
revoke all on function public.accept_circle_invite(uuid) from public, anon, authenticated;
grant execute on function public.create_circle_invite() to authenticated;
grant execute on function public.preview_circle_invite(uuid) to anon, authenticated;
grant execute on function public.accept_circle_invite(uuid) to authenticated;
