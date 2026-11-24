import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, Text } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { createInvite, errorMessage } from '@/features/api';
import { inviteLink, inviteToken } from '@/features/invites';

export default function InvitationsScreen() {
  const colors = useAccountColors();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const link = token ? inviteLink(token) : null;

  async function create() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setToken(await createInvite());
    } catch (error) {
      setError(errorMessage(error, 'Could not create an invitation.'));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      await Share.share({ message: link
        ? 'I’d like to add you to my Tether circle. ' + link
        : 'I’d like to add you to my Tether circle. Enter this in Invitations: ' + token });
    } catch {
      setError('Could not open sharing. You can copy the invitation above.');
    }
  }

  function open() {
    const value = inviteToken(input);
    if (!value) { setError('Enter a Tether invitation link or code.'); return; }
    setError('');
    router.push({ pathname: '/invite/[token]', params: { token: value } });
  }

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Invitations</Text>
      <Text style={[accountStyles.copy, { color: colors.secondary }]}>Share an invitation with one friend. It expires after seven days.</Text>
      <Action title={busy ? 'Creating…' : token ? 'Create another invitation' : 'Create invitation'} disabled={busy} onPress={create} />
      {token ? (
        <>
          <Text selectable accessibilityLabel={link ? 'Invitation link' : 'Invitation code'}
            style={[accountStyles.copy, { color: colors.text }]}>{link ?? token}</Text>
          {Platform.OS !== 'web' && <Action title="Share invitation" onPress={share} />}
        </>
      ) : null}
      <Field accessibilityLabel="Invitation link or code" placeholder="Invitation link or code"
        value={input} onChangeText={setInput} autoCapitalize="none" autoCorrect={false} />
      <Action title="Open invitation" onPress={open} disabled={!input.trim()} />
      {error ? <Problem message={error} /> : null}
    </AccountPage>
  );
}
