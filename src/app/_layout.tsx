import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { openAppDatabase } from '@/data/client';
import { BootGate } from '@/components/BootGate';
import { AppProvider } from '@/state';
import { colors, textStyles } from '@/theme';

/**
 * Composition root. Chooses the platform database (client.ts on native, client.web.ts on web)
 * and wraps the app in the state provider. Screens never open the database themselves.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider openDatabase={openAppDatabase}>
        <StatusBar style="dark" />
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
      </AppProvider>
    </SafeAreaProvider>
  );
}
