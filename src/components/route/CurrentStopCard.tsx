import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StopView } from '@/domain/types';
import { formatINR } from '@/state';
import { colors, radius, space, TOUCH_TARGET, textStyles } from '@/theme';

import { lastOrderAgeLabel } from './summary';

interface CurrentStopCardProps {
  stop: StopView;
  now: Date;
  /** True while startVisit is running for this stop. */
  busy: boolean;
  error: string | null;
  onStart: () => void;
}

/** The highlighted "up next" card: when the shop was last ordered from, and the Start visit button. */
export function CurrentStopCard({ stop, now, busy, error, onStart }: CurrentStopCardProps) {
  const { lastOrder } = stop;
  const amount = lastOrder ? ` · ${formatINR(lastOrder.totalPaise)}` : '';

  return (
    <View style={styles.card}>
      <Text style={styles.lastOrder}>
        {lastOrderAgeLabel(lastOrder, now)}
        {amount}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start visit at ${stop.customer.name}`}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onStart}
        style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonDimmed]}
      >
        <Text style={styles.buttonText}>{busy ? 'Starting…' : 'Start visit'}</Text>
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: space.md,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    shadowColor: colors.shadowAccent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 3,
  },
  lastOrder: { ...textStyles.metaStrong, color: colors.accentInk },
  button: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  buttonDimmed: { opacity: 0.7 },
  buttonText: { ...textStyles.button, color: colors.onAccent },
  error: { ...textStyles.meta, color: colors.dangerInk },
});
