import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '@/state';
import { colors, space, TOUCH_TARGET } from '@/theme';

/** Icon and label need about 64 px. The bottom safe-area inset is added on top of this. */
const TAB_BAR_HEIGHT = 64;

function SettingsButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      onPress={() => router.push('/settings')}
      style={styles.settingsButton}
      hitSlop={8}
    >
      <Ionicons name="settings-outline" size={22} color={colors.inkStrong} />
    </Pressable>
  );
}

/** Bottom tabs: Route, Catalogue, Cart, Orders. Settings is reached from the header button. */
export default function TabsLayout() {
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <SettingsButton />,
        headerTitleStyle: { color: colors.ink, fontWeight: '800' },
        headerStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: space.xs,
          paddingBottom: insets.bottom + space.xs,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11.5 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="route"
        options={{
          title: "Today's route",
          tabBarLabel: 'Route',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: 'Catalogue',
          tabBarLabel: 'Catalogue',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarLabel: 'Cart',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onAccent },
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'bag-handle' : 'bag-handle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
