import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { createRecoveryClient } from '@/lib/supabase';

export function ResetPasswordForm({ email }: { email: string }) {
  const colors = useAccountColors();
  const client = useRef<ReturnType<typeof createRecoveryClient>>(null);
  const active = useRef(false);
  const submitting = useRef(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      void client.current?.auth.signOut({ scope: 'local' }).catch(() => {});
    };
  }, []);

  async function submit() {
    if (submitting.current) return;
    if (!password || password !== confirmation) {
      setProblem('Enter the same new password in both fields.');
      return;
    }

    const recovery = client.current ?? createRecoveryClient();
    if (!recovery) return;
    submitting.current = true;
    setBusy(true);
    setProblem('');
    try {
      if (!client.current) {
        const { data, error } = await recovery.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' });
        if (error || !data.session) {
          setProblem('This reset code could not be verified. Request a new code if it has expired.');
          return;
        }
        if (!active.current) {
          void recovery.auth.signOut({ scope: 'local' }).catch(() => {});
          return;
        }
        client.current = recovery;
        setVerified(true);
        setCode('');
      }

      const { error } = await recovery.auth.updateUser({ password });
      if (error) {
        setProblem(error.message);
        return;
      }
      setPassword('');
      setConfirmation('');
      setDone(true);
      client.current = null;
      void recovery.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch {
      setProblem('Could not update your password. Try again.');
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  if (done) return <Text accessibilityRole="alert" style={{ color: colors.text }}>Password updated. Go back to sign in.</Text>;

  return (
    <>
      <Text style={{ color: colors.text }}>{email}</Text>
      {!verified && <Field accessibilityLabel="Reset code" placeholder="Reset code" keyboardType="number-pad"
        autoComplete="one-time-code" maxLength={10} editable={!busy} value={code} onChangeText={setCode} />}
      <Field accessibilityLabel="New password" placeholder="New password" secureTextEntry autoComplete="new-password"
        autoCapitalize="none" autoCorrect={false} editable={!busy} value={password} onChangeText={setPassword} />
      <Field accessibilityLabel="Confirm new password" placeholder="Confirm new password" secureTextEntry
        autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy}
        value={confirmation} onChangeText={setConfirmation} />
      <Action title={busy ? 'Updating password' : 'Update password'} onPress={submit}
        disabled={busy || (!verified && !/^\d{6,10}$/.test(code.trim())) || !password || !confirmation} />
      {problem ? <Problem message={problem} /> : null}
    </>
  );
}
