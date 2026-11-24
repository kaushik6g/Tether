create or replace function public.accept_circle_invite(invite_token uuid)
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

  if not found or invite.expires_at <= now() or invite.inviter_id = caller then
    raise exception 'This invitation is unavailable.';
  end if;

  perform tether_private.lock_circle_pair(caller, invite.inviter_id);
  if exists (
    select 1 from tether_private.circle_blocks
    where (owner_id, blocked_id) in ((caller, invite.inviter_id), (invite.inviter_id, caller))
  ) then
    raise exception 'This invitation is unavailable.';
  end if;

  if invite.accepted_by = caller then return; end if;
  if invite.accepted_by is not null then raise exception 'This invitation is unavailable.'; end if;

  insert into tether_private.circle_members (owner_id, friend_id)
  values (caller, invite.inviter_id), (invite.inviter_id, caller)
  on conflict do nothing;
  update tether_private.circle_invites set accepted_by = caller where token = invite_token;
end;
$$;

create or replace function public.tap_friend(friend uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  first_id uuid := least(caller, friend);
  second_id uuid := greatest(caller, friend);
  match_id uuid;
begin
  if caller is null or friend is null or caller = friend then
    raise exception 'That friend is unavailable.';
  end if;

  perform tether_private.lock_circle_pair(caller, friend);

  if not exists (
    select 1 from tether_private.circle_members where owner_id = caller and friend_id = friend
  ) or exists (
    select 1 from tether_private.circle_blocks
    where (owner_id, blocked_id) in ((caller, friend), (friend, caller))
  ) then
    raise exception 'That friend is unavailable.';
  end if;

  select id into match_id from public.matches
  where first_user = first_id and second_user = second_id and closed_at is null;
  if found then return match_id; end if;

  insert into tether_private.taps values (caller, friend, now() + interval '7 days')
  on conflict (sender_id, friend_id) do update set expires_at = excluded.expires_at;

  if not exists (
    select 1 from tether_private.taps
    where sender_id = friend and friend_id = caller and expires_at > now()
  ) then
    return null;
  end if;

  insert into public.matches (first_user, second_user) values (first_id, second_id)
  returning id into match_id;
  insert into public.messages (match_id, body)
  values (match_id, 'Coffee this weekend? Suggest a time that works for you.');

  delete from tether_private.taps
  where (sender_id, friend_id) in ((caller, friend), (friend, caller));
  return match_id;
end;
$$;
