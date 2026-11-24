import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { supabase } from '@/lib/supabase';

export default function CircleScreen() {
  const colors = useAccountColors();
  const { session } = useSession();
  const requestInFlight = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    if (!supabase || requestInFlight.current) return;
    requestInFlight.current = true;
    setSigningOut(true);
    setError('');
    try {
      const { error: failure } = await supabase.auth.signOut({ scope: 'local' });
      if (failure) setError('Could not sign out. Try again.');
    } catch {
      setError('Could not sign out. Try again.');
    } finally {
      requestInFlight.current = false;
      setSigningOut(false);
    }
  }

  return (
    <AccountPage>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        Your circle
      </Text>
      {session?.user.email ? (
        <Text style={[accountStyles.copy, { color: colors.secondary }]}>{session.user.email}</Text>
      ) : null}
      <Text style={[accountStyles.copy, { color: colors.text }]}>Your circle is empty.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: signingOut, disabled: signingOut }}
        disabled={signingOut}
        onPress={signOut}
        style={[accountStyles.button, { backgroundColor: colors.button, opacity: signingOut ? 0.55 : 1 }]}
      >
        <Text style={[accountStyles.buttonText, { color: colors.buttonText }]}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
    </AccountPage>
  );
}
