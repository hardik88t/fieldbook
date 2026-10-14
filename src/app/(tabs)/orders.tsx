import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InlineNotice, type NoticeTone } from '@/components/cart/InlineNotice';
import { OrderRow } from '@/components/orders/OrderRow';
import { describeFlush, type FlushCounts } from '@/components/orders/format';
import { SyncPanel } from '@/components/orders/SyncPanel';
import type { OrderSummary } from '@/domain/types';
import { useOrders, useSync } from '@/state';
import { colors, fontSize, fontWeight, PAGE_GUTTER, radius, space, TOUCH_TARGET } from '@/theme';

interface Notice {
  tone: NoticeTone;
  text: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';
}

/** Orders, newest first, with the queue summary and per-order status pills. */
export default function OrdersScreen() {
  const router = useRouter();
  const orders = useOrders();
  const sync = useSync();

  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const { online, pendingCount } = sync;
  const busy = syncing || retryingId !== null;
  const list: OrderSummary[] = orders.data ?? [];

  /** Sends everything due. Offline runs are skipped, so orders are not marked failed for no reason. */
  async function sendQueued(): Promise<void> {
    setSyncing(true);
    setNotice(null);
    try {
      const report: FlushCounts = await sync.flushNow();
      setNotice(describeFlush(report));
    } catch (error) {
      setNotice({ tone: 'danger', text: messageOf(error) });
    } finally {
      setSyncing(false);
    }
  }

  async function retryOrder(orderId: string): Promise<void> {
    setRetryingId(orderId);
    setNotice(null);
    try {
      const report: FlushCounts = await sync.retryOrder(orderId);
      setNotice(describeFlush(report));
    } catch (error) {
      setNotice({ tone: 'danger', text: messageOf(error) });
    } finally {
      setRetryingId(null);
    }
  }

  async function onPullToRefresh(): Promise<void> {
    setPulling(true);
    orders.refresh();
    try {
      if (online && pendingCount > 0) await sendQueued();
    } finally {
      setPulling(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <SyncPanel
        pendingCount={pendingCount}
        online={online}
        syncing={syncing}
        onSync={() => void sendQueued()}
      />
      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}
    </View>
  );

  return (
    <FlatList
      data={list}
      keyExtractor={(order) => order.id}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      extraData={{ online, syncing, retryingId }}
      refreshControl={
        <RefreshControl
          refreshing={pulling || syncing}
          onRefresh={() => void onPullToRefresh()}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Empty loading={orders.loading} error={orders.error} onRetry={orders.refresh} />
      }
      renderItem={({ item }) => (
        <OrderRow
          order={item}
          now={new Date()}
          online={online}
          retrying={retryingId === item.id}
          busy={busy}
          onOpen={(orderId) => router.push(`/order/${orderId}`)}
          onRetry={(orderId) => void retryOrder(orderId)}
        />
      )}
    />
  );
}

function Empty({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Could not load orders</Text>
        <Text style={styles.emptyBody}>{error.message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try loading orders again"
          onPress={onRetry}
          style={styles.emptyButton}
        >
          <Text style={styles.emptyButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptyBody}>Orders you place from a shop&apos;s cart appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    gap: space.md,
    flexGrow: 1,
  },
  header: { gap: space.md, marginBottom: space.xs },
  empty: {
    alignItems: 'center',
    paddingVertical: space.xxxl,
    gap: space.sm,
  },
  emptyTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.extrabold,
    color: colors.ink,
  },
  emptyBody: {
    fontSize: fontSize.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.extrabold,
    color: colors.accentInk,
  },
});
