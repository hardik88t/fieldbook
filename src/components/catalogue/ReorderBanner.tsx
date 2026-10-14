import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, TOUCH_TARGET, textStyles } from '@/theme';

import { describeError } from './describeError';

interface ReorderBannerProps {
  customerName: string;
  /** Number of lines in the customer's last order. */
  itemCount: number;
  /** Copies the last order into the cart. Resolves with the number of lines copied. */
  onReorder: () => Promise<number>;
}

/** "Reorder last visit" banner. Shows how many lines were added once the copy finishes. */
export function ReorderBanner({ customerName, itemCount, onReorder }: ReorderBannerProps) {
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setBusy(true);
    setError(null);
    try {
      setAdded(await onReorder());
    } catch (caught) {
      setAdded(null);
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  let subtitle = `${customerName} · ${countLabel(itemCount, 'item')}`;
  if (added !== null) subtitle = `${countLabel(added, 'item')} added`;

  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <Text style={styles.title}>Reorder last visit</Text>
        <Text style={styles.subtitle} accessibilityLiveRegion="polite">
          {subtitle}
        </Text>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reorder last visit from ${customerName}`}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={handlePress}
        style={({ pressed }) => [styles.button, busy && styles.locked, pressed && styles.pressed]}
      >
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.buttonLabel}>Reorder</Text>
        )}
      </Pressable>
    </View>
  );
}

function countLabel(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceTint,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { ...textStyles.stopName, color: colors.ink },
  subtitle: { ...textStyles.meta, color: colors.inkMuted },
  error: { ...textStyles.meta, color: colors.dangerInk, marginTop: space.xxs },
  button: {
    minWidth: TOUCH_TARGET,
    height: TOUCH_TARGET,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { ...textStyles.buttonSmall, color: colors.onAccent },
  locked: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
