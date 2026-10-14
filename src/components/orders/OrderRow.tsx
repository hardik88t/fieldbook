import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { shortReference } from '@/components/cart/OrderConfirmation';
import type { OrderSummary } from '@/domain/types';
import { formatINR } from '@/state';
import { colors, fontSize, fontWeight, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

import { formatOrderWhen } from './format';
import { StatusPill, statusPresentation } from './StatusPill';

interface OrderRowProps {
  order: OrderSummary;
  now: Date;
  online: boolean;
  /** True while this order's retry is running. */
  retrying: boolean;
  /** True while any sync action is running, so retries wait their turn. */
  busy: boolean;
  onOpen: (orderId: string) => void;
  onRetry: (orderId: string) => void;
}

/** One order in the list. The body opens the detail; a failed order shows Retry beside its pill. */
export function OrderRow({ order, now, online, retrying, busy, onOpen, onRetry }: OrderRowProps) {
  const status = statusPresentation(order.status);
  const failed = order.status === 'failed';
  const retryDisabled = !online || busy || retrying;
  const when = formatOrderWhen(order.createdAt, now);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open order for ${order.customerName}, ${formatINR(order.totalPaise)}, ${status.label}`}
        onPress={() => onOpen(order.id)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {order.customerName}
          </Text>
          <Text style={styles.total}>{formatINR(order.totalPaise)}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {`${when} · Ref ${shortReference(order.id)}`}
        </Text>
        {failed && order.lastError ? (
          <Text style={styles.error} numberOfLines={2}>
            {order.lastError}
          </Text>
        ) : null}
      </Pressable>

      <View style={styles.footer}>
        <StatusPill status={order.status} />
        {failed ? (
          <View style={styles.retryWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retry order for ${order.customerName}`}
              accessibilityState={{ disabled: retryDisabled, busy: retrying }}
              disabled={retryDisabled}
              onPress={() => {
                if (!retryDisabled) onRetry(order.id);
              }}
              style={({ pressed }) => [
                styles.retry,
                pressed && !retryDisabled && styles.retryPressed,
                retryDisabled && styles.retryDisabled,
              ]}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={colors.accentInk} />
              ) : (
                <Ionicons name="refresh" size={15} color={colors.accentInk} />
              )}
              <Text style={styles.retryText}>{retrying ? 'Retrying…' : 'Retry'}</Text>
            </Pressable>
            {!online ? <Text style={styles.hint}>Go online to retry</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
  body: { gap: space.xxs, borderRadius: radius.lg },
  pressed: { opacity: 0.7 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  name: { ...textStyles.subtitle, color: colors.ink, flex: 1, minWidth: 0 },
  total: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.black,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  meta: { ...textStyles.meta, color: colors.inkMuted },
  error: { ...textStyles.meta, color: colors.dangerInk, marginTop: space.xxs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: TOUCH_TARGET,
  },
  retryWrap: { alignItems: 'flex-end' },
  retry: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  retryPressed: { backgroundColor: colors.surfaceTint },
  retryDisabled: { opacity: 0.5 },
  retryText: { ...textStyles.buttonSmall, color: colors.accentInk },
  hint: { ...textStyles.meta, color: colors.inkMuted },
});
