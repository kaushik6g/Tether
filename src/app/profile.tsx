import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { profileName, saveProfile } from '@/features/api';

export default function ProfileScreen() {
  const colors = useAccountColors();
  const userId = useSession().session?.user.id;
  const [name, setName] = useState('');
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
      if (active) setError('Could not load your profile. Reopen this screen to try again.');
    });
    return () => { active = false; };
  }, [userId]);

  async function save() {
    if (!userId || !ready || saving || !name.trim()) return;
    setError('');
    setSaving(true);
    try {
      await saveProfile(userId, name);
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
      <Link href="/circle" replace style={[accountStyles.link, { color: colors.secondary }]}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Your name</Text>
      <Text style={[accountStyles.copy, { color: colors.secondary }]}>Friends see this name on your invites and in their circles.</Text>
      <Field accessibilityLabel="Display name" placeholder="Display name" maxLength={60}
        value={name} editable={ready && !saving} onChangeText={(value) => { setName(value); setSaved(false); }} />
      <Action title={saving ? 'Saving…' : 'Save name'} disabled={!ready || !name.trim() || saving} onPress={save} />
      {saved && <Text accessibilityRole="alert" style={{ color: colors.text }}>Name saved.</Text>}
      {error ? <Problem message={error} /> : null}
    </AccountPage>
  );
}
