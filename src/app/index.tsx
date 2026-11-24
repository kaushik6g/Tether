import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const dark = useColorScheme() === 'dark';
  const background = dark ? '#181d18' : '#f5f4eb';
  const foreground = dark ? '#edf0e7' : '#233127';
  const secondary = dark ? '#b9c7b9' : '#4b5c4e';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introduction}>
          <Text style={[styles.brand, { color: secondary }]}>Tether</Text>
          <Text accessibilityRole="header" style={[styles.heading, { color: foreground }]}>
            Make time for your friends.
          </Text>
          <Text style={[styles.description, { color: secondary }]}>
            Tap to say you’d like to catch up. If your friend taps too, Tether opens a private chat
            with a plan you can both respond to.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  introduction: { width: '100%', maxWidth: 460, gap: 20 },
  brand: { fontSize: 16, fontWeight: '600' },
  heading: { fontSize: 44, fontWeight: '700', letterSpacing: -1.5 },
  description: { fontSize: 18, lineHeight: 28 },
});
