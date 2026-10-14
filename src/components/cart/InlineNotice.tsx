import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, textStyles } from '@/theme';

export type NoticeTone = 'info' | 'success' | 'danger';

interface InlineNoticeProps {
  tone: NoticeTone;
  children: ReactNode;
}

const TONES: Record<NoticeTone, { background: string; ink: string; border: string }> = {
  info: { background: colors.surfaceTint, ink: colors.accentInk, border: colors.surfaceAccent },
  success: { background: colors.successSoft, ink: colors.successInk, border: colors.successSoft },
  danger: { background: colors.dangerSoft, ink: colors.dangerInk, border: colors.dangerSoft },
};

/** A short message shown in place (never a toast). Errors use the danger tone. */
export function InlineNotice({ tone, children }: InlineNoticeProps) {
  const palette = TONES[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: palette.background, borderColor: palette.border }]}
    >
      <Text style={[styles.text, { color: palette.ink }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  text: { ...textStyles.bodyStrong },
});
