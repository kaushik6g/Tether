import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { listMatches } from '@/features/api';
import { useMatchFeed } from '@/features/use-match-feed';

export default function MatchesScreen() {
  const colors = useAccountColors();
  const [archived, setArchived] = useState(false);
  const { data, error, reload } = useMatchFeed('catch-up-inbox', undefined, listMatches);

  const visible = data?.filter((match) => !!match.closed_at === archived);

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Catch-ups</Text>
      <Link href="/upcoming" style={[accountStyles.link, { color: colors.text }]}>Upcoming plans</Link>
      {data === undefined && !error && <Text style={{ color: colors.secondary }}>Loading catch-ups…</Text>}
      <Action title={archived ? 'Show open catch-ups' : 'Show archived catch-ups'} onPress={() => setArchived(!archived)} />
      <Text accessibilityRole="header" style={[accountStyles.copy, { color: colors.text }]}>
        {archived ? 'Archived catch-ups' : 'Open catch-ups'}
      </Text>
      {visible?.length === 0 && <Text style={{ color: colors.secondary }}>
        {archived ? 'No archived catch-ups yet.' : 'A chat opens when you and a friend both tap.'}
      </Text>}
      {visible?.map((match) => (
        <View key={match.id} style={[styles.item, { borderColor: colors.border }]}>
          <Link href={{ pathname: '/chat/[id]', params: { id: match.id } }}
            style={[accountStyles.link, { color: colors.text }]}>{match.display_name}</Link>
          <Text style={{ color: colors.secondary }}>{match.closed_reason ? 'Chat closed' : match.closed_at ? 'Plan made' : 'Ready to make a plan'}</Text>
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
