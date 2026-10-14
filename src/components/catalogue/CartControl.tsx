import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, TOUCH_TARGET, textStyles } from '@/theme';

/** The cart accepts 0 to 99 per line. Kept in step with the cart's limit. */
const MAX_QTY = 99;
const START_VISIT_HINT = 'Start a visit from Route to add items';

interface CartControlProps {
  productName: string;
  /** Quantity of this product in the active cart. 0 shows the Add button. */
  qty: number;
  /** False when no visit is active. */
  canAdd: boolean;
  /** True while a write for this product is in flight. */
  busy: boolean;
  onAdd: () => void;
  /** Receives the new quantity. 0 removes the line. */
  onChange: (qty: number) => void;
}

/** "Add" button that becomes a minus, quantity, plus stepper once the product is in the cart. */
export function CartControl({ productName, qty, canAdd, busy, onAdd, onChange }: CartControlProps) {
  const locked = !canAdd || busy;
  const hint = canAdd ? undefined : START_VISIT_HINT;

  if (qty === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${productName} to cart`}
        accessibilityHint={hint}
        accessibilityState={{ disabled: locked, busy }}
        disabled={locked}
        onPress={onAdd}
        style={({ pressed }) => [styles.add, locked && styles.locked, pressed && styles.pressed]}
      >
        <Text style={styles.addLabel}>Add</Text>
      </Pressable>
    );
  }

  const atMax = qty >= MAX_QTY;
  return (
    <View style={[styles.stepper, locked && styles.locked]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          qty === 1 ? `Remove ${productName} from cart` : `Remove one ${productName}`
        }
        accessibilityHint={hint}
        accessibilityState={{ disabled: locked }}
        disabled={locked}
        onPress={() => onChange(qty - 1)}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Ionicons name="remove" size={20} color={colors.onAccent} />
      </Pressable>
      <Text
        accessibilityLabel={`${qty} in cart`}
        accessibilityLiveRegion="polite"
        style={styles.qty}
      >
        {qty}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add one more ${productName}`}
        accessibilityHint={atMax ? 'Maximum quantity reached' : hint}
        accessibilityState={{ disabled: locked || atMax }}
        disabled={locked || atMax}
        onPress={() => onChange(qty + 1)}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={20} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  add: {
    height: TOUCH_TARGET,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...textStyles.buttonSmall, color: colors.accentInk },
  stepper: {
    height: TOUCH_TARGET,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stepButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    ...textStyles.buttonSmall,
    minWidth: 28,
    textAlign: 'center',
    color: colors.onAccent,
  },
  locked: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
