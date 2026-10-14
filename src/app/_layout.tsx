import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { openAppDatabase } from '@/data/client';
import { BootGate } from '@/components/BootGate';
import { AppProvider } from '@/state';
import { colors, textStyles } from '@/theme';

/**
 * Composition root. Chooses the platform database (client.ts on native, client.web.ts on web)
 * and wraps the app in the state provider. Screens never open the database themselves.
 *
 * The app is laid out for a phone. On a wide web window it sits in a phone-width column in the
 * middle of the page. On a phone the column is the full width, so nothing changes there.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider openDatabase={openAppDatabase}>
        <StatusBar style="dark" />
        <View style={styles.stage}>
          <View style={styles.column}>
            <BootGate>
              <Stack
                screenOptions={{
                  headerTintColor: colors.ink,
                  headerTitleStyle: { ...textStyles.subtitle, color: colors.ink },
                  headerStyle: { backgroundColor: colors.background },
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ title: 'Settings' }} />
              </Stack>
            </BootGate>
          </View>
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.stage,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.background,
    ...Platform.select({
      web: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderStrong },
      default: {},
    }),
  },
});
