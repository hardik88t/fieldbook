import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CartEmptyState } from '@/components/cart/CartEmptyState';
import { CartLineRow } from '@/components/cart/CartLineRow';
import { CustomerHeader } from '@/components/cart/CustomerHeader';
import { DeliveryNoteField } from '@/components/cart/DeliveryNoteField';
import { InlineConfirm } from '@/components/cart/InlineConfirm';
import { InlineNotice, type NoticeTone } from '@/components/cart/InlineNotice';
import { OrderConfirmation, type PlacedOrderSummary } from '@/components/cart/OrderConfirmation';
import { PlaceOrderBar } from '@/components/cart/PlaceOrderBar';
import { TotalsSummary } from '@/components/cart/TotalsSummary';
import { EmptyCartError, useActiveCustomer, useCart, useTodayStops } from '@/state';
import { colors, fontSize, fontWeight, PAGE_GUTTER, space, TOUCH_TARGET } from '@/theme';

interface Notice {
  tone: NoticeTone;
  text: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';
}

/** Cart for the shop being visited: lines, delivery note, totals and placing the order. */
export default function CartScreen() {
  const router = useRouter();
  const cart = useCart();
  const { customerId, customer } = useActiveCustomer();
  const stops = useTodayStops();

  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState<PlacedOrderSummary | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (cart.loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const hasLines = cart.lines.length > 0;
  const stop = stops.data?.find((item) => item.customerId === customerId);
  const stopMeta = customer
    ? [stop ? `Stop ${stop.position}` : null, customer.area].filter(Boolean).join(' · ')
    : '';

  /** Errors from a quantity change are shown here. The stepper only handles its busy state. */
  async function changeQty(productId: string, qty: number): Promise<void> {
    setNotice(null);
    try {
      await cart.setQty(productId, qty);
    } catch (error) {
      setNotice({ tone: 'danger', text: messageOf(error) });
    }
  }

  async function placeOrder(): Promise<void> {
    if (placing || !hasLines) return;
    setPlacing(true);
    setNotice(null);
    setConfirmation(null);
    try {
      const order = await cart.placeOrder(note);
      setNote('');
      setConfirmation({
        id: order.id,
        customerName: order.customerName,
        totalPaise: order.totalPaise,
      });
    } catch (error) {
      if (error instanceof EmptyCartError) {
        setNotice({ tone: 'info', text: 'Nothing to place. Your cart is empty.' });
      } else {
        setNotice({ tone: 'danger', text: messageOf(error) });
      }
    } finally {
      setPlacing(false);
    }
  }

  async function clearCart(): Promise<void> {
    setClearing(true);
    try {
      await cart.clear();
      setConfirmingClear(false);
    } catch (error) {
      setNotice({ tone: 'danger', text: messageOf(error) });
    } finally {
      setClearing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {confirmation ? (
          <OrderConfirmation
            order={confirmation}
            onViewOrders={() => router.navigate('/orders')}
            onDismiss={() => setConfirmation(null)}
          />
        ) : null}

        {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

        {customer ? <CustomerHeader name={customer.name} meta={stopMeta} /> : null}

        {hasLines ? (
          <View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all items from cart"
                disabled={confirmingClear || clearing}
                onPress={() => setConfirmingClear(true)}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>

            {confirmingClear ? (
              <View style={styles.confirm}>
                <InlineConfirm
                  message="Remove every item from this cart? The shop's order history is not changed."
                  confirmLabel="Clear cart"
                  busy={clearing}
                  onConfirm={() => void clearCart()}
                  onCancel={() => setConfirmingClear(false)}
                />
              </View>
            ) : null}

            {cart.lines.map((line) => (
              <CartLineRow key={line.productId} line={line} onChangeQty={changeQty} />
            ))}

            <DeliveryNoteField value={note} onChangeText={setNote} />
            <TotalsSummary totals={cart.totals} />
          </View>
        ) : (
          <CartEmptyState
            hasVisit={customerId !== null}
            onBrowse={() => router.navigate('/catalogue')}
            onOpenRoute={() => router.navigate('/route')}
          />
        )}
      </ScrollView>

      {hasLines ? (
        <PlaceOrderBar
          totalPaise={cart.totals.totalPaise}
          placing={placing}
          onPlace={() => void placeOrder()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.extrabold,
    color: colors.inkStrong,
  },
  clearButton: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.extrabold,
    color: colors.accent,
  },
  confirm: { marginBottom: space.md },
});
