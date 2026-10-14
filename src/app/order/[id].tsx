import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InlineNotice, type NoticeTone } from '@/components/cart/InlineNotice';
import { TotalsSummary } from '@/components/cart/TotalsSummary';
import { OrderSection } from '@/components/orders/OrderSection';
import { describeFlush, formatFullWhen, type FlushCounts } from '@/components/orders/format';
import { OrderTimeline, buildTimeline } from '@/components/orders/OrderTimeline';
import { StatusPill } from '@/components/orders/StatusPill';
import { shortReference } from '@/components/cart/OrderConfirmation';
import { formatINR, useOrder, useSync } from '@/state';
import {
  colors,
  fontSize,
  fontWeight,
  PAGE_GUTTER,
  radius,
  space,
  textStyles,
  TOUCH_TARGET,
} from '@/theme';

interface Notice {
  tone: NoticeTone;
  text: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';
}

/** One order: header, status timeline, lines, totals and the delivery note. Opened from Orders. */
export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const orderId = Array.isArray(params.id) ? (params.id[0] ?? null) : (params.id ?? null);
  const query = useOrder(orderId);
  const sync = useSync();

  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const order = query.data;
  const title = order ? order.customerName : 'Order';

  async function retry(): Promise<void> {
    if (!order || retrying) return;
    setRetrying(true);
    setNotice(null);
    try {
      const report: FlushCounts = await sync.retryOrder(order.id);
      setNotice(describeFlush(report));
    } catch (error) {
      setNotice({ tone: 'danger', text: messageOf(error) });
    } finally {
      setRetrying(false);
    }
  }

  if (query.loading) {
    return (
      <View style={styles.centre}>
        <Stack.Screen options={{ title }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (query.error || !order) {
    return (
      <View style={styles.centre}>
        <Stack.Screen options={{ title }} />
        <Text style={styles.emptyTitle}>
          {query.error ? 'Could not load this order' : 'Order not found'}
        </Text>
        <Text style={styles.emptyBody}>
          {query.error ? query.error.message : 'It may have been cleared with the demo data.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to orders"
          onPress={() => router.navigate('/orders')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back to orders</Text>
        </Pressable>
      </View>
    );
  }

  const failed = order.status === 'failed';
  const steps = buildTimeline({
    status: order.status,
    createdAt: order.createdAt,
    lastError: order.lastError,
    online: sync.online,
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title }} />

      <View style={styles.hero}>
        <Text style={styles.when}>{formatFullWhen(order.createdAt)}</Text>
        <Text style={styles.total}>{formatINR(order.totalPaise)}</Text>
        <View style={styles.heroRow}>
          <StatusPill status={order.status} />
          <Text style={styles.ref}>{`Ref ${shortReference(order.id)}`}</Text>
        </View>
      </View>

      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      {failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry sending this order"
          accessibilityState={{ disabled: !sync.online || retrying, busy: retrying }}
          disabled={!sync.online || retrying}
          onPress={() => void retry()}
          style={({ pressed }) => [
            styles.retry,
            pressed && sync.online && !retrying && styles.retryPressed,
            (!sync.online || retrying) && styles.retryDisabled,
          ]}
        >
          <Text style={styles.retryText}>{retrying ? 'Retrying…' : 'Retry sending'}</Text>
        </Pressable>
      ) : null}
      {failed && !sync.online ? (
        <Text style={styles.hint}>You are offline. Go online to retry.</Text>
      ) : null}

      <OrderSection title="Status">
        <OrderTimeline steps={steps} />
      </OrderSection>

      <OrderSection title={order.lines.length === 1 ? '1 item' : `${order.lines.length} items`}>
        {order.lines.map((line, index) => (
          <View
            key={`${line.productId}-${index}`}
            style={[styles.line, index > 0 && styles.lineDivider]}
          >
            <View style={styles.lineBody}>
              <Text style={styles.lineName} numberOfLines={2}>
                {line.productName}
              </Text>
              <Text style={styles.lineMeta}>
                {`${line.pack} · ${line.qty} × ${formatINR(line.unitPricePaise)}`}
              </Text>
            </View>
            <Text style={styles.lineTotal}>{formatINR(line.linePaise)}</Text>
          </View>
        ))}
        <TotalsSummary
          totals={{
            subtotalPaise: order.subtotalPaise,
            gstPaise: order.gstPaise,
            totalPaise: order.totalPaise,
          }}
        />
      </OrderSection>

      {order.note ? (
        <OrderSection title="Delivery note">
          <Text style={styles.note}>{order.note}</Text>
        </OrderSection>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: PAGE_GUTTER,
    backgroundColor: colors.background,
  },
  emptyTitle: { ...textStyles.subtitle, color: colors.ink, textAlign: 'center' },
  emptyBody: { ...textStyles.body, color: colors.inkMuted, textAlign: 'center' },
  backButton: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { ...textStyles.buttonSmall, color: colors.onAccent },
  hero: {
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceMuted,
    gap: space.xs,
  },
  when: { ...textStyles.meta, color: colors.inkMuted },
  total: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  ref: { ...textStyles.metaStrong, color: colors.inkMuted },
  retry: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: { backgroundColor: colors.accentInk },
  retryDisabled: { opacity: 0.5 },
  retryText: { ...textStyles.button, color: colors.onAccent, fontSize: fontSize.body },
  hint: { ...textStyles.meta, color: colors.inkMuted, textAlign: 'center', marginTop: -space.xs },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  lineDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  lineBody: { flex: 1, minWidth: 0 },
  lineName: { ...textStyles.productName, color: colors.ink },
  lineMeta: { ...textStyles.meta, color: colors.inkMuted, marginTop: space.xxs },
  lineTotal: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.black,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  note: { ...textStyles.body, color: colors.inkBody },
});
