import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Paise } from '@/money';
import { formatINR } from '@/state';
import { colors, radius, space, textStyles } from '@/theme';

interface PlaceOrderBarProps {
  totalPaise: Paise;
  placing: boolean;
  onPlace: () => void;
}

export const PLACE_ORDER_CAPTION = 'Sends automatically when you are back online.';

/** The primary action and its caption, pinned under the cart lines. */
export function PlaceOrderBar({ totalPaise, placing, onPlace }: PlaceOrderBarProps) {
  const label = `Place order · ${formatINR(totalPaise)}`;
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: placing, busy: placing }}
        disabled={placing}
        onPress={() => {
          if (!placing) onPlace();
        }}
        style={({ pressed }) => [styles.button, pressed && !placing && styles.pressed]}
      >
        {placing ? (
          <>
            <ActivityIndicator color={colors.onAccent} />
            <Text style={styles.label}>Placing order…</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>{label}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
          </>
        )}
      </Pressable>
      <Text style={styles.caption}>{PLACE_ORDER_CAPTION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    minHeight: 56,
    borderRadius: radius.xxl,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    shadowColor: colors.shadowAccent,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pressed: { backgroundColor: colors.accentInk },
  label: { ...textStyles.button, color: colors.onAccent },
  caption: {
    ...textStyles.meta,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: space.sm,
  },
});
