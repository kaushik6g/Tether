import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { PlanDetails } from '@/components/chat-plan';
import { Action, Problem } from '@/components/feature-ui';
import { listMatches } from '@/features/api';
import { listUpcomingPlans } from '@/features/plans';
import { useMatchFeed } from '@/features/use-match-feed';

async function loadUpcoming() {
  const [plans, matches] = await Promise.all([listUpcomingPlans(), listMatches()]);
  const names = new Map(matches.map((match) => [match.id, match.display_name]));
  return plans.flatMap((plan) => {
    const name = names.get(plan.match_id);
    return name ? [{ plan, name }] : [];
  });
}

export default function UpcomingScreen() {
  const colors = useAccountColors();
  const { data, error, reload } = useMatchFeed('upcoming-plans', undefined, loadUpcoming, true);

  return (
    <AccountPage>
      <Link href="/matches" replace style={[accountStyles.link, { color: colors.secondary }]}>Catch-ups</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Upcoming plans</Text>
      {!data && !error && <Text style={{ color: colors.secondary }}>Loading plans.</Text>}
      {data?.length === 0 && <Text style={[accountStyles.copy, { color: colors.secondary }]}>You have no confirmed plans coming up.</Text>}
      {data?.map(({ plan, name }) => (
        <View key={plan.id} style={[styles.plan, { borderColor: colors.border }]}>
          <Link href={{ pathname: '/chat/[id]', params: { id: plan.match_id } }}
            style={[accountStyles.link, { color: colors.text }]}>{name}</Link>
          <PlanDetails plan={plan} />
        </View>
      ))}
      {error ? <Problem message="Could not refresh your upcoming plans." /> : null}
      <Action title="Refresh" onPress={reload} />
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  plan: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
});
