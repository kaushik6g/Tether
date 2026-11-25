import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { listCircle, listMatches, profileName, tapFriend, type Friend } from '@/features/api';
import { useMatchFeed } from '@/features/use-match-feed';

export default function CircleScreen() {
  const colors = useAccountColors();
  const router = useRouter();
  const { data: catchUps } = useMatchFeed('circle-catch-ups', undefined, listMatches);
  const openMatch = catchUps?.find((match) => !match.closed_at);
  const userId = useSession().session?.user.id;
  const visit = useRef(0);
  const pendingTaps = useRef(new Set<string>());
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [name, setName] = useState('');
  const [circleFailed, setCircleFailed] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef(() => {});

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    visit.current++;
    let attempt = 0;
    function load() {
      if (!userId) return;
      const current = ++attempt;
      setCircleFailed(false);
      setProfileFailed(false);
      void listCircle().then((members) => {
        if (attempt === current) setFriends(members);
      }).catch(() => {
        if (attempt === current) setCircleFailed(true);
      });
      void profileName(userId).then((displayName) => {
        if (attempt === current) setName(displayName);
      }).catch(() => {
        if (attempt === current) setProfileFailed(true);
      });
    }
    retry.current = load;
    load();
    return () => { visit.current++; attempt++; retry.current = () => {}; };
  }, [userId]));

  async function tap(friendId: string) {
    if (pendingTaps.current.has(friendId)) return;
    const currentVisit = visit.current;
    pendingTaps.current.add(friendId);
    setError('');
    try {
      const id = await tapFriend(friendId);
      if (id && currentVisit === visit.current) router.push({ pathname: '/chat/[id]', params: { id } });
    } catch {
      if (currentVisit === visit.current) setError('Could not save your tap. Try again.');
    } finally {
      pendingTaps.current.delete(friendId);
    }
  }

  const filter = query.trim().toLocaleLowerCase();
  const visible = friends?.filter((friend) => friend.display_name.toLocaleLowerCase().includes(filter));

  return (
    <AccountPage>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Your circle</Text>
      <Link href="/profile" style={[accountStyles.link, { color: colors.text }]}>
        {name ? 'Edit display name' : 'Set your display name'}
      </Link>
      <Link href="/invitations" style={[accountStyles.link, { color: colors.text }]}>Invitations</Link>
      <Link href="/matches" style={[accountStyles.link, { color: colors.text }]}>Catch-ups</Link>
      {openMatch && (
        <Link
          href={{ pathname: '/chat/[id]', params: { id: openMatch.id } }}
          style={[accountStyles.link, { color: colors.text }]}
        >
          You and {openMatch.display_name} want to catch up.
        </Link>
      )}
      {friends === null && !circleFailed && <Text style={{ color: colors.secondary }}>Loading your circle…</Text>}
      {friends?.length === 0 && <Text style={[accountStyles.copy, { color: colors.secondary }]}>Invite a friend to start your circle.</Text>}
      {!!friends?.length && <Field accessibilityLabel="Find a friend in your circle" placeholder="Find a friend"
        value={query} onChangeText={setQuery} autoCorrect={false} />}
      {!!friends?.length && visible?.length === 0 && <Text style={{ color: colors.secondary }}>No names match your search.</Text>}
      {visible?.map((friend) => (
        <View key={friend.friend_id} style={[styles.row, { borderColor: colors.border }]}>
          <Link href={{ pathname: '/friend/[id]', params: { id: friend.friend_id } }}
            accessibilityLabel={'Manage ' + friend.display_name}
            style={[styles.name, { color: colors.text }]}>{friend.display_name}</Link>
          <Pressable accessibilityRole="button" accessibilityLabel={'Catch up with ' + friend.display_name}
            onPress={() => void tap(friend.friend_id)} style={styles.tap}>
            <Text style={[styles.heart, { color: colors.text }]}>♡</Text>
          </Pressable>
        </View>
      ))}
      {error ? <Problem message={error} /> : null}
      {circleFailed && <Problem message="Could not refresh your circle." />}
      {profileFailed && <Problem message="Could not load your display name." />}
      {(circleFailed || profileFailed) && <Action title="Retry loading circle" onPress={() => retry.current()} />}
      <Link href="/settings" style={[accountStyles.link, { color: colors.text }]}>Settings</Link>
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, paddingVertical: 6 },
  name: { flex: 1, fontSize: 18 },
  tap: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  heart: { fontSize: 30 },
});
