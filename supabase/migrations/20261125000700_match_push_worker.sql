create function public.claim_match_push_jobs()
returns table (id bigint, lease uuid, match_id uuid, token text, ticket text)
language plpgsql security definer set search_path = ''
as $$
begin
  delete from tether_private.match_push_jobs job
  where job.created_at < now() - interval '48 hours';

  return query
  with pending as (
    select job.id
    from tether_private.match_push_jobs job
    join tether_private.push_devices device on device.token = job.token
      and device.user_id = job.recipient_id
    where job.finished_at is null and job.available_at <= now() and job.attempts < 6
      and (job.ticket is not null or job.created_at > now() - interval '24 hours')
    order by job.available_at, job.id
    limit 50
    for update of job skip locked
  )
  update tether_private.match_push_jobs job
  set lease = gen_random_uuid(), attempts = job.attempts + 1, available_at = now() + interval '2 minutes'
  from pending
  where job.id = pending.id
  returning job.id, job.lease, job.match_id, job.token, job.ticket;
end;
$$;

create function public.finish_match_push_job(job_id bigint, job_lease uuid, outcome text, expo_ticket text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  job tether_private.match_push_jobs%rowtype;
begin
  if outcome is null or outcome not in ('retry', 'accepted', 'done', 'unregistered')
    or (outcome = 'accepted' and nullif(expo_ticket, '') is null) then
    raise exception 'Invalid push outcome.';
  end if;

  update tether_private.match_push_jobs
  set lease = null,
      available_at = now() + case
        when outcome = 'accepted' then interval '15 minutes'
        when ticket is not null then interval '30 minutes'
        else greatest(attempts, 1) * interval '1 minute'
      end,
      attempts = case when outcome = 'accepted' then 0 else attempts end,
      ticket = coalesce(expo_ticket, ticket),
      finished_at = case
        when outcome in ('done', 'unregistered') or (outcome = 'retry' and attempts >= 6)
          then now()
        else null
      end
  where id = job_id and lease = job_lease and finished_at is null
  returning * into job;

  if found and outcome = 'unregistered' then
    delete from tether_private.push_devices device
    where device.token = job.token and device.user_id = job.recipient_id
      and device.registered_at <= job.created_at;
  end if;
end;
$$;

revoke all on function public.claim_match_push_jobs() from public, anon, authenticated;
revoke all on function public.finish_match_push_job(bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_match_push_jobs() to service_role;
grant execute on function public.finish_match_push_job(bigint, uuid, text, text) to service_role;
