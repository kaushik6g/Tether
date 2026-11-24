import { Pressable, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

import { accountStyles, useAccountColors } from '@/components/account-ui';

export function Action({ title, onPress, disabled = false }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useAccountColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[accountStyles.button, styles.action, { backgroundColor: colors.button, opacity: disabled ? 0.55 : 1 }]}
    >
      <Text style={[accountStyles.buttonText, { color: colors.buttonText }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ style, ...props }: TextInputProps) {
  const colors = useAccountColors();
  return (
    <TextInput
      placeholderTextColor={colors.secondary}
      {...props}
      style={[styles.field, { borderColor: colors.border, color: colors.text }, style]}
    />
  );
}

export function Problem({ message }: { message: string }) {
  const colors = useAccountColors();
  return <Text accessibilityRole="alert" style={{ color: colors.error }}>{message}</Text>;
}

const styles = StyleSheet.create({
  action: { paddingHorizontal: 16 },
  field: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
});
