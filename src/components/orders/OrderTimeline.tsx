import { StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@/domain/types';
import { colors, space, textStyles } from '@/theme';

import { formatFullWhen } from './format';

export type TimelineState = 'done' | 'current' | 'todo' | 'failed';

export interface TimelineStep {
  id: 'placed' | 'saved' | 'sent' | 'confirmed';
  title: string;
  detail: string;
  state: TimelineState;
}

export interface TimelineInput {
  status: OrderStatus;
  createdAt: string;
  lastError: string | null;
  online: boolean;
}

/**
 * The four steps an order passes through, derived from its status. Pure, so it can be tested
 * without rendering. A failed order shows the reason on the step where it stopped.
 */
export function buildTimeline({
  status,
  createdAt,
  lastError,
  online,
}: TimelineInput): TimelineStep[] {
  const sent: TimelineStep = (() => {
    switch (status) {
      case 'queued':
        return {
          id: 'sent',
          title: 'Send to server',
          detail: online ? 'Next in line' : 'Waiting for a connection',
          state: 'todo',
        };
      case 'syncing':
        return { id: 'sent', title: 'Sending to server', detail: 'In progress', state: 'current' };
      case 'synced':
        return { id: 'sent', title: 'Sent to server', detail: 'Received', state: 'done' };
      case 'failed':
        return {
          id: 'sent',
          title: 'Could not send',
          detail: lastError ?? 'Tap Retry to send it again',
          state: 'failed',
        };
    }
  })();

  const confirmed: TimelineStep =
    status === 'synced'
      ? { id: 'confirmed', title: 'Confirmed by server', detail: 'Order accepted', state: 'done' }
      : {
          id: 'confirmed',
          title: 'Confirmed by server',
          detail: 'Waiting for the server',
          state: 'todo',
        };

  return [
    { id: 'placed', title: 'Placed', detail: formatFullWhen(createdAt), state: 'done' },
    {
      id: 'saved',
      title: 'Saved on this device',
      detail: 'Kept safe even if the connection drops',
      state: 'done',
    },
    sent,
    confirmed,
  ];
}

interface OrderTimelineProps {
  steps: TimelineStep[];
}

const NODE_COLORS: Record<TimelineState, { fill: string; border: string }> = {
  done: { fill: colors.success, border: colors.success },
  current: { fill: colors.surface, border: colors.accent },
  todo: { fill: colors.surface, border: colors.nodeIdle },
  failed: { fill: colors.danger, border: colors.danger },
};

/** Vertical status timeline, in the style of the route stops. */
export function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <View accessibilityLabel="Order status timeline">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const palette = NODE_COLORS[step.state];
        const done = step.state === 'done';
        return (
          <View
            key={step.id}
            style={styles.step}
            accessible
            accessibilityLabel={`${step.title}. ${step.detail}`}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  { backgroundColor: palette.fill, borderColor: palette.border },
                ]}
              >
                {done ? <View style={styles.nodeDot} /> : null}
              </View>
              {last ? null : (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: done ? colors.success : colors.railIdle },
                  ]}
                />
              )}
            </View>
            <View style={[styles.body, last && styles.bodyLast]}>
              <Text
                style={[
                  styles.title,
                  step.state === 'todo' && styles.titleMuted,
                  step.state === 'failed' && styles.titleDanger,
                ]}
              >
                {step.title}
              </Text>
              <Text style={[styles.detail, step.state === 'failed' && styles.detailDanger]}>
                {step.detail}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md },
  rail: { width: 18, alignItems: 'center' },
  node: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  nodeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.surface },
  line: { flex: 1, width: 2, marginVertical: 2 },
  body: { flex: 1, minWidth: 0, paddingBottom: space.lg },
  bodyLast: { paddingBottom: 0 },
  title: { ...textStyles.bodyStrong, color: colors.inkStrong },
  titleMuted: { color: colors.inkMuted },
  titleDanger: { color: colors.dangerInk },
  detail: { ...textStyles.meta, color: colors.inkMuted, marginTop: space.xxs },
  detailDanger: { color: colors.dangerInk },
});
