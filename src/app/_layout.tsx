import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider } from '@/auth/session';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
