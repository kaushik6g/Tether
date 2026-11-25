import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { blockFriend, listCircle, removeFriend, type Friend } from '@/features/api';

type Choice = 'remove' | 'block';

export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ManageFriend key={id} id={id} />;
}

function ManageFriend({ id }: { id: string }) {
  const colors = useAccountColors();
  const router = useRouter();
  const saving = useRef(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [friend, setFriend] = useState<Friend | null>();
  const [choice, setChoice] = useState<Choice>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void listCircle().then((members) => {
      if (active) setFriend(members.find((member) => member.friend_id === id) ?? null);
    }).catch(() => {
      if (active) setError('Could not load this friend.');
    });
    return () => { active = false; };
  }, [id, loadAttempt]);

  async function confirm() {
    if (!friend || !choice || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (choice === 'block') await blockFriend(friend.friend_id);
      else await removeFriend(friend.friend_id);
      router.replace('/circle');
    } catch {
      setError('Could not update your circle. Try again.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {friend?.display_name ?? 'Circle member'}
      </Text>
      {friend === null && <Text style={{ color: colors.secondary }}>This connection is unavailable.</Text>}
      {friend === undefined && !error && <Text style={{ color: colors.secondary }}>Loading.</Text>}
      {friend && !choice && (
        <>
          <Action title="Remove from circle" onPress={() => setChoice('remove')} />
          <Action title="Block this person" onPress={() => setChoice('block')} />
        </>
      )}
      {friend && choice && (
        <>
          <Text style={[accountStyles.copy, { color: colors.text }]}>
            {choice === 'block'
              ? 'Blocking removes this connection, closes open chats, and prevents either of you from reconnecting by invitation.'
              : 'Removing this connection takes you out of each other’s circles and closes open chats.'}
          </Text>
          <Action title={choice === 'block' ? 'Confirm block' : 'Confirm removal'} disabled={busy} onPress={confirm} />
          <Action title="Cancel" disabled={busy} onPress={() => setChoice(undefined)} />
        </>
      )}
      {error ? <Problem message={error} /> : null}
      {friend === undefined && error && <Action title="Retry loading friend" onPress={() => {
        setError('');
        setLoadAttempt((attempt) => attempt + 1);
      }} />}
    </AccountPage>
  );
}
