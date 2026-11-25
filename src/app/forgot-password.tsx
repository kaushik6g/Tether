import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { inviteToken } from '@/features/invites';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const colors = useAccountColors();
  const { invite: candidate } = useLocalSearchParams<{ invite?: string }>();
  const invite = typeof candidate === 'string' ? inviteToken(candidate) : null;
  const sending = useRef(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [notice, setNotice] = useState(false);
  const [problem, setProblem] = useState('');

  async function request() {
    if (sending.current || !supabase) return;
    setNotice(false);
    setProblem('');
    sending.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error && (!error.status || error.status === 429 || error.status >= 500)) {
        setProblem('Could not send a code right now. Try again later.');
      } else {
        setNotice(true);
      }
    } catch {
      setProblem('Could not reach Tether. Try again.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      <Link href={{ pathname: '/sign-in', params: invite ? { invite } : {} }} replace style={[accountStyles.link, { color: colors.text }]}>Back to sign in</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Reset your password</Text>
      <Field accessibilityLabel="Account email" placeholder="Account email" keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} editable={!busy} value={email} onChangeText={setEmail} />
      <Action title={busy ? 'Requesting code' : 'Email a reset code'} disabled={!supabase || busy || !email.trim()} onPress={request} />
      <Action title="I have a reset code" disabled={busy || !supabase || !email.trim()}
        onPress={() => setResetEmail(email.trim())} />
      {resetEmail && <ResetPasswordForm key={resetEmail} email={resetEmail} />}
      {notice && <Text accessibilityRole="alert" style={{ color: colors.text }}>If an account exists for that email, you’ll receive a reset code.</Text>}
      {problem ? <Problem message={problem} /> : null}
    </AccountPage>
  );
}
