import { StyleSheet, Text, View } from 'react-native';

import { colors, space, textStyles } from '@/theme';

import { formatLongDate, greetingFor } from './summary';

interface RouteHeaderProps {
  now: Date;
}

/** Greeting over the day's date. The native tab header already names the screen. */
export function RouteHeader({ now }: RouteHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greetingFor(now)}</Text>
      <Text style={styles.date} accessibilityRole="header">
        {formatLongDate(now)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.xxs,
    paddingTop: space.sm,
  },
  greeting: { ...textStyles.greeting, color: colors.inkMuted },
  date: { ...textStyles.title, color: colors.ink },
});
