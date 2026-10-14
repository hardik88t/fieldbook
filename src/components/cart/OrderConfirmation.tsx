import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Paise } from '@/money';
import { formatINR, useConnectivity } from '@/state';
import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

export interface PlacedOrderSummary {
  id: string;
  customerName: string;
  totalPaise: Paise;
}

interface OrderConfirmationProps {
  order: PlacedOrderSummary;
  onViewOrders: () => void;
  onDismiss: () => void;
}

/** Shown in place after an order is placed. There is no toast. */
export function OrderConfirmation({ order, onViewOrders, onDismiss }: OrderConfirmationProps) {
  const { online } = useConnectivity();
  const reference = shortReference(order.id);
  const detail = online
    ? 'Saved on this device and sending now.'
    : 'Saved on this device. It sends when you are back online.';

  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.head}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={18} color={colors.successInk} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>Order placed</Text>
          <Text style={styles.meta}>
            {`${order.customerName} · ${formatINR(order.totalPaise)} · Ref ${reference}`}
          </Text>
        </View>
      </View>
      <Text style={styles.detail}>{detail}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="View in Orders"
          onPress={onViewOrders}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>View in Orders</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accentInk} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss order confirmation"
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** A short, human reference taken from the end of the order id, for example "A1B2C3". */
export function shortReference(orderId: string): string {
  const compact = orderId.replace(/[^a-zA-Z0-9]/g, '');
  return compact.slice(-6).toUpperCase();
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.successSoft,
    backgroundColor: colors.successSoft,
    gap: space.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, minWidth: 0 },
  title: { ...textStyles.subtitle, color: colors.successInk },
  meta: { ...textStyles.meta, color: colors.inkStrong, marginTop: space.xxs },
  detail: { ...textStyles.body, color: colors.inkStrong },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  link: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingRight: space.sm,
  },
  linkText: { ...textStyles.buttonSmall, color: colors.accentInk },
  dismiss: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  dismissText: { ...textStyles.buttonSmall, color: colors.inkMuted },
  pressed: { opacity: 0.6 },
});
