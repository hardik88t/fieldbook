import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

export const APP_VERSION = '0.1.0';
export const SOURCE_URL = 'https://github.com/hardik88t/fieldbook';

interface AboutRow {
  label: string;
  value: string;
  url?: string;
}

const ROWS: AboutRow[] = [
  { label: 'Version', value: APP_VERSION },
  {
    label: 'Storage',
    value: Platform.OS === 'web' ? 'This browser (IndexedDB)' : 'This device (SQLite)',
  },
  { label: 'Server', value: 'Simulated for this demo' },
  { label: 'Licence', value: 'MIT' },
  { label: 'Source', value: 'github.com/hardik88t/fieldbook', url: SOURCE_URL },
];

/** What the app is, what is simulated, and where the source lives. */
export function AboutCard() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>
        Fieldbook is an offline-first route, catalogue and order app for field sales reps. Shops,
        products and prices in this build are sample data.
      </Text>
      <View style={styles.table}>
        {ROWS.map((row, index) => (
          <AboutLine key={row.label} row={row} divider={index > 0} />
        ))}
      </View>
    </View>
  );
}

function AboutLine({ row, divider }: { row: AboutRow; divider: boolean }) {
  const content = (
    <>
      <Text style={styles.label}>{row.label}</Text>
      <Text style={[styles.value, row.url ? styles.link : null]} numberOfLines={1}>
        {row.value}
      </Text>
    </>
  );

  const rowStyle = [styles.line, divider && styles.divider];

  if (!row.url) {
    return <View style={rowStyle}>{content}</View>;
  }
  const url = row.url;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${row.label}: ${row.value}`}
      onPress={() => void Linking.openURL(url)}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  intro: { ...textStyles.body, color: colors.inkBody },
  table: { gap: 0 },
  line: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  pressed: { opacity: 0.6 },
  label: { ...textStyles.body, color: colors.inkMuted },
  value: {
    ...textStyles.bodyStrong,
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  link: { color: colors.accentInk, textDecorationLine: 'underline' },
});
