import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, textStyles } from '@/theme';

import { doneLabel, stopsLeftLabel, type RouteSummary } from './summary';

const CHIP_HEIGHT = 28;
const CHIP_PADDING_X = 11;
const CHIP_ICON_SIZE = 13;
const TRACK_HEIGHT = 6;

interface RouteProgressProps {
  summary: RouteSummary;
  online: boolean;
  /** Orders written on this device that the server has not confirmed yet. */
  pendingCount: number;
}

type ChipTone = 'success' | 'neutral' | 'accent';

const CHIP_TONE: Record<ChipTone, { background: string; ink: string }> = {
  success: { background: colors.successSoft, ink: colors.successInk },
  neutral: { background: colors.chip, ink: colors.chipInk },
  accent: { background: colors.surfaceTint, ink: colors.accentInk },
};

function Chip({
  label,
  tone,
  icon,
  accessibilityLabel,
}: {
  label: string;
  tone: ChipTone;
  icon?: boolean;
  accessibilityLabel?: string;
}) {
  const palette = CHIP_TONE[tone];
  return (
    <View
      style={[styles.chip, { backgroundColor: palette.background }]}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {icon ? <Ionicons name="checkmark" size={CHIP_ICON_SIZE} color={palette.ink} /> : null}
      <Text style={[styles.chipText, { color: palette.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** "2 done", "4 stops left", "Offline ready", and a bar for how far through the route the rep is. */
export function RouteProgress({ summary, online, pendingCount }: RouteProgressProps) {
  const pendingNote =
    pendingCount > 0
      ? `, ${pendingCount} ${pendingCount === 1 ? 'order' : 'orders'} waiting to send`
      : '';
  const connectionNote = online ? '' : ', currently offline';

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        <Chip label={doneLabel(summary.done)} tone="success" icon />
        <Chip label={stopsLeftLabel(summary)} tone="neutral" />
        <Chip
          label="Offline ready"
          tone="accent"
          accessibilityLabel={`Offline ready${connectionNote}${pendingNote}`}
        />
      </View>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Route progress"
        accessibilityValue={{ min: 0, max: summary.total, now: summary.done }}
      >
        <View style={[styles.fill, { width: `${Math.round(summary.progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: CHIP_HEIGHT,
    paddingHorizontal: CHIP_PADDING_X,
    borderRadius: radius.pill,
  },
  chipText: { ...textStyles.chip },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
