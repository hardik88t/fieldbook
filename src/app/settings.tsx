import { ScrollView, StyleSheet } from 'react-native';

import { AboutCard } from '@/components/settings/AboutCard';
import { ConnectivityCard } from '@/components/settings/ConnectivityCard';
import { DemoDataCard } from '@/components/settings/DemoDataCard';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { colors, PAGE_GUTTER, space } from '@/theme';

/** Settings, opened from the header button: the demo connection switch, reset, and About. */
export default function SettingsScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SettingsSection title="Demo connection">
        <ConnectivityCard />
      </SettingsSection>

      <SettingsSection title="Demo data">
        <DemoDataCard />
      </SettingsSection>

      <SettingsSection title="About">
        <AboutCard />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
});
