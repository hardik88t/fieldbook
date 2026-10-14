import { StyleSheet, Text, View } from 'react-native';

import type { Totals } from '@/domain/types';
import { formatINR } from '@/state';
import { colors, space, textStyles } from '@/theme';

interface TotalsSummaryProps {
  totals: Totals;
}

/** Subtotal, GST and total. Amounts come from the hooks, never recomputed here. */
export function TotalsSummary({ totals }: TotalsSummaryProps) {
  return (
    <View style={styles.box}>
      <Row label="Subtotal" value={formatINR(totals.subtotalPaise)} />
      <Row label="GST 5%" value={formatINR(totals.gstPaise)} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatINR(totals.totalPaise)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: space.lg, gap: space.xxs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 26,
    alignItems: 'center',
  },
  label: { ...textStyles.body, color: colors.inkBody },
  value: { ...textStyles.body, color: colors.inkBody, fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xs,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
  totalLabel: { ...textStyles.totalLarge, color: colors.ink },
  totalValue: {
    ...textStyles.totalLarge,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
