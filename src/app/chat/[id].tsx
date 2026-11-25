import { randomUUID } from 'expo-crypto';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { ChatPlan } from '@/components/chat-plan';
import { Action, Field, Problem } from '@/components/feature-ui';
import { closeMatch, listMatches, listMessagePage, sendMessage, type MessagePage } from '@/features/api';
import { catchupId } from '@/features/catchup-id';
import { mergeMessagePages, prependMessages } from '@/features/message-timeline';
import { listMatchPlans, listPlanHistory } from '@/features/plans';
import { useMatchFeed } from '@/features/use-match-feed';

const replyLimit = 1000;

const messageTime = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useAccountColors();
  const id = catchupId(params.id);
  if (!id) {
    return <AccountPage><Text style={{ color: colors.text }}>This conversation is unavailable.</Text></AccountPage>;
  }
  return <Chat key={id} id={id} />;
}

function Chat({ id }: { id: string }) {
  const colors = useAccountColors();
  const userId = useSession().session?.user.id;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [draft, setDraft] = useState('');
  const submitting = useRef(false);
  const attempt = useRef<{ body: string; requestId: string } | undefined>(undefined);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const loading = useRef(false);
  const [loaded, setLoaded] = useState<MessagePage>();
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState('');

  const load = useCallback(async () => {
    const [matches, messages, plans, history] = await Promise.all([listMatches(), listMessagePage(id), listMatchPlans(id), listPlanHistory(id)]);
    return { match: matches.find((entry) => entry.id === id), messages, plans, history };
  }, [id]);
  const { data, error, reload } = useMatchFeed('catch-up-' + id, id, load, true);

  const timeline = data ? mergeMessagePages(loaded, data.messages) : undefined;

  async function loadOlder() {
    const cursor = timeline?.messages[0];
    if (!timeline?.hasMore || !cursor || loading.current) return;

    loading.current = true;
    setOlderBusy(true);
    setOlderError('');
    try {
      const previous = await listMessagePage(id, cursor);
      setLoaded(prependMessages(previous, timeline.messages));
    } catch {
      setOlderError('Could not load older replies. Try again.');
    } finally {
      loading.current = false;
      setOlderBusy(false);
    }
  }

  async function update(close: boolean) {
    const body = draft.trim();
    if (submitting.current || !data?.match || data.match.closed_at || (!close && !body)) return;
    submitting.current = true;
    setBusy(true);
    setProblem('');
    try {
      if (close) {
        await closeMatch(id);
        setConfirmClose(false);
      } else {
        if (attempt.current?.body !== body) attempt.current = { body, requestId: randomUUID() };
        await sendMessage(id, body, attempt.current.requestId);
        attempt.current = undefined;
        setDraft('');
      }
      reload();
    } catch {
      setProblem(close ? 'Could not mark the plan as made.' : 'Could not send your message. Try again.');
      reload();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const match = data?.match;
  return (
    <AccountPage scrollRef={scroll}>
      <Link href="/matches" replace style={[accountStyles.link, { color: colors.secondary }]}>Catch-ups</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {match?.display_name ?? 'Catch-up'}
      </Text>
      {!data && !error && <Text style={{ color: colors.secondary }}>Opening conversation…</Text>}
      {data && !match && <Problem message="This conversation is unavailable." />}
      {match && <>
        <ChatPlan matchId={id} plans={data.plans} history={data.history} userId={userId} closed={!!match.closed_at} stale={error} reload={reload} />
        {!match.closed_at && !!timeline?.messages.length && (
          <Action title="Jump to reply" onPress={() => scroll.current?.scrollToEnd({ animated: false })} />
        )}
        {timeline?.hasMore && (
          <Action title={olderBusy ? 'Loading older replies' : 'Load older replies'}
            disabled={olderBusy} onPress={loadOlder} />
        )}
        {olderError ? <Problem message={olderError} /> : null}
        {timeline?.messages.map((message) => {
          const sender = !message.sender_id ? 'Tether' : message.sender_id === userId ? 'You' : match.display_name;
          return (
            <View key={message.id} style={[styles.message, { borderColor: colors.border }]}>
              <View style={styles.messageHeader}>
                <Text style={{ color: colors.secondary, fontWeight: '600' }}>{sender}</Text>
                <Text style={{ color: colors.secondary }}>{messageTime.format(new Date(message.created_at))}</Text>
              </View>
              <Text selectable style={[accountStyles.copy, { color: colors.text }]}>{message.body}</Text>
            </View>
          );
        })}
        {match.closed_at ? <Text style={{ color: colors.secondary }}>{match.closed_reason || data.plans.length > 0 ? 'This chat is closed.' : 'Plan made.'}</Text> : <>
          <Field accessibilityLabel="Message" placeholder="Suggest a time or send a reply"
            maxLength={replyLimit} editable={!busy} value={draft} onChangeText={setDraft} multiline />
          {draft.length >= replyLimit - 100 && (
            <Text style={{ color: colors.secondary }}>{replyLimit - draft.length} characters left</Text>
          )}
          {problem ? <Problem message={problem} /> : null}
          <Action title="Send reply" onPress={() => void update(false)} disabled={busy || !draft.trim()} />
          {confirmClose ? (
            <>
              <Text style={{ color: colors.secondary }}>This closes the chat to new replies for both friends.</Text>
              <Action title="Confirm plan was made" onPress={() => void update(true)} disabled={busy} />
              <Action title="Keep chat open" onPress={() => setConfirmClose(false)} disabled={busy} />
            </>
          ) : (
            <Action title="Mark plan as made" onPress={() => setConfirmClose(true)} disabled={busy} />
          )}
        </>}
      </>}
      {(!match || match.closed_at) && problem ? <Problem message={problem} /> : null}
      {error ? <Problem message="Could not refresh this conversation." /> : null}
      {error && <Action title="Try again" onPress={reload} />}
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  messageHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  message: { borderWidth: 1, borderRadius: 10, gap: 4, padding: 12 },
});
