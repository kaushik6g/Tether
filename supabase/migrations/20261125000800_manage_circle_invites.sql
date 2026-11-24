create index circle_invites_by_inviter
on tether_private.circle_invites (inviter_id, expires_at desc)
where accepted_by is null;

create function public.list_active_circle_invites()
returns table (token uuid, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select invite.token, invite.expires_at
  from tether_private.circle_invites invite
  where invite.inviter_id = (select auth.uid())
    and invite.accepted_by is null
    and invite.expires_at > now()
  order by invite.expires_at desc, invite.token;
$$;

create function public.revoke_circle_invite(invite_token uuid)
returns boolean
language sql security definer set search_path = ''
as $$
  with revoked as (
    delete from tether_private.circle_invites invite
    where invite.token = invite_token
      and invite.inviter_id = (select auth.uid())
      and invite.accepted_by is null
    returning invite.token
  )
  select exists (select 1 from revoked);
$$;

revoke all on function public.list_active_circle_invites() from public, anon, authenticated;
revoke all on function public.revoke_circle_invite(uuid) from public, anon, authenticated;
grant execute on function public.list_active_circle_invites() to authenticated;
grant execute on function public.revoke_circle_invite(uuid) to authenticated;
