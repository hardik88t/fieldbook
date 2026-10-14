import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAppStatus } from '@/state';
import { colors, space, textStyles } from '@/theme';

/** Renders children only once the database is open and seeded, so screens can assume it. */
export function BootGate({ children }: { children: ReactNode }) {
  const { status, error } = useAppStatus();

  if (status === 'error') {
    return (
      <View style={styles.center} accessibilityRole="alert">
        <Text style={styles.title}>Fieldbook could not start</Text>
        <Text style={styles.body}>{error ?? 'Unknown error'}</Text>
      </View>
    );
  }
  if (status !== 'ready') {
    return (
      <View style={styles.center} accessibilityLabel="Loading Fieldbook">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.xl,
    backgroundColor: colors.background,
  },
  title: { ...textStyles.subtitle, color: colors.ink },
  body: { ...textStyles.body, color: colors.inkMuted, textAlign: 'center' },
});
