import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

interface CartEmptyStateProps {
  /** False when no shop is being visited. The cart then points the rep back to the route. */
  hasVisit: boolean;
  onBrowse: () => void;
  onOpenRoute: () => void;
}

/** Shown when the cart has no lines. Links to the catalogue, or to the route when no shop is set. */
export function CartEmptyState({ hasVisit, onBrowse, onOpenRoute }: CartEmptyStateProps) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <Ionicons name="bag-handle-outline" size={26} color={colors.accentInk} />
      </View>
      <Text style={styles.title}>{hasVisit ? 'Your cart is empty' : 'No shop selected'}</Text>
      <Text style={styles.body}>
        {hasVisit
          ? 'Add products from the catalogue. The cart is saved for this shop on this device.'
          : "Start a visit from today's route. Then add products for that shop."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasVisit ? 'Browse catalogue' : "Open today's route"}
        onPress={hasVisit ? onBrowse : onOpenRoute}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {hasVisit ? 'Browse catalogue' : "Open today's route"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    padding: space.xxl,
    marginTop: space.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  title: { ...textStyles.subtitle, color: colors.ink, textAlign: 'center' },
  body: { ...textStyles.body, color: colors.inkMuted, textAlign: 'center' },
  button: {
    marginTop: space.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { ...textStyles.buttonSmall, color: colors.onAccent },
  pressed: { backgroundColor: colors.accentInk },
});
