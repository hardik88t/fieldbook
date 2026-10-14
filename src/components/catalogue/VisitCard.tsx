import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Customer } from '@/domain/types';
import { colors, radius, space, TOUCH_TARGET, textStyles } from '@/theme';

interface VisitCardProps {
  customer: Customer | null;
  /** True while the active customer is being loaded. */
  loading: boolean;
  onGoToRoute: () => void;
}

/** The shop being visited, or a prompt to start a visit from Route. */
export function VisitCard({ customer, loading, onGoToRoute }: VisitCardProps) {
  if (customer) {
    return (
      <View style={styles.card} accessibilityLabel={`Visiting ${customer.name}, ${customer.area}`}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>Visiting now</Text>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {customer.area}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading the current visit" />
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardPrompt]}>
      <View style={styles.copy}>
        <Text style={styles.name}>No visit in progress</Text>
        <Text style={styles.meta}>Start a visit from Route to add items for a shop.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to Route to start a visit"
        onPress={onGoToRoute}
        style={({ pressed }) => [styles.routeButton, pressed && styles.pressed]}
      >
        <Text style={styles.routeLabel}>Go to Route</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: TOUCH_TARGET,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceMuted,
  },
  cardPrompt: { backgroundColor: colors.surfaceTint },
  copy: { flex: 1, minWidth: 0, gap: space.xxs },
  kicker: { ...textStyles.greeting, color: colors.inkMuted },
  name: { ...textStyles.shopName, color: colors.ink },
  meta: { ...textStyles.meta, color: colors.inkMuted },
  routeButton: {
    height: TOUCH_TARGET,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLabel: { ...textStyles.buttonSmall, color: colors.onAccent },
  pressed: { opacity: 0.8 },
});
