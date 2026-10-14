import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { ProductGlyph, ProductTone } from '@/domain/types';
import { colors, radius } from '@/theme';

/** One shape of a glyph, on an 80 x 88 design grid (the portfolio reference silhouettes). */
interface Part {
  kind: 'solid' | 'label' | 'handle';
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

const DESIGN_WIDTH = 80;
const DESIGN_HEIGHT = 88;
/** Scales the design grid to about 58 x 63 px, as in the reference. */
const SCALE = 0.72;

const GLYPHS: Record<ProductGlyph, Part[]> = {
  bag: [
    { kind: 'handle', x: 30, y: 13, w: 20, h: 12, r: 10 },
    { kind: 'solid', x: 21, y: 22, w: 38, h: 62, r: 4 },
    { kind: 'label', x: 27, y: 44, w: 26, h: 14, r: 3 },
  ],
  bottle: [
    { kind: 'solid', x: 32, y: 6, w: 16, h: 12, r: 3 },
    { kind: 'solid', x: 26, y: 22, w: 28, h: 54, r: 8 },
    { kind: 'label', x: 31, y: 44, w: 18, h: 16, r: 3 },
  ],
  tin: [
    { kind: 'solid', x: 18, y: 12, w: 44, h: 12, r: 3 },
    { kind: 'solid', x: 16, y: 24, w: 48, h: 56, r: 8 },
    { kind: 'label', x: 24, y: 40, w: 32, h: 18, r: 3 },
  ],
  tub: [
    { kind: 'solid', x: 6, y: 24, w: 68, h: 12, r: 5 },
    { kind: 'solid', x: 10, y: 34, w: 60, h: 36, r: 8 },
    { kind: 'label', x: 22, y: 44, w: 36, h: 14, r: 3 },
  ],
};

function partStyle(part: Part, ink: string): ViewStyle {
  const box: ViewStyle = {
    position: 'absolute',
    left: part.x * SCALE,
    top: part.y * SCALE,
    width: part.w * SCALE,
    height: part.h * SCALE,
  };
  if (part.kind === 'handle') {
    // An open arch: top and side strokes only, so it joins the bag body without a bottom edge.
    return {
      ...box,
      borderWidth: 4 * SCALE,
      borderBottomWidth: 0,
      borderColor: ink,
      borderTopLeftRadius: part.r * SCALE,
      borderTopRightRadius: part.r * SCALE,
    };
  }
  if (part.kind === 'label') {
    return {
      ...box,
      borderRadius: part.r * SCALE,
      backgroundColor: colors.surface,
      opacity: 0.92,
    };
  }
  return { ...box, borderRadius: part.r * SCALE, backgroundColor: ink };
}

interface ProductTileProps {
  tone: ProductTone;
  glyph: ProductGlyph;
}

/** Coloured tile with a simple product silhouette drawn from plain views. No images. */
export function ProductTile({ tone, glyph }: ProductTileProps) {
  const palette = colors.tone[tone];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.tile, { backgroundColor: palette.background }]}
    >
      <View style={styles.art}>
        {GLYPHS[glyph].map((part, index) => (
          <View key={index} style={partStyle(part, palette.ink)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    height: 96,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: {
    width: DESIGN_WIDTH * SCALE,
    height: DESIGN_HEIGHT * SCALE,
  },
});
