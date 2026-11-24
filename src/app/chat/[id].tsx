import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { closeMatch, listMatches, listMessages, sendMessage } from '@/features/api';
import { useMatchFeed } from '@/features/use-match-feed';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useAccountColors();
  if (typeof params.id !== 'string') {
    return <AccountPage><Text style={{ color: colors.text }}>This conversation is unavailable.</Text></AccountPage>;
  }
  return <Chat key={params.id} id={params.id} />;
}

function Chat({ id }: { id: string }) {
  const colors = useAccountColors();
  const userId = useSession().session?.user.id;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    const [matches, messages] = await Promise.all([listMatches(), listMessages(id)]);
    return { match: matches.find((entry) => entry.id === id), messages };
  }, [id]);
  const { data, error, reload } = useMatchFeed('catch-up-' + id, id, load);

  async function update(close: boolean) {
    if (busy || !data?.match || data.match.closed_at || (!close && !draft.trim())) return;
    setBusy(true);
    setProblem('');
    try {
      if (close) {
        await closeMatch(id);
      } else {
        await sendMessage(id, draft.trim());
        setDraft('');
      }
      reload();
    } catch {
      setProblem(close ? 'Could not mark the plan as made.' : 'Could not send your message. Try again.');
      reload();
    } finally {
      setBusy(false);
    }
  }

  const match = data?.match;
  return (
    <AccountPage>
      <Link href="/matches" replace style={[accountStyles.link, { color: colors.secondary }]}>Catch-ups</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {match?.display_name ?? 'Catch-up'}
      </Text>
      {!data && !error && <Text style={{ color: colors.secondary }}>Opening conversation…</Text>}
      {data && !match && <Problem message="This conversation is unavailable." />}
      {match && <>
        {data.messages.map((message) => {
          const sender = !message.sender_id ? 'Tether' : message.sender_id === userId ? 'You' : match.display_name;
          return (
            <View key={message.id} style={[styles.message, { borderColor: colors.border }]}>
              <Text style={{ color: colors.secondary, fontWeight: '600' }}>{sender}</Text>
              <Text style={[accountStyles.copy, { color: colors.text }]}>{message.body}</Text>
            </View>
          );
        })}
        {match.closed_at ? <Text style={{ color: colors.secondary }}>Plan made.</Text> : <>
          <Field accessibilityLabel="Message" placeholder="Suggest a time or send a reply"
            maxLength={1000} editable={!busy} value={draft} onChangeText={setDraft} multiline />
          <Action title="Send reply" onPress={() => void update(false)} disabled={busy || !draft.trim()} />
          <Action title="Mark plan as made" onPress={() => void update(true)} disabled={busy} />
        </>}
      </>}
      {problem ? <Problem message={problem} /> : null}
      {error ? <Problem message="Could not refresh this conversation." /> : null}
      {error && <Action title="Try again" onPress={reload} />}
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  message: { borderWidth: 1, borderRadius: 10, gap: 4, padding: 12 },
});
