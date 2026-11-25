import { Link } from 'expo-router';
import { Text } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { matchPushAvailable } from '@/features/match-push';

export default function SettingsScreen() {
  const colors = useAccountColors();
  const linkStyle = [accountStyles.link, { color: colors.text }];

  return (
    <AccountPage>
      <Link href="/circle" replace style={linkStyle}>Your circle</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>Settings</Text>
      <Link href="/profile" style={linkStyle}>Display name</Link>
      <Link href="/privacy" style={linkStyle}>Privacy</Link>
      {matchPushAvailable && <Link href="/notifications" style={linkStyle}>Match notifications</Link>}
    </AccountPage>
  );
}
