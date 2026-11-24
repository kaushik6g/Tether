import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { deleteMyAccount } from '@/features/api';
import { supabase } from '@/lib/supabase';

export default function DeleteAccountScreen() {
  const colors = useAccountColors();
  const { session } = useSession();
  const deleting = useRef(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState('');

  async function clearSession() {
    const result = await supabase?.auth.signOut({ scope: 'local' });
    if (!result || result.error) {
      setError('Your account was deleted. Try clearing the session again.');
    }
  }

  async function removeAccount() {
    const user = session?.user;
    if (!supabase || !user?.email || !password || deleting.current || deleted) return;

    deleting.current = true;
    setBusy(true);
    setError('');

    try {
      const { data, error: failure } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (failure || data.user?.id !== user.id || !data.session) {
        setError('Could not verify your password. Check it and try again.');
        return;
      }

      setPassword('');
      await deleteMyAccount();
      setDeleted(true);

      try {
        await clearSession();
      } catch {
        setError('Your account was deleted. Try clearing the session again.');
      }
    } catch {
      setError('Could not delete your account. Try again.');
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      {!deleted && <Link href="/privacy" replace style={[accountStyles.link, { color: colors.secondary }]}>Privacy</Link>}
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {deleted ? 'Account deleted' : 'Delete account'}
      </Text>
      {deleted ? (
        <Action title="Clear session" disabled={busy} onPress={() => {
          void clearSession().catch(() => setError('Could not clear the session. Try again.'));
        }} />
      ) : (
        <>
          <Text style={[accountStyles.copy, { color: colors.secondary }]}>
            This permanently deletes your profile, circle connections, invitations, and shared catch-up chats.
          </Text>
          <Text style={{ color: colors.text }}>Enter your current password to confirm.</Text>
          <Field accessibilityLabel="Current password" placeholder="Current password" secureTextEntry
            autoComplete="current-password" autoCapitalize="none" autoCorrect={false}
            value={password} editable={!busy} onChangeText={setPassword} />
          <Action title={busy ? 'Deleting account' : 'Permanently delete my account'}
            disabled={busy || !password || !session?.user.email} onPress={removeAccount} />
        </>
      )}
      {error ? <Problem message={error} /> : null}
    </AccountPage>
  );
}
