import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { createInvite, errorMessage, listActiveInvites, profileName, revokeInvite, type ActiveInvite } from '@/features/api';
import { inviteLink, sharedInviteToken } from '@/features/invites';

const expiryTime = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

export default function InvitationsScreen() {
  const colors = useAccountColors();
  const router = useRouter();
  const userId = useSession().session?.user.id;
  const [profile, setProfile] = useState<{ userId: string; named: boolean }>();
  const needsName = profile?.userId === userId && profile?.named === false;
  const [input, setInput] = useState('');
  const [invites, setInvites] = useState<ActiveInvite[]>();
  const [confirmRevoke, setConfirmRevoke] = useState('');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const reload = useRef<() => void>(() => {});
  const saving = useRef(false);
  const mutation = useRef(0);
  const link = selected ? inviteLink(selected) : null;
  const shareMessage = link
    ? 'I’d like to add you to my Tether circle. ' + link
    : 'I’d like to add you to my Tether circle. Enter this in Invitations: ' + selected;

  useFocusEffect(useCallback(() => {
    let sequence = 0;
    let active = true;
    function load() {
      const current = ++sequence;
      const revision = mutation.current;
      setRefreshing(true);
      if (userId) void profileName(userId).then((name) => {
        if (active && current === sequence) setProfile({ userId, named: !!name });
      }).catch(() => {});
      void listActiveInvites().then((items) => {
        if (!active || current !== sequence || revision !== mutation.current) return;
        setInvites(items);
        setListError(false);
        setSelected((token) => items.some((item) => item.token === token) ? token : '');
      }).catch(() => {
        if (active && current === sequence && revision === mutation.current) setListError(true);
      }).finally(() => {
        if (active && current === sequence) setRefreshing(false);
      });
    }
    reload.current = load;
    load();
    return () => { active = false; reload.current = () => {}; };
  }, [userId]));

  async function change(action: 'create' | 'revoke') {
    if (saving.current || (action === 'revoke' && !selected)) return;
    saving.current = true;
    mutation.current++;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (action === 'create') {
        setSelected(await createInvite());
      } else {
        const revoked = await revokeInvite(selected);
        setSelected('');
        setConfirmRevoke('');
        setStatus(revoked ? 'Invitation revoked.' : 'This invitation is no longer active.');
      }
    } catch (failure) {
      setError(errorMessage(failure, 'Could not update the invitation.'));
    } finally {
      reload.current();
      setBusy(false);
      saving.current = false;
    }
  }

  async function share() {
    const value = link ?? selected;
    setError('');
    setStatus('');
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(value);
        setStatus(link ? 'Invitation link copied.' : 'Invitation code copied.');
      } else {
        await Share.share({ message: shareMessage });
      }
    } catch {
      setError('Select the invitation text above to copy it.');
    }
  }

  function open() {
    const value = sharedInviteToken(input);
    if (!value) { setError('Enter one Tether invitation link, code, or share message.'); return; }
    router.push({ pathname: '/invite/[token]', params: { token: value } });
  }

  return (
    <AccountPage>
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Invitations</Text>
      <Text style={[accountStyles.copy, { color: colors.secondary }]}>Share each invitation with one friend. It expires after seven days.</Text>
      {needsName ? (
        <Link href={{ pathname: '/profile', params: { from: 'invitations' } }}
          style={[accountStyles.link, { color: colors.text }]}>Set your display name to create an invitation</Link>
      ) : <Action title="Create invitation" disabled={busy} onPress={() => void change('create')} />}
      <Text accessibilityRole="header" style={[accountStyles.copy, { color: colors.text }]}>Active invitations</Text>
      {invites === undefined && !listError && <Text style={{ color: colors.secondary }}>Loading invitations…</Text>}
      {invites?.length === 0 && !selected && <Text style={{ color: colors.secondary }}>You have no unused invitations.</Text>}
      {invites?.map((invite) => (
        <View key={invite.token} style={[styles.invite, { borderColor: colors.border }]}>
          <Text style={{ color: colors.secondary }}>
            Expires {expiryTime.format(new Date(invite.expires_at))}
          </Text>
          <Action title={'View invitation ending in ' + invite.token.slice(-4)}
            disabled={busy || selected === invite.token} onPress={() => { setSelected(invite.token); setConfirmRevoke(''); }} />
        </View>
      ))}
      {selected ? (
        <>
          <Text selectable accessibilityLabel={link ? 'Invitation link' : 'Invitation code'}
            style={[accountStyles.copy, { color: colors.text }]}>{link ?? selected}</Text>
          {Platform.OS !== 'web' && <Text style={{ color: colors.secondary }}>{shareMessage}</Text>}
          <Action title={Platform.OS === 'web' ? 'Copy invitation' : 'Share invitation'} disabled={busy} onPress={share} />
          {confirmRevoke === selected ? (
            <>
              <Text style={{ color: colors.secondary }}>After revoking this invitation, your friend will need a new link.</Text>
              <Action title="Confirm revocation" disabled={busy} onPress={() => void change('revoke')} />
              <Action title="Keep invitation" disabled={busy} onPress={() => setConfirmRevoke('')} />
            </>
          ) : (
            <Action title="Revoke invitation" disabled={busy} onPress={() => setConfirmRevoke(selected)} />
          )}
        </>
      ) : null}
      <Field accessibilityLabel="Invitation link or code" placeholder="Invitation link or code"
        value={input} onChangeText={setInput} autoCapitalize="none" autoCorrect={false} />
      <Action title="Open invitation" onPress={open} disabled={!input.trim()} />
      {status ? <Text accessibilityRole="alert" style={{ color: colors.secondary }}>{status}</Text> : null}
      {error ? <Problem message={error} /> : null}
      {listError && <Problem message="Could not load your invitations." />}
      <Action title={refreshing ? 'Refreshing invitations' : 'Refresh invitations'}
        disabled={refreshing || busy} onPress={() => reload.current()} />
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  invite: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
});
