import { Link } from 'expo-router';
import { Text } from 'react-native';

import { AccountUnavailable } from '@/components/account-unavailable';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';

export default function WelcomeScreen() {
  const colors = useAccountColors();

  return (
    <AccountPage>
      <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>Tether</Text>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        Make time for your friends.
      </Text>
      <Text style={[accountStyles.copy, { color: colors.secondary }]}>
        Tap to say you’d like to catch up. If your friend taps too, Tether opens a private chat
        with a plan you can both respond to.
      </Text>
      <AccountUnavailable />
      <Link href="/sign-up" style={[accountStyles.link, { color: colors.text }]}>Create an account</Link>
      <Link href="/sign-in" style={[accountStyles.link, { color: colors.text }]}>Sign in</Link>
    </AccountPage>
  );
}
