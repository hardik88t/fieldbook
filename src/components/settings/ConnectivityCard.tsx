import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useConnectivity } from '@/state';
import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

/** Demo switch for the connection. Going online sends whatever is queued. */
export function ConnectivityCard() {
  const { online, setOnline } = useConnectivity();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Online connection"
        accessibilityHint="Turns the simulated connection on or off"
        accessibilityState={{ checked: online }}
        aria-checked={online}
        onPress={() => setOnline(!online)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.text}>
          <Text style={styles.title}>{online ? 'Online' : 'Offline'}</Text>
          <Text style={styles.meta}>
            {online ? 'Orders send as soon as they are saved' : 'Orders wait on this device'}
          </Text>
        </View>
        <Toggle on={online} />
      </Pressable>
      <Text style={styles.explain}>
        There is no real server in this demo. Switch to offline to see what a rep sees when the
        signal drops: orders keep saving on the device, then send in the order they were placed when
        you switch back online.
      </Text>
    </View>
  );
}

/** A switch drawn with Views. The whole row is the touch target, so it stays at 44 px or more. */
function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.track, { backgroundColor: on ? colors.accent : colors.railIdle }]}>
      <View style={[styles.thumb, on ? styles.thumbOn : styles.thumbOff]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  row: {
    minHeight: TOUCH_TARGET + space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  rowPressed: { opacity: 0.7 },
  text: { flex: 1, minWidth: 0, gap: space.xxs },
  title: { ...textStyles.subtitle, color: colors.ink },
  meta: { ...textStyles.meta, color: colors.inkMuted },
  explain: { ...textStyles.meta, color: colors.inkBody },
  track: {
    width: 52,
    height: 32,
    borderRadius: radius.pill,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  thumbOn: { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
});
