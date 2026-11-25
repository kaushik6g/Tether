import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

const light = {
  background: '#f5f4eb', text: '#233127', secondary: '#4b5c4e', border: '#7b8a7e',
  button: '#233127', buttonText: '#ffffff', error: '#982820',
};

const dark = {
  background: '#181d18', text: '#edf0e7', secondary: '#b9c7b9', border: '#829082',
  button: '#d8e7d8', buttonText: '#181d18', error: '#ffb4a8',
};

export function useAccountColors() {
  return useColorScheme() === 'dark' ? dark : light;
}

export function AccountPage({ children }: PropsWithChildren) {
  const colors = useAccountColors();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const accountStyles = StyleSheet.create({
  title: { fontSize: 38, fontWeight: '700', letterSpacing: -1 },
  copy: { fontSize: 17, lineHeight: 26 },
  link: { fontSize: 16, fontWeight: '600', textDecorationLine: 'underline', paddingVertical: 12 },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, paddingVertical: 32,
  },
  column: { width: '100%', maxWidth: 460, gap: 16 },
});
