import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { isAccountEmail } from '@/auth/email';
import { rememberInvite } from '@/auth/pending-invite';
import { inviteToken } from '@/features/invites';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { supabase } from '@/lib/supabase';

export function CredentialsForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const colors = useAccountColors();
  const params = useLocalSearchParams<{ invite?: string }>();
  const invite = typeof params.invite === 'string' ? inviteToken(params.invite) : null;
  const create = mode === 'sign-up';
  const title = create ? 'Create account' : 'Sign in';
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const requestInFlight = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit() {
    if (!supabase || requestInFlight.current) return;
    const address = email.trim();
    setError('');
    setNotice('');

    if (!isAccountEmail(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    requestInFlight.current = true;
    setSubmitting(true);
    try {
      if (invite) await rememberInvite(invite, address);
      const credentials = { email: address, password };
      if (create) {
        const { data, error: failure } = await supabase.auth.signUp(credentials);
        if (failure) setError(failure.message);
        else if (!data.session) {
          setNotice('Check your email for a confirmation link, then return here to sign in.');
          setPassword('');
        }
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword(credentials);
        if (failure) setError(failure.message);
      }
    } catch {
      setError('Could not reach Tether. Check your connection and try again.');
    } finally {
      requestInFlight.current = false;
      setSubmitting(false);
    }
  }

  const disabled = submitting || !supabase;
  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text }];

  return (
    <AccountPage>
      <Link href="/" style={[accountStyles.link, { color: colors.secondary }]}>Tether</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {title}
      </Text>
      <View style={styles.field}>
        <Text style={{ color: colors.text }}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!submitting}
          keyboardType="email-address"
          onChangeText={setEmail}
          onSubmitEditing={() => passwordInput.current?.focus()}
          returnKeyType="next"
          style={inputStyle}
          value={email}
        />
      </View>
      <View style={styles.field}>
        <Text style={{ color: colors.text }}>Password</Text>
        <TextInput
          ref={passwordInput}
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete={create ? 'new-password' : 'current-password'}
          autoCorrect={false}
          editable={!submitting}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          returnKeyType="go"
          secureTextEntry
          style={inputStyle}
          value={password}
        />
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
      {notice ? <Text accessibilityRole="alert" style={{ color: colors.secondary }}>{notice}</Text> : null}
      {!create && <Link href={{ pathname: '/forgot-password', params: invite ? { invite } : {} }} style={[accountStyles.link, { color: colors.text }]}>Forgot password?</Link>}
      {!supabase && <Text style={{ color: colors.secondary }}>Account access is unavailable.</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: submitting }}
        disabled={disabled}
        onPress={submit}
        style={[accountStyles.button, { backgroundColor: colors.button, opacity: disabled ? 0.55 : 1 }]}
      >
        <Text style={[accountStyles.buttonText, { color: colors.buttonText }]}>
          {submitting ? 'Please wait…' : title}
        </Text>
      </Pressable>
      <Link
        href={{ pathname: create ? '/sign-in' : '/sign-up', params: invite ? { invite } : {} }}
        replace
        style={[accountStyles.link, { color: colors.text }]}
      >
        {create ? 'Sign in to an existing account' : 'Create an account'}
      </Link>
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
});
