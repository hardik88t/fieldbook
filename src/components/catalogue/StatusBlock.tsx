import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, TOUCH_TARGET, textStyles } from '@/theme';

interface StatusBlockProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

/** Centred message for empty, no-results and error states in the product grid. */
export function StatusBlock({ icon, title, body, action }: StatusBlockProps) {
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {icon ? <Ionicons name={icon} size={32} color={colors.inkFaint} /> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  title: { ...textStyles.subtitle, color: colors.ink, textAlign: 'center' },
  body: { ...textStyles.body, color: colors.inkMuted, textAlign: 'center' },
  action: {
    height: TOUCH_TARGET,
    marginTop: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { ...textStyles.buttonSmall, color: colors.accentInk },
  pressed: { opacity: 0.8 },
});
