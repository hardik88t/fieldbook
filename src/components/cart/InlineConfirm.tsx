import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

interface InlineConfirmProps {
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'accent';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A two-step confirmation rendered in place, instead of an Alert. The destructive action only
 * runs when the user presses the confirm button here.
 */
export function InlineConfirm({
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: InlineConfirmProps) {
  const confirmBackground = tone === 'danger' ? colors.dangerInk : colors.accent;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onCancel}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{cancelLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => {
            if (!busy) onConfirm();
          }}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: confirmBackground },
            pressed && styles.primaryPressed,
            busy && styles.disabled,
          ]}
        >
          <Text style={styles.primaryText}>{busy ? 'Working…' : confirmLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.surface,
    gap: space.md,
  },
  message: { ...textStyles.body, color: colors.inkStrong },
  actions: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
  secondary: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...textStyles.buttonSmall, color: colors.inkStrong },
  primary: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...textStyles.buttonSmall, color: colors.onAccent },
  pressed: { backgroundColor: colors.surfaceMuted },
  primaryPressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
