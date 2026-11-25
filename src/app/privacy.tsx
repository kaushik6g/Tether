import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { listBlockedFriends, unblockFriend, type Friend } from '@/features/api';

export default function PrivacyScreen() {
  const colors = useAccountColors();
  const updating = useRef(false);
  const reload = useRef<() => void>(() => {});
  const [blocked, setBlocked] = useState<Friend[]>();
  const [confirm, setConfirm] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    let generation = 0;
    function load() {
      const request = ++generation;
      setError('');
      void listBlockedFriends().then((friends) => {
        if (active && request === generation) setBlocked(friends);
      }).catch(() => {
        if (active && request === generation) setError('Could not load blocked people.');
      });
    }
    reload.current = load;
    load();
    return () => { active = false; reload.current = () => {}; };
  }, []));

  async function unblock(id: string) {
    if (updating.current) return;
    updating.current = true;
    setBusy(true);
    setError('');
    try {
      await unblockFriend(id);
      setConfirm(undefined);
      setBlocked((friends) => friends?.filter((friend) => friend.friend_id !== id));
      reload.current();
    } catch {
      setError('Could not unblock this person. Try again.');
    } finally {
      updating.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Privacy</Text>
      <Text accessibilityRole="header" style={[styles.section, { color: colors.text }]}>Blocked people</Text>
      {blocked === undefined && !error && <Text style={{ color: colors.secondary }}>Loading.</Text>}
      {blocked?.length === 0 && <Text style={{ color: colors.secondary }}>Your blocked list is empty.</Text>}
      {blocked?.length ? (
        <Text style={[accountStyles.copy, { color: colors.secondary }]}>
          After unblocking someone, you can reconnect through a new invitation.
        </Text>
      ) : null}
      {blocked?.map((friend) => (
        <View key={friend.friend_id} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[accountStyles.copy, { color: colors.text }]}>{friend.display_name}</Text>
          {confirm === friend.friend_id ? (
            <>
              <Action title={'Confirm unblocking ' + friend.display_name} disabled={busy} onPress={() => unblock(friend.friend_id)} />
              <Action title="Keep blocked" disabled={busy} onPress={() => setConfirm(undefined)} />
            </>
          ) : (
            <Action title={'Unblock ' + friend.display_name} disabled={busy} onPress={() => setConfirm(friend.friend_id)} />
          )}
        </View>
      ))}
      <Link href="/delete-account" style={[accountStyles.link, { color: colors.error }]}>Delete account</Link>
      {error ? <Problem message={error} /> : null}
      {error && !busy && <Action title="Reload blocked people" onPress={() => reload.current()} />}
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 22, fontWeight: '600' },
  row: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
});
