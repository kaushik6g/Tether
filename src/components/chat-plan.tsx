import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { accountStyles, useAccountColors } from '@/components/account-ui';
import { PlanCalendarAction } from '@/components/plan-calendar-action';
import { Action, Problem } from '@/components/feature-ui';
import { errorMessage } from '@/features/api';
import { formatPlanTime } from '@/features/plan-time';
import { acceptPlan, cancelPlan, resolveProposal, type CatchupPlan } from '@/features/plans';

const outcomes: Partial<Record<CatchupPlan['status'], string>> = {
  declined: 'Declined', withdrawn: 'Withdrawn', replaced: 'Replaced', closed: 'Closed with chat',
};

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

export function ChatPlan({ matchId, plans, history, userId, closed, reload }: {
  matchId: string;
  plans: CatchupPlan[];
  history: CatchupPlan[];
  userId: string | undefined;
  closed: boolean;
  reload: () => void;
}) {
  const colors = useAccountColors();
  const updating = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const plan = plans.find((entry) => entry.status === 'confirmed' || entry.status === 'cancelled') ??
    plans.find((entry) => entry.status === 'pending');
  const own = plan?.proposer_id === userId;

  async function respond(decision: 'accept' | 'declined' | 'withdrawn' | 'cancel') {
    if (!plan || !userId || updating.current || (decision !== 'cancel' && closed)) return;
    updating.current = true;
    setBusy(true);
    setProblem('');
    try {
      if (decision === 'cancel') {
        await cancelPlan(plan.id);
        setConfirmCancellation(false);
      } else if (decision === 'accept') await acceptPlan(plan.id);
      else await resolveProposal(plan.id, decision);
    } catch (failure) {
      setProblem(errorMessage(failure, 'Could not update this proposal. Try again.'));
    } finally {
      reload();
      setBusy(false);
      updating.current = false;
    }
  }

  if (closed && !plan && !history.length) return null;
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
      {plan?.status === 'confirmed' && !expired && userId && (
        confirmCancellation ? (
          <>
            <Text style={{ color: colors.secondary }}>This cancels the plan for both of you. Calendar copies can be removed from your calendar.</Text>
            <Action title="Confirm cancellation" disabled={busy} onPress={() => respond('cancel')} />
            <Action title="Keep the plan" disabled={busy} onPress={() => setConfirmCancellation(false)} />
          </>
        ) : (
          <Action title="Cancel this plan" disabled={busy} onPress={() => setConfirmCancellation(true)} />
        )
      )}
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
      {history.length > 0 && (
        <>
          <Action title={historyVisible ? 'Hide previous proposals' : 'Show previous proposals'}
            onPress={() => setHistoryVisible(!historyVisible)} />
          {historyVisible && history.map((entry) => (
            <View key={entry.id} style={[styles.historyItem, { borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>{outcomes[entry.status]}</Text>
              <PlanDetails plan={entry} />
            </View>
          ))}
        </>
      )}
      {problem ? <Problem message={problem} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  details: { gap: 6 },
  historyItem: { borderTopWidth: 1, gap: 6, paddingTop: 8 },
});
