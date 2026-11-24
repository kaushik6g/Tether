import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator } from 'react-native';

import { SessionProvider, useSession } from '@/auth/session';
import { AccountPage, useAccountColors } from '@/components/account-ui';
import { InviteAfterAuth } from '@/components/invite-after-auth';
import { MatchNotificationListener } from '@/components/match-notification-listener';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <AccountRoutes />
    </SessionProvider>
  );
}

function AccountRoutes() {
  const { ready, session } = useSession();
  const colors = useAccountColors();

  if (!ready) {
    return (
      <AccountPage>
        <ActivityIndicator accessibilityLabel="Loading your account" color={colors.text} />
      </AccountPage>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="circle" />
          <Stack.Screen name="friend/[id]" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="invitations" />
          <Stack.Screen name="matches" />
          <Stack.Screen name="upcoming" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="plan/[id]" />
        </Stack.Protected>
        <Stack.Screen name="invite/[token]" />
      </Stack>
      <InviteAfterAuth />
      <MatchNotificationListener userId={session?.user.id} />
    </>
  );
}
