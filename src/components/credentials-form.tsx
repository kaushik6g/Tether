import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { signInProblem, signUpProblem } from '@/auth/account-errors';
import { isAccountEmail } from '@/auth/email';
import { rememberInvite } from '@/auth/pending-invite';
import { minimumSignupAge, normalizeBirthDate, signupAgeProblem } from '@/auth/signup-age';
import { inviteToken } from '@/features/invites';
import { AccountUnavailable } from '@/components/account-unavailable';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { supabase } from '@/lib/supabase';

export function CredentialsForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const colors = useAccountColors();
  const params = useLocalSearchParams<{ invite?: string }>();
  const invite = typeof params.invite === 'string' ? inviteToken(params.invite) : null;
  const create = mode === 'sign-up';
  const title = create ? 'Create account' : 'Sign in';
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const birthdayInput = useRef<ComponentRef<typeof TextInput>>(null);
  const requestInFlight = useRef(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');

  async function submit() {
    if (!supabase || requestInFlight.current || confirmationEmail) return;
    const address = email.trim();
    setError('');
    setConfirmationEmail('');

    if (!isAccountEmail(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    if (create) {
      const ageProblem = signupAgeProblem(dateOfBirth);
      if (ageProblem) {
        setError(ageProblem);
        birthdayInput.current?.focus();
        return;
      }
    }

    requestInFlight.current = true;
    setSubmitting(true);
    try {
      if (create) {
        // Only send a birth date once the server can move it into private storage.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const { data: ready, error: setupError, status } = await Promise.resolve(
          supabase.rpc('tether_birth_date_signup_ready').abortSignal(controller.signal)
        ).finally(() => clearTimeout(timeout));
        if (setupError || ready !== true) {
          if (status === 0 || controller.signal.aborted) {
            setError('Could not reach Tether. Check your connection and try creating your account again.');
          } else if (setupError?.code === 'PGRST202' || status === 401 || status === 403) {
            setError('Signup needs attention from the Tether administrator. Your details have not been submitted.');
          } else {
            setError('Account creation is temporarily unavailable. Try again later.');
          }
          return;
        }
      }
      if (invite) await rememberInvite(invite, address);
      const credentials = { email: address, password };
      if (create) {
        const { data, error: failure } = await supabase.auth.signUp({
          ...credentials,
          options: { data: { tether_date_of_birth: normalizeBirthDate(dateOfBirth) } },
        });
        if (failure) setError(signUpProblem(failure));
        else if (!data.session) {
          setConfirmationEmail(address);
          setPassword('');
          setDateOfBirth('');
          setShowPassword(false);
        }
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword(credentials);
        if (failure) setError(signInProblem(failure));
      }
    } catch {
      setError('Could not reach Tether. Check your connection and try again.');
    } finally {
      requestInFlight.current = false;
      setSubmitting(false);
    }
  }

  const disabled = submitting || !supabase || !!confirmationEmail;
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
          onChangeText={(value) => { setEmail(value); setConfirmationEmail(''); }}
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
          onSubmitEditing={create ? () => birthdayInput.current?.focus() : submit}
          returnKeyType={create ? 'next' : 'go'}
          secureTextEntry={!showPassword}
          style={inputStyle}
          value={password}
        />
      </View>
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => setShowPassword((visible) => !visible)}>
        <Text style={[accountStyles.link, { color: colors.text }]}>{showPassword ? 'Hide password' : 'Show password'}</Text>
      </Pressable>
      {create && !confirmationEmail && (
        <View style={styles.field}>
          <Text style={{ color: colors.text }}>Date of birth</Text>
          <TextInput
            ref={birthdayInput}
            accessibilityLabel="Date of birth, DD-MM-YYYY"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
            maxLength={10}
            onChangeText={setDateOfBirth}
            onSubmitEditing={submit}
            placeholder="DD-MM-YYYY"
            placeholderTextColor={colors.secondary}
            returnKeyType="go"
            style={inputStyle}
            value={dateOfBirth}
          />
          <Text style={{ color: colors.secondary }}>
            You must be {minimumSignupAge} or older. Tether saves your date of birth privately to check your age.
          </Text>
        </View>
      )}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
      {confirmationEmail ? <Text accessibilityRole="alert" style={{ color: colors.secondary }}>
        Check {confirmationEmail} for a confirmation link, then sign in.
      </Text> : null}
      {!create && <Link href={{ pathname: '/forgot-password', params: invite ? { invite } : {} }} style={[accountStyles.link, { color: colors.text }]}>Forgot password?</Link>}
      <AccountUnavailable />
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
