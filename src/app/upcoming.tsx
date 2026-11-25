import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { PlanDetails } from '@/components/chat-plan';
import { PlanCalendarAction } from '@/components/plan-calendar-action';
import { Action, Problem } from '@/components/feature-ui';
import { listMatches } from '@/features/api';
import { listRecentPlans, listUpcomingPlans } from '@/features/plans';
import { useMatchFeed } from '@/features/use-match-feed';

async function loadNamedPlans(loadPlans: typeof listUpcomingPlans) {
  const [plans, matches] = await Promise.all([loadPlans(), listMatches()]);
  const names = new Map(matches.map((match) => [match.id, match.display_name]));
  return plans.flatMap((plan) => {
    const name = names.get(plan.match_id);
    return name ? [{ plan, name }] : [];
  });
}

const loadUpcoming = () => loadNamedPlans(listUpcomingPlans);
const loadRecent = () => loadNamedPlans(listRecentPlans);

export default function UpcomingScreen() {
  const [recent, setRecent] = useState(false);
  return <PlansList key={String(recent)} recent={recent} switchView={() => setRecent((value) => !value)} />;
}

function PlansList({ recent, switchView }: { recent: boolean; switchView: () => void }) {
  const colors = useAccountColors();
  const { data, error, reload } = useMatchFeed(recent ? 'recent-plans' : 'upcoming-plans', undefined, recent ? loadRecent : loadUpcoming, true);

  const refresh = useRef(reload);
  useEffect(() => { refresh.current = reload; }, [reload]);
  useFocusEffect(useCallback(() => {
    const interval = setInterval(() => refresh.current(), 60_000);
    return () => clearInterval(interval);
  }, []));

  return (
    <AccountPage>
      <Link href="/matches" replace style={[accountStyles.link, { color: colors.secondary }]}>Catch-ups</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>{recent ? 'Recent plans' : 'Upcoming plans'}</Text>
      <Action title={recent ? 'Show upcoming plans' : 'Show recent plans'} onPress={switchView} />
      {!data && !error && <Text style={{ color: colors.secondary }}>Loading plans.</Text>}
      {data?.length === 0 && <Text style={[accountStyles.copy, { color: colors.secondary }]}>{recent ? 'No recent plans yet.' : 'You have no confirmed plans coming up.'}</Text>}
      {data?.map(({ plan, name }) => (
        <View key={plan.id} style={[styles.plan, { borderColor: colors.border }]}>
          <Link href={{ pathname: '/chat/[id]', params: { id: plan.match_id } }}
            style={[accountStyles.link, { color: colors.text }]}>{name}</Link>
          <PlanDetails plan={plan} />
          {recent ? <Text style={{ color: colors.secondary }}>{plan.status === 'cancelled' ? 'Cancelled' : 'Past plan'}</Text> : <PlanCalendarAction plan={plan} />}
        </View>
      ))}
      {error ? <Problem message="Could not refresh your plans." /> : null}
      <Action title="Refresh" onPress={reload} />
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  plan: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
});
