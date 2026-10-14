import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

interface SyncPanelProps {
  pendingCount: number;
  online: boolean;
  syncing: boolean;
  onSync: () => void;
}

/** Queue summary and the "Sync now" action at the top of the Orders list. */
export function SyncPanel({ pendingCount, online, syncing, onSync }: SyncPanelProps) {
  const disabled = syncing || !online || pendingCount === 0;
  const headline =
    pendingCount === 0
      ? 'All orders synced'
      : `${pendingCount} ${pendingCount === 1 ? 'order' : 'orders'} waiting to sync`;
  const detail = online
    ? 'Connected. Orders send as soon as they are saved.'
    : 'Offline. Orders wait on this device until you reconnect.';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.text}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
        <View style={[styles.chip, online ? styles.chipOnline : styles.chipOffline]}>
          <Text style={[styles.chipText, online ? styles.chipTextOnline : styles.chipTextOffline]}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync now"
        accessibilityState={{ disabled, busy: syncing }}
        disabled={disabled}
        onPress={() => {
          if (!disabled) onSync();
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && !disabled && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={colors.onAccent} />
        ) : (
          <Ionicons name="sync" size={16} color={disabled ? colors.inkMuted : colors.onAccent} />
        )}
        <Text style={[styles.buttonText, disabled && !syncing && styles.buttonTextDisabled]}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceTint,
    gap: space.md,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  text: { flex: 1, minWidth: 0, gap: space.xxs },
  headline: { ...textStyles.subtitle, color: colors.ink },
  detail: { ...textStyles.meta, color: colors.inkMuted },
  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
  },
  chipOnline: { backgroundColor: colors.successSoft },
  chipOffline: { backgroundColor: colors.chip },
  chipText: { ...textStyles.chip },
  chipTextOnline: { color: colors.successInk },
  chipTextOffline: { color: colors.chipInk },
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonPressed: { backgroundColor: colors.accentInk },
  buttonDisabled: { backgroundColor: colors.progressTrack },
  buttonTextDisabled: { color: colors.inkMuted },
  buttonText: { ...textStyles.buttonSmall, color: colors.onAccent },
});
