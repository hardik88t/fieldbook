import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, fontWeight, radius, space, textStyles } from '@/theme';

interface CustomerHeaderProps {
  name: string;
  /** For example "Stop 2 · Paldi". */
  meta: string;
}

/** The shop this cart belongs to, with the "Saved on this device" chip. */
export function CustomerHeader({ name, meta }: CustomerHeaderProps) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Cart for ${name}, ${meta}. Saved on this device.`}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.chip}>
        <Ionicons name="checkmark" size={13} color={colors.successInk} />
        <Text style={styles.chipText}>Saved on this device</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceMuted,
  },
  text: { flex: 1, minWidth: 0 },
  name: { ...textStyles.shopName, color: colors.ink },
  meta: { ...textStyles.meta, color: colors.inkMuted },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    flexShrink: 0,
    paddingHorizontal: space.sm + space.xxs / 2,
    paddingVertical: space.xs + space.xxs / 2,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  chipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.extrabold,
    color: colors.successInk,
  },
});
