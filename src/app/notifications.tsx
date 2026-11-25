import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Problem } from '@/components/feature-ui';
import { disableMatchPush, enableMatchPush, matchPushAvailable, matchPushEnabled } from '@/features/match-push';

export default function NotificationsScreen() {
  const colors = useAccountColors();
  const userId = useSession().session?.user.id;
  const inFlight = useRef(false);
  const reload = useRef(() => {});
  const [enabled, setEnabled] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    if (!userId || !matchPushAvailable) return;
    let active = true;
    let attempt = 0;
    const load = () => {
      const currentAttempt = ++attempt;
      setError('');
      void matchPushEnabled(userId).then((current) => {
        if (active && currentAttempt === attempt) setEnabled(current);
      }).catch(() => {
        if (active && currentAttempt === attempt) setError('Could not read your notification setting.');
      });
    };
    reload.current = load;
    load();
    return () => { active = false; reload.current = () => {}; };
  }, [userId]));

  async function toggle() {
    if (!userId || inFlight.current || enabled === undefined) return;
    inFlight.current = true;
    setBusy(true);
    setError('');

    try {
      if (enabled) await disableMatchPush(userId);
      else await enableMatchPush(userId);
      setEnabled(!enabled);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update your notification setting.');
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <AccountPage>
      <Link href="/settings" replace style={[accountStyles.link, { color: colors.secondary }]}>Settings</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Match notifications</Text>
      <Text style={[accountStyles.copy, { color: colors.secondary }]}>
        Get an alert on this device when you and a friend both want to catch up.
      </Text>
      {matchPushAvailable ? (
        <Action title={enabled ? 'Turn off match alerts' : 'Turn on match alerts'}
          disabled={busy || enabled === undefined} onPress={toggle} />
      ) : (
        <Text style={{ color: colors.secondary }}>Match alerts are available on configured mobile builds.</Text>
      )}
      {error ? <Problem message={error} /> : null}
      {error && enabled === undefined && <Action title="Reload notification setting" onPress={() => reload.current()} />}
    </AccountPage>
  );
}
