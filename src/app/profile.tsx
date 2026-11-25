import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { profileName, saveProfile } from '@/features/api';
import { inviteToken } from '@/features/invites';

export default function ProfileScreen() {
  const colors = useAccountColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string; from?: string }>();
  const invite = typeof params.invite === 'string' ? inviteToken(params.invite) : null;
  const fromSettings = params.from === 'settings';
  const userId = useSession().session?.user.id;
  const [name, setName] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void profileName(userId).then((value) => {
      if (active) { setName(value); setReady(true); }
    }).catch(() => {
      if (active) setError('Could not load your profile.');
    });
    return () => { active = false; };
  }, [userId, loadAttempt]);

  async function save() {
    if (!userId || !ready || saving || !name.trim()) return;
    setError('');
    setSaving(true);
    try {
      await saveProfile(userId, name);
      if (invite) {
        router.replace({ pathname: '/invite/[token]', params: { token: invite } });
        return;
      }
      setName(name.trim());
      setSaved(true);
    } catch {
      setError('Could not save your display name. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountPage>
      <Link
        href={invite ? { pathname: '/invite/[token]', params: { token: invite } } : fromSettings ? '/settings' : '/circle'}
        replace
        style={[accountStyles.link, { color: colors.secondary }]}
      >
        {invite ? 'Back to invitation' : fromSettings ? 'Settings' : 'Your circle'}
      </Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Your name</Text>
      <Text style={[accountStyles.copy, { color: colors.secondary }]}>Friends see this name on your invites and in their circles.</Text>
      <Field accessibilityLabel="Display name" placeholder="Display name" maxLength={60}
        value={name} editable={ready && !saving} onChangeText={(value) => { setName(value); setSaved(false); }} />
      <Action title={saving ? 'Saving…' : 'Save name'} disabled={!ready || !name.trim() || saving} onPress={save} />
      {saved && <Text accessibilityRole="alert" style={{ color: colors.text }}>Name saved.</Text>}
      {error ? <Problem message={error} /> : null}
      {!ready && error && <Action title="Retry loading profile" onPress={() => {
        setError('');
        setLoadAttempt((attempt) => attempt + 1);
      }} />}
    </AccountPage>
  );
}
