import { createClient } from 'npm:@supabase/supabase-js@2';

type Job = { id: number; lease: string; match_id: string; token: string; ticket: string | null };
type ExpoResult = { status?: string; id?: string; details?: { error?: string } };
type Outcome = 'retry' | 'accepted' | 'done' | 'unregistered';

const expoUrl = 'https://exp.host/--/api/v2/push/';

function classify(result: ExpoResult | undefined): Outcome {
  if (result?.details?.error === 'DeviceNotRegistered') return 'unregistered';
  if (result?.status === 'ok') return 'done';
  if (result?.details?.error === 'MessageTooBig') return 'done';
  return 'retry';
}

async function expoRequest<T>(path: string, payload: unknown): Promise<T | undefined> {
  const accessToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN');
  try {
    const response = await fetch(expoUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken && { Authorization: 'Bearer ' + accessToken }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) return (await response.json()).data as T;
  } catch {
    // A missed response leaves the job eligible for a later attempt.
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  const secret = Deno.env.get('TETHER_PUSH_WORKER_SECRET');
  if (!secret || request.headers.get('x-tether-worker-key') !== secret) {
    return new Response(null, { status: 401 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return new Response(null, { status: 503 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('claim_match_push_jobs');
  if (error) return Response.json({ error: 'Could not claim push jobs.' }, { status: 503 });

  const jobs = (data ?? []) as Job[];
  const send = jobs.filter((job) => !job.ticket);
  const receipt = jobs.filter((job): job is Job & { ticket: string } => !!job.ticket);

  const [tickets, receipts] = await Promise.all([
    send.length ? expoRequest<ExpoResult[]>('send', send.map((job) => ({
      to: job.token,
      title: 'Tether',
      body: 'You have a new catch-up.',
      channelId: 'matches',
      data: { matchId: job.match_id },
      ttl: 86_400,
    }))) : undefined,
    receipt.length ? expoRequest<Record<string, ExpoResult>>('getReceipts', {
      ids: receipt.map((job) => job.ticket),
    }) : undefined,
  ]);

  const results = [
    ...send.map((job, index) => {
      const result = tickets?.[index];
      if (result?.status === 'ok' && result.id) {
        return { job, outcome: 'accepted' as const, ticket: result.id };
      }
      return { job, outcome: result?.status === 'ok' ? 'retry' as const : classify(result) };
    }),
    ...receipt.map((job) => ({ job, outcome: classify(receipts?.[job.ticket]) })),
  ];

  let failures = 0;
  for (let start = 0; start < results.length; start += 10) {
    const completed = await Promise.allSettled(results.slice(start, start + 10).map(async ({ job, outcome, ...result }) => {
      const { error } = await supabase.rpc('finish_match_push_job', {
        job_id: job.id,
        job_lease: job.lease,
        outcome,
        expo_ticket: 'ticket' in result ? result.ticket : null,
      });
      if (error) throw error;
    }));
    failures += completed.filter((result) => result.status === 'rejected').length;
  }

  return Response.json({ claimed: jobs.length, failures }, { status: failures ? 503 : 200 });
});
