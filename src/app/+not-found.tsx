import { Link } from 'expo-router';
import { Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';

export default function MissingPage() {
  const { session } = useSession();
  const colors = useAccountColors();
  return (
    <AccountPage>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        Page unavailable
      </Text>
      <Link href={session ? '/circle' : '/'} replace style={[accountStyles.link, { color: colors.text }]}>
        {session ? 'Return to your circle' : 'Return to Tether'}
      </Link>
    </AccountPage>
  );
}
