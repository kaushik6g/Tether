import { client, rpc } from '@/features/api';

export type PlanStatus = 'pending' | 'confirmed' | 'declined' | 'withdrawn' | 'replaced' | 'closed' | 'cancelled';

export type CatchupPlan = {
  id: string;
  match_id: string;
  proposer_id: string;
  starts_at: string;
  duration_minutes: number;
  place: string;
  note: string;
  status: PlanStatus;
  created_at: string;
  decided_at: string | null;
};

export type PlanDraft = { startsAt: Date; minutes: number; place: string; note: string };

const columns = 'id,match_id,proposer_id,starts_at,duration_minutes,place,note,status,created_at,decided_at';

export async function listMatchPlans(matchId: string): Promise<CatchupPlan[]> {
  // Keep the active or agreed proposal available even when a chat has a long proposal history.
  const { data, error } = await client().from('catchup_plans').select(columns)
    .eq('match_id', matchId).in('status', ['pending', 'confirmed', 'cancelled'])
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  if (error) throw error;
  return data as CatchupPlan[];
}

export async function listUpcomingPlans(): Promise<CatchupPlan[]> {
  const { data, error } = await client().from('catchup_plans').select(columns)
    .eq('status', 'confirmed').gt('starts_at', new Date().toISOString())
    .order('starts_at').order('id');
  if (error) throw error;
  return data as CatchupPlan[];
}

export function suggestPlan(match: string, expected: string | null, draft: PlanDraft) {
  return rpc<string>('suggest_catchup_plan', {
    target_match: match,
    expected_pending: expected,
    starts: draft.startsAt.toISOString(),
    minutes: draft.minutes,
    place: draft.place,
    note: draft.note,
  });
}

export function acceptPlan(id: string) {
  return rpc<void>('accept_catchup_plan', { target_plan: id });
}

export function resolveProposal(id: string, decision: 'declined' | 'withdrawn') {
  return rpc<void>('resolve_catchup_proposal', { target_plan: id, decision });
}

export function cancelPlan(id: string) {
  return rpc<void>('cancel_catchup_plan', { target_plan: id });
}
