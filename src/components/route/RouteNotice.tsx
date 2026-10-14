import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, TOUCH_TARGET, textStyles } from '@/theme';

interface RouteNoticeProps {
  title: string;
  body: string;
  /** Shown as a button when both are given, for example "Try again". */
  actionLabel?: string;
  onAction?: () => void;
  /** Announce the notice as soon as it appears, for errors. */
  alert?: boolean;
}

/** Card for the empty and error states of the route. */
export function RouteNotice({ title, body, actionLabel, onAction, alert }: RouteNoticeProps) {
  return (
    <View style={styles.card} accessibilityRole={alert ? 'alert' : undefined}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { ...textStyles.subtitle, color: colors.ink },
  body: { ...textStyles.meta, color: colors.inkMuted },
  action: {
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    marginTop: space.xxs,
  },
  actionPressed: { opacity: 0.6 },
  actionText: { ...textStyles.bodyStrong, color: colors.accentInk },
});
