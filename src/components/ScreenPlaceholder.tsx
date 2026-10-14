import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, textStyles } from '@/theme';

interface ScreenPlaceholderProps {
  title: string;
  /** Which Phase B task builds this screen. Shown on screen so the gap is never silent. */
  phaseTask: string;
}

/** Stand-in body for a screen that Phase B will build. Delete it when the real screen lands. */
export function ScreenPlaceholder({ title, phaseTask }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container} accessibilityLabel={`${title} placeholder`}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>Placeholder. Built in {phaseTask}.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: space.xl,
    justifyContent: 'center',
  },
  card: {
    padding: space.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
  title: { ...textStyles.subtitle, color: colors.ink },
  body: { ...textStyles.body, color: colors.inkMuted },
});
