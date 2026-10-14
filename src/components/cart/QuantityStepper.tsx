import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_LINE_QTY } from '@/domain/cart';
import { colors, fontSize, radius, textStyles, TOUCH_TARGET } from '@/theme';

interface QuantityStepperProps {
  /** Product name, used in the button labels so each stepper is distinct to screen readers. */
  name: string;
  qty: number;
  /** Receives the new quantity. 0 removes the line. Rejections are the caller's to show. */
  onChange: (qty: number) => Promise<void>;
}

/** Minus, quantity, plus in one pill. Each button is a full 44 px target. */
export function QuantityStepper({ name, qty, onChange }: QuantityStepperProps) {
  const [pending, setPending] = useState(false);

  async function change(next: number) {
    if (pending || next < 0 || next > MAX_LINE_QTY) return;
    setPending(true);
    try {
      await onChange(next);
    } finally {
      setPending(false);
    }
  }

  const canDecrease = !pending && qty > 0;
  const canIncrease = !pending && qty < MAX_LINE_QTY;

  return (
    <View style={styles.pill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={qty <= 1 ? `Remove ${name}` : `Decrease ${name}`}
        accessibilityState={{ disabled: !canDecrease }}
        disabled={!canDecrease}
        onPress={() => void change(qty - 1)}
        style={({ pressed }) => [styles.button, pressed && canDecrease && styles.pressed]}
      >
        <Text style={[styles.symbol, !canDecrease && styles.symbolDisabled]}>−</Text>
      </Pressable>
      <View
        style={styles.count}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${name}, quantity ${qty}`}
      >
        {pending ? (
          <ActivityIndicator size="small" color={colors.onAccent} />
        ) : (
          <Text style={styles.countText}>{qty}</Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${name}`}
        accessibilityState={{ disabled: !canIncrease }}
        disabled={!canIncrease}
        onPress={() => void change(qty + 1)}
        style={({ pressed }) => [styles.button, pressed && canIncrease && styles.pressed]}
      >
        <Text style={[styles.symbol, !canIncrease && styles.symbolDisabled]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: TOUCH_TARGET,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    overflow: 'hidden',
  },
  button: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.accentInk },
  symbol: {
    ...textStyles.button,
    color: colors.onAccent,
    fontSize: fontSize.heading,
    lineHeight: 22,
  },
  symbolDisabled: { opacity: 0.45 },
  count: {
    minWidth: 28,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    ...textStyles.buttonSmall,
    color: colors.onAccent,
    fontVariant: ['tabular-nums'],
  },
});
