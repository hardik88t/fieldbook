import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineConfirm } from '@/components/cart/InlineConfirm';
import { InlineNotice, type NoticeTone } from '@/components/cart/InlineNotice';
import { useAppActions } from '@/state';
import { colors, radius, space, textStyles, TOUCH_TARGET } from '@/theme';

interface Notice {
  tone: NoticeTone;
  text: string;
}

/**
 * Puts the demo back to its seed data. Two steps: the button asks, and an inline confirm runs the
 * reset only when the user confirms it. No Alert is used.
 */
export function DemoDataCard() {
  const { resetDemoData } = useAppActions();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function reset(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await resetDemoData();
      setConfirming(false);
      setNotice({ tone: 'success', text: 'Demo data reset to the start of the day.' });
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: error instanceof Error && error.message ? error.message : 'Reset failed. Try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.explain}>
        Puts the route, catalogue, cart and orders back to the seed data on this device.
      </Text>

      {confirming ? (
        <InlineConfirm
          message="Reset the demo? This removes every order on this device, including any not yet synced, and empties the cart."
          confirmLabel="Reset demo data"
          busy={busy}
          onConfirm={() => void reset()}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset demo data"
          accessibilityHint="Asks for confirmation before anything is removed"
          onPress={() => {
            setNotice(null);
            setConfirming(true);
          }}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Reset demo data</Text>
        </Pressable>
      )}

      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  explain: { ...textStyles.meta, color: colors.inkBody },
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.dangerInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.dangerSoft },
  buttonText: { ...textStyles.buttonSmall, color: colors.dangerInk },
});
