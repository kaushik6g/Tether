import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { listMatches } from '@/features/api';
import { useMatchFeed } from '@/features/use-match-feed';

export default function MatchesScreen() {
  const colors = useAccountColors();
  const { data, error, reload } = useMatchFeed('catch-up-inbox', undefined, listMatches);

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Catch-ups</Text>
      {data === undefined && !error && <Text style={{ color: colors.secondary }}>Loading catch-ups…</Text>}
      {data?.length === 0 && <Text style={[accountStyles.copy, { color: colors.secondary }]}>A chat opens when you and a friend both tap.</Text>}
      {data?.map((match) => (
        <View key={match.id} style={[styles.item, { borderColor: colors.border }]}>
          <Link href={{ pathname: '/chat/[id]', params: { id: match.id } }}
            style={[accountStyles.link, { color: colors.text }]}>{match.display_name}</Link>
          <Text style={{ color: colors.secondary }}>{match.closed_at ? 'Plan made' : 'Ready to make a plan'}</Text>
        </View>
      ))}
      {error ? <Problem message="Could not load catch-ups. Try again." /> : null}
      <Action title="Refresh" onPress={reload} />
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1, paddingBottom: 12 },
});
