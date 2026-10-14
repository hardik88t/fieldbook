import { StyleSheet, Text, View } from 'react-native';

import type { StopView } from '@/domain/types';
import { formatINR } from '@/state';
import { colors, space, textStyles } from '@/theme';

import { CurrentStopCard } from './CurrentStopCard';
import { orderAgeDays, phaseOf, type StopPhase } from './summary';

/** Width of the time column, the rail column and the gap between them, as in the reference. */
const TIME_WIDTH = 46;
const RAIL_WIDTH = 18;
const RAIL_LINE_WIDTH = 2;
/** Height of one line of stop name text. The node is centred on it. */
const NODE_BOX = 19;
const NODE_SIZE = 14;
const HALO_SIZE = 24;

interface StopTimelineProps {
  stops: readonly StopView[];
  currentId: string | null;
  now: Date;
  /** Customer whose visit is being started, if any. */
  busyCustomerId: string | null;
  startError: string | null;
  onStartVisit: (stop: StopView) => void;
}

/** Vertical timeline of today's stops with a rail that turns green up to the last done stop. */
export function StopTimeline({
  stops,
  currentId,
  now,
  busyCustomerId,
  startError,
  onStartVisit,
}: StopTimelineProps) {
  return (
    <View accessibilityRole="list" accessibilityLabel="Today's stops">
      {stops.map((stop, index) => {
        const phase = phaseOf(stop, currentId);
        return (
          <StopRow
            key={stop.id}
            stop={stop}
            phase={phase}
            now={now}
            isLast={index === stops.length - 1}
            busy={busyCustomerId === stop.customerId}
            error={phase === 'current' ? startError : null}
            onStart={() => onStartVisit(stop)}
          />
        );
      })}
    </View>
  );
}

interface Detail {
  text: string;
  tone: 'success' | 'muted';
}

/** The one-line note under a done or upcoming stop. */
function detailFor(stop: StopView, phase: StopPhase, now: Date): Detail | null {
  if (phase === 'current') return null;
  const order = stop.lastOrder;
  if (phase === 'done') {
    if (order && orderAgeDays(order, now) === 0) {
      return { text: `Order · ${formatINR(order.totalPaise)}`, tone: 'success' };
    }
    return { text: 'No order today', tone: 'muted' };
  }
  if (order) return { text: `Last order · ${formatINR(order.totalPaise)}`, tone: 'muted' };
  return { text: 'No previous order', tone: 'muted' };
}

interface StopRowProps {
  stop: StopView;
  phase: StopPhase;
  now: Date;
  isLast: boolean;
  busy: boolean;
  error: string | null;
  onStart: () => void;
}

function StopRow({ stop, phase, now, isLast, busy, error, onStart }: StopRowProps) {
  const isCurrent = phase === 'current';
  const isDone = phase === 'done';
  const detail = detailFor(stop, phase, now);

  // The current row keeps its children separately focusable, so the Start visit button works.
  // Other rows read as one item.
  const label = [
    stop.plannedTime,
    stop.customer.name,
    stop.customer.area,
    isDone ? 'Done' : 'To visit',
    detail?.text,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible={!isCurrent}
      accessibilityLabel={isCurrent ? undefined : label}
      style={[styles.row, !isLast && styles.rowGap]}
    >
      <Text style={styles.time}>{stop.plannedTime}</Text>
      <View style={styles.railColumn}>
        {isLast ? null : (
          <View
            style={[
              styles.railLine,
              { backgroundColor: isDone ? colors.success : colors.railIdle },
            ]}
          />
        )}
        <View style={styles.nodeBox}>
          {isCurrent ? <View style={styles.halo} /> : null}
          <View style={[styles.node, nodeStyle(phase)]} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.shop, { color: shopInk(phase) }]}>{stop.customer.name}</Text>
        <Text style={styles.area}>{stop.customer.area}</Text>
        {isCurrent ? (
          <CurrentStopCard stop={stop} now={now} busy={busy} error={error} onStart={onStart} />
        ) : detail ? (
          <Text
            style={[
              styles.note,
              { color: detail.tone === 'success' ? colors.successInk : colors.inkMuted },
            ]}
          >
            {detail.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function nodeStyle(phase: StopPhase) {
  if (phase === 'done') return styles.nodeDone;
  if (phase === 'current') return styles.nodeCurrent;
  return styles.nodeUpcoming;
}

function shopInk(phase: StopPhase): string {
  if (phase === 'done') return colors.inkStrong;
  if (phase === 'current') return colors.ink;
  return colors.inkBody;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rowGap: {
    paddingBottom: space.md,
  },
  time: {
    width: TIME_WIDTH,
    marginRight: space.sm,
    paddingTop: space.xxs,
    ...textStyles.metaStrong,
    color: colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  railColumn: {
    width: RAIL_WIDTH,
    alignItems: 'center',
  },
  railLine: {
    position: 'absolute',
    left: (RAIL_WIDTH - RAIL_LINE_WIDTH) / 2,
    top: NODE_BOX / 2,
    // Runs down to the middle of the next row's node.
    bottom: -(space.md + NODE_BOX / 2),
    width: RAIL_LINE_WIDTH,
  },
  nodeBox: {
    height: NODE_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: colors.accentSoft,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
  },
  nodeDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  nodeCurrent: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  nodeUpcoming: {
    borderColor: colors.nodeIdle,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginLeft: space.sm,
  },
  shop: { ...textStyles.stopName },
  area: { ...textStyles.meta, color: colors.inkMuted },
  note: { ...textStyles.metaStrong, marginTop: space.xxs },
});
