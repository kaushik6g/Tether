import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { acceptInvite, errorMessage, previewInvite, profileName } from '@/features/api';
import { inviteToken } from '@/features/invites';

export default function InviteScreen() {
  const params = useLocalSearchParams<{ token: string }>();
  const token = typeof params.token === 'string' ? inviteToken(params.token) : null;
  return <Invitation key={token ?? 'invalid'} token={token} />;
}

function Invitation({ token }: { token: string | null }) {
  const colors = useAccountColors();
  const { session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const [inviter, setInviter] = useState<string | null | undefined>();
  const [profile, setProfile] = useState<{ userId: string; named: boolean }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const accepting = useRef(false);
  const named = profile && profile.userId === userId ? profile.named : undefined;

  useEffect(() => {
    if (!token) return;
    let active = true;
    void previewInvite(token).then((name) => {
      if (active) setInviter(name);
    }).catch(() => {
      if (active) setError('Could not load the invitation. Reopen the link to try again.');
    });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!userId || !token) return;
    let active = true;
    void profileName(userId).then((name) => {
      if (active) setProfile({ userId, named: !!name });
    }).catch(() => {
      if (active) setError('Could not load your display name. Reopen the link to try again.');
    });
    return () => { active = false; };
  }, [userId, token]);

  async function accept() {
    if (!token || !named || accepting.current) return;
    accepting.current = true;
    setError('');
    setBusy(true);
    try {
      await acceptInvite(token);
      router.replace('/circle');
    } catch (error) {
      setError(errorMessage(error, 'Could not accept the invitation.'));
    } finally {
      accepting.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {inviter ? inviter + ' invited you to Tether' : 'Tether invitation'}
      </Text>
      {token && inviter === undefined && !error ? <Text style={{ color: colors.secondary }}>Opening invitation.</Text> : null}
      {!token || inviter === null ? <Text style={[accountStyles.copy, { color: colors.secondary }]}>This invitation is invalid, expired, or already used.</Text> : null}
      {inviter && token && <>
        <Text style={[accountStyles.copy, { color: colors.secondary }]}>Accept to add each other to your private circles.</Text>
        {session ? (
          named === false ? (
            <>
              <Text style={{ color: colors.secondary }}>Set a display name before joining this circle.</Text>
              <Link href={{ pathname: '/profile', params: { invite: token } }}
                style={[accountStyles.link, { color: colors.text }]}>Set display name</Link>
            </>
          ) : (
            <Action title={busy ? 'Accepting' : 'Add to my circle'} disabled={busy || !named} onPress={accept} />
          )
        ) : (
          <>
            <Text style={[accountStyles.copy, { color: colors.secondary }]}>Sign in or create an account to return to this invitation.</Text>
            <Link href={{ pathname: '/sign-in', params: { invite: token } }}
              style={[accountStyles.link, { color: colors.text }]}>Sign in</Link>
            <Link href={{ pathname: '/sign-up', params: { invite: token } }}
              style={[accountStyles.link, { color: colors.text }]}>Create an account</Link>
          </>
        )}
      </>}
      {error ? <Problem message={error} /> : null}
      <Link href={session ? '/circle' : '/'} replace style={[accountStyles.link, { color: colors.secondary }]}>Back to Tether</Link>
    </AccountPage>
  );
}
