import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { accountStyles, useAccountColors } from '@/components/account-ui';
import { PlanCalendarAction } from '@/components/plan-calendar-action';
import { Action, Problem } from '@/components/feature-ui';
import { errorMessage } from '@/features/api';
import { formatPlanTime } from '@/features/plan-time';
import { acceptPlan, resolveProposal, type CatchupPlan } from '@/features/plans';

export function PlanDetails({ plan }: { plan: CatchupPlan }) {
  const colors = useAccountColors();
  return (
    <View style={styles.details}>
      <Text style={[accountStyles.copy, { color: colors.text }]}>{formatPlanTime(plan.starts_at)}</Text>
      <Text style={{ color: colors.secondary }}>{plan.duration_minutes} minutes</Text>
      {plan.place ? <Text style={{ color: colors.text }}>{plan.place}</Text> : null}
      {plan.note ? <Text style={{ color: colors.secondary }}>{plan.note}</Text> : null}
    </View>
  );
}

export function ChatPlan({ matchId, plans, userId, closed, reload }: {
  matchId: string;
  plans: CatchupPlan[];
  userId: string | undefined;
  closed: boolean;
  reload: () => void;
}) {
  const colors = useAccountColors();
  const updating = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const plan = plans.find((entry) => entry.status === 'confirmed' || entry.status === 'cancelled') ??
    plans.find((entry) => entry.status === 'pending');
  const own = plan?.proposer_id === userId;

  async function respond(decision: 'accept' | 'declined' | 'withdrawn') {
    if (!plan || closed || !userId || updating.current) return;
    updating.current = true;
    setBusy(true);
    setProblem('');
    try {
      if (decision === 'accept') await acceptPlan(plan.id);
      else await resolveProposal(plan.id, decision);
    } catch (failure) {
      setProblem(errorMessage(failure, 'Could not update this proposal. Try again.'));
    } finally {
      reload();
      setBusy(false);
      updating.current = false;
    }
  }

  if (closed && !plan) return null;
  const proposed = plan?.status === 'pending' && !closed;
  const expired = !!plan && new Date(plan.starts_at).getTime() <= Date.now();

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      {plan && <>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {plan.status === 'confirmed' ? 'Confirmed plan' : plan.status === 'cancelled'
            ? 'Cancelled plan' : own ? 'Your proposal' : 'Suggested plan'}
        </Text>
        <PlanDetails plan={plan} />
        {plan.status === 'confirmed' && !expired && <PlanCalendarAction plan={plan} />}
      </>}
      {proposed && expired && <Text style={{ color: colors.secondary }}>This proposed time has passed.</Text>}
      {proposed && own && <Action title="Withdraw proposal" disabled={busy} onPress={() => respond('withdrawn')} />}
      {proposed && !own && (
        <>
          <Action title="Accept plan" disabled={busy || expired} onPress={() => respond('accept')} />
          <Action title="Decline proposal" disabled={busy} onPress={() => respond('declined')} />
        </>
      )}
      {!closed && !busy && <Link href={{ pathname: '/plan/[id]', params: { id: matchId } }}
        style={[accountStyles.link, { color: colors.text }]}>
        {proposed ? 'Suggest another plan' : 'Suggest a plan'}
      </Link>}
      {problem ? <Problem message={problem} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  details: { gap: 6 },
});
