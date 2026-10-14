import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, textStyles } from '@/theme';

interface OrderSectionProps {
  title: string;
  children: ReactNode;
}

/** A titled white card used for the sections of the order detail. */
export function OrderSection({ title, children }: OrderSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  title: { ...textStyles.bodyStrong, color: colors.inkStrong, marginTop: space.xs },
  card: {
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
