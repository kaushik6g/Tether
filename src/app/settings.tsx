import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { useAppearance, type Appearance } from '@/components/appearance';
import { Action, Problem } from '@/components/feature-ui';
import { supabase } from '@/lib/supabase';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { disableMatchPush, matchPushAvailable } from '@/features/match-push';

const appearanceLabels: Record<Appearance, string> = {
  system: 'Follow device setting',
  light: 'Light',
  dark: 'Dark',
};

export default function SettingsScreen() {
  const colors = useAccountColors();
  const linkStyle = [accountStyles.link, { color: colors.text }];

  const { preference, save } = useAppearance();
  const [appearanceBusy, setAppearanceBusy] = useState(false);
  const user = useSession().session?.user;
  const pending = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function selectAppearance(value: Appearance) {
    setAppearanceBusy(true);
    setError('');
    try {
      await save(value);
    } catch {
      setError('Could not save your appearance preference.');
    } finally {
      setAppearanceBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || !user || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await disableMatchPush(user.id);
      const { error: failure } = await supabase.auth.signOut({ scope: 'local' });
      if (failure) throw failure;
    } catch {
      setError('Could not sign out. Check your connection and try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      <Link href="/circle" replace style={linkStyle}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Settings</Text>
      {user?.email && <Text selectable style={[accountStyles.copy, { color: colors.secondary }]}>Signed in as {user.email}</Text>}
      <Link href={{ pathname: '/profile', params: { from: 'settings' } }} style={linkStyle}>Display name</Link>
      <Link href="/privacy" style={linkStyle}>Privacy</Link>
      {matchPushAvailable && <Link href="/notifications" style={linkStyle}>Match notifications</Link>}
      <Text accessibilityRole="header" style={[accountStyles.copy, { color: colors.text }]}>Appearance</Text>
      {(['system', 'light', 'dark'] as const).map((option) => (
        <Action key={option} title={appearanceLabels[option] + (option === preference ? ' (selected)' : '')}
          disabled={appearanceBusy || option === preference} onPress={() => selectAppearance(option)} />
      ))}
      {confirm ? (
        <>
          <Text style={{ color: colors.secondary }}>Sign out of Tether on this device?</Text>
          <Action title={busy ? 'Signing out' : 'Confirm sign-out'} disabled={busy} onPress={signOut} />
          <Action title="Stay signed in" disabled={busy} onPress={() => { setConfirm(false); setError(''); }} />
        </>
      ) : <Action title="Sign out" onPress={() => setConfirm(true)} />}
      {error ? <Problem message={error} /> : null}
    </AccountPage>
  );
}
