import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { OrderStatus } from '@/domain/types';
import { colors, radius, space, textStyles } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface StatusPresentation {
  label: string;
  background: string;
  ink: string;
  icon: IconName;
}

/** Label, colours and icon for each order status. Text colours meet contrast on their pill. */
export function statusPresentation(status: OrderStatus): StatusPresentation {
  switch (status) {
    case 'queued':
      return {
        label: 'Queued',
        background: colors.chip,
        ink: colors.chipInk,
        icon: 'time-outline',
      };
    case 'syncing':
      return {
        label: 'Syncing',
        background: colors.surfaceAccent,
        ink: colors.accentInk,
        icon: 'sync-outline',
      };
    case 'synced':
      return {
        label: 'Synced',
        background: colors.successSoft,
        ink: colors.successInk,
        icon: 'checkmark-circle-outline',
      };
    case 'failed':
      return {
        label: 'Failed',
        background: colors.dangerSoft,
        ink: colors.dangerInk,
        icon: 'alert-circle-outline',
      };
  }
}

interface StatusPillProps {
  status: OrderStatus;
}

/** The per-order status pill: queued, syncing, synced or failed. */
export function StatusPill({ status }: StatusPillProps) {
  const presentation = statusPresentation(status);
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${presentation.label}`}
      style={[styles.pill, { backgroundColor: presentation.background }]}
    >
      <Ionicons name={presentation.icon} size={13} color={presentation.ink} />
      <Text style={[styles.text, { color: presentation.ink }]}>{presentation.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xxs,
    minHeight: 26,
    paddingHorizontal: space.sm + space.xxs / 2,
    borderRadius: radius.pill,
  },
  text: { ...textStyles.chip },
});
