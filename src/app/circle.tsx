import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { listCircle, listMatches, profileName, tapFriend, type Friend } from '@/features/api';
import { useMatchFeed } from '@/features/use-match-feed';
import { disableMatchPush, matchPushAvailable } from '@/features/match-push';
import { supabase } from '@/lib/supabase';

export default function CircleScreen() {
  const colors = useAccountColors();
  const router = useRouter();
  const { data: catchUps } = useMatchFeed('circle-catch-ups', undefined, listMatches);
  const openMatch = catchUps?.find((match) => !match.closed_at);
  const userId = useSession().session?.user.id;
  const pendingTaps = useRef(new Set<string>());
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const retry = useRef(() => {});
  const [signingOut, setSigningOut] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let attempt = 0;
    function load() {
      if (!userId) return;
      const current = ++attempt;
      setError('');
      void Promise.all([listCircle(), profileName(userId)]).then(([members, displayName]) => {
        if (attempt === current) { setFriends(members); setName(displayName); }
      }).catch(() => {
        if (attempt === current) setError('Could not load your circle. Try again.');
      });
    }
    retry.current = load;
    load();
    return () => { attempt++; retry.current = () => {}; };
  }, [userId]));

  async function tap(friendId: string) {
    if (pendingTaps.current.has(friendId)) return;
    pendingTaps.current.add(friendId);
    setError('');
    try {
      const id = await tapFriend(friendId);
      if (id) router.push({ pathname: '/chat/[id]', params: { id } });
    } catch {
      setError('Could not save your tap. Try again.');
    } finally {
      pendingTaps.current.delete(friendId);
    }
  }

  async function signOut() {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    try {
      if (userId) await disableMatchPush(userId);
      const { error: failure } = await supabase.auth.signOut({ scope: 'local' });
      if (failure) setError('Could not sign out. Try again.');
    } catch {
      setError('Could not sign out. Try again.');
    } finally {
      setSigningOut(false);
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
      {matchPushAvailable && (
        <Link href="/notifications" style={[accountStyles.link, { color: colors.text }]}>Match notifications</Link>
      )}
      <Link href="/matches" style={[accountStyles.link, { color: colors.text }]}>Catch-ups</Link>
      {openMatch && (
        <Link
          href={{ pathname: '/chat/[id]', params: { id: openMatch.id } }}
          style={[accountStyles.link, { color: colors.text }]}
        >
          You and {openMatch.display_name} want to catch up.
        </Link>
      )}
      {friends === null && !error && <Text style={{ color: colors.secondary }}>Loading your circle…</Text>}
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
      {error && friends === null && <Action title="Try again" onPress={() => retry.current()} />}
      <Link href="/privacy" style={[accountStyles.link, { color: colors.text }]}>Privacy</Link>
      <Action title={signingOut ? 'Signing out…' : 'Sign out'} disabled={signingOut} onPress={signOut} />
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, paddingVertical: 6 },
  name: { flex: 1, fontSize: 18 },
  tap: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  heart: { fontSize: 30 },
});
