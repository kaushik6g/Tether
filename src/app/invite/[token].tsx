import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountUnavailable } from '@/components/account-unavailable';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { acceptInvite, errorMessage, previewInvite, profileName } from '@/features/api';
import { inviteAppLink, inviteToken } from '@/features/invites';
import { supabase } from '@/lib/supabase';

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
  const previewAgain = useRef(() => {});
  const [previewFailed, setPreviewFailed] = useState(false);
  const [inviter, setInviter] = useState<string | null | undefined>();
  const checkNameAgain = useRef(() => {});
  const [nameFailed, setNameFailed] = useState(false);
  const [profile, setProfile] = useState<{ userId: string; named: boolean }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const accepting = useRef(false);
  const named = profile && profile.userId === userId ? profile.named : undefined;

  useFocusEffect(useCallback(() => {
    if (!token || !supabase) return;
    let revision = 0;
    const load = () => {
      const current = ++revision;
      setInviter(undefined);
      setPreviewFailed(false);
      void previewInvite(token).then((name) => {
        if (current === revision) setInviter(name);
      }).catch(() => {
        if (current === revision) setPreviewFailed(true);
      });
    };
    previewAgain.current = load;
    load();
    return () => { revision++; previewAgain.current = () => {}; };
  }, [token]));

  useFocusEffect(useCallback(() => {
    if (!userId || !token) return;
    let revision = 0;
    const load = () => {
      const current = ++revision;
      setNameFailed(false);
      void profileName(userId).then((name) => {
        if (current === revision) setProfile({ userId, named: !!name });
      }).catch(() => {
        if (current === revision) setNameFailed(true);
      });
    };
    checkNameAgain.current = load;
    load();
    return () => { revision++; checkNameAgain.current = () => {}; };
  }, [userId, token]));

  async function accept() {
    if (!token || !named || nameFailed || accepting.current) return;
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
      {token && <AccountUnavailable />}
      {supabase && token && inviter === undefined && !previewFailed ? <Text style={{ color: colors.secondary }}>Opening invitation.</Text> : null}
      {!token || inviter === null ? <Text style={[accountStyles.copy, { color: colors.secondary }]}>This invitation is invalid, expired, or already used.</Text> : null}
      {inviter && token && <>
        <Text style={[accountStyles.copy, { color: colors.secondary }]}>Accept to add each other to your private circles.</Text>
        {Platform.OS === 'web' && (
          <Link href={inviteAppLink(token)} style={[accountStyles.link, { color: colors.secondary }]}>
            Open in the Tether app
          </Link>
        )}
        {session ? (
          named === false ? (
            <>
              <Text style={{ color: colors.secondary }}>Set a display name before joining this circle.</Text>
              <Link href={{ pathname: '/profile', params: { invite: token } }}
                style={[accountStyles.link, { color: colors.text }]}>Set display name</Link>
            </>
          ) : named && !nameFailed ? (
            <Action title={busy ? 'Accepting' : 'Add to my circle'} disabled={busy} onPress={accept} />
          ) : nameFailed ? null : (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.secondary }}>Checking your profile…</Text>
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
      {previewFailed && <>
        <Problem message="Could not load the invitation." />
        <Action title="Retry invitation" onPress={() => previewAgain.current()} />
      </>}
      {userId && nameFailed && <>
        <Problem message="Could not check your display name." />
        <Action title="Retry display-name check" onPress={() => checkNameAgain.current()} />
      </>}
      {error ? <Problem message={error} /> : null}
      <Link href={session ? '/circle' : '/'} replace style={[accountStyles.link, { color: colors.secondary }]}>Back to Tether</Link>
    </AccountPage>
  );
}
