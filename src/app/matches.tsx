import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { listMatches } from '@/features/api';
import { useMatchFeed } from '@/features/use-match-feed';

const inboxDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function MatchesScreen() {
  const colors = useAccountColors();
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { archive } = useLocalSearchParams<{ archive?: string }>();
  const archived = archive === '1';
  const { data, error, reload } = useMatchFeed('catch-up-inbox', undefined, listMatches);

  const category = data?.filter((match) => !!match.closed_at === archived);
  if (archived && category) {
    category.sort((left, right) => Date.parse(right.closed_at ?? right.created_at) - Date.parse(left.closed_at ?? left.created_at));
  }
  const term = query.trim().toLocaleLowerCase();
  const visible = category?.filter((match) => match.display_name.toLocaleLowerCase().includes(term));

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Catch-ups</Text>
      <Link href="/upcoming" style={[accountStyles.link, { color: colors.text }]}>Upcoming plans</Link>
      {data === undefined && !error && <Text style={{ color: colors.secondary }}>Loading catch-ups…</Text>}
      <Action title={archived ? 'Show open catch-ups' : 'Show archived catch-ups'} onPress={() => router.setParams({ archive: archived ? '0' : '1' })} />
      <Text accessibilityRole="header" style={[accountStyles.copy, { color: colors.text }]}>
        {archived ? 'Archived catch-ups' : 'Open catch-ups'}
      </Text>
      {!!category?.length && (
        <Field accessibilityLabel="Search catch-ups by name" placeholder="Search by name"
          value={query} onChangeText={setQuery} autoCorrect={false} />
      )}
      {!!category?.length && visible?.length === 0 && <Text style={{ color: colors.secondary }}>No catch-ups match your search.</Text>}
      {category?.length === 0 && <Text style={{ color: colors.secondary }}>
        {archived ? 'No archived catch-ups yet.' : 'A chat opens when you and a friend both tap.'}
      </Text>}
      {visible?.map((match) => (
        <View key={match.id} style={[styles.item, { borderColor: colors.border }]}>
          <Link href={{ pathname: '/chat/[id]', params: { id: match.id, ...(archived && { archive: '1' }) } }}
            style={[accountStyles.link, { color: colors.text }]}>{match.display_name}</Link>
          <Text style={{ color: colors.secondary }}>
            {match.closed_at ? 'Closed' : 'Opened'} {inboxDate.format(new Date(match.closed_at ?? match.created_at))}
          </Text>
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
