import { StyleSheet, TextInput } from 'react-native';

import { colors, fontSize, radius, space, TOUCH_TARGET } from '@/theme';

/** Longest delivery note accepted. Longer text is cut at this length while typing. */
export const DELIVERY_NOTE_MAX_LENGTH = 140;

interface DeliveryNoteFieldProps {
  value: string;
  onChangeText: (text: string) => void;
}

/** Optional free text for the driver or the shop, sent with the order. */
export function DeliveryNoteField({ value, onChangeText }: DeliveryNoteFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Delivery note (optional)"
      placeholderTextColor={colors.inkFaint}
      accessibilityLabel="Delivery note"
      accessibilityHint="Optional. Sent with the order."
      maxLength={DELIVERY_NOTE_MAX_LENGTH}
      returnKeyType="done"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: space.md,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: fontSize.body,
  },
});
