import { StyleSheet, View } from 'react-native';

import type { ProductGlyph, ProductTone } from '@/domain/types';
import { colors, radius } from '@/theme';

interface ProductTileProps {
  tone: ProductTone;
  glyph: ProductGlyph;
}

const TILE = 56;

/**
 * A product image placeholder: a tinted tile with a simple package silhouette drawn from Views.
 * Decorative only, so it is hidden from assistive technology.
 */
export function ProductTile({ tone, glyph }: ProductTileProps) {
  const palette = colors.tone[tone];
  return (
    <View style={[styles.tile, { backgroundColor: palette.background }]} accessible={false}>
      <Glyph kind={glyph} ink={palette.ink} />
    </View>
  );
}

function Glyph({ kind, ink }: { kind: ProductGlyph; ink: string }) {
  switch (kind) {
    case 'bag':
      return (
        <View style={styles.glyph}>
          <View style={[styles.bagHandle, { borderColor: ink }]} />
          <View style={[styles.bagBody, { backgroundColor: ink }]}>
            <View style={styles.label} />
          </View>
        </View>
      );
    case 'bottle':
      return (
        <View style={styles.glyph}>
          <View style={[styles.bottleCap, { backgroundColor: ink }]} />
          <View style={[styles.bottleBody, { backgroundColor: ink }]}>
            <View style={styles.label} />
          </View>
        </View>
      );
    case 'tin':
      return (
        <View style={styles.glyph}>
          <View style={[styles.tinLid, { backgroundColor: ink }]} />
          <View style={[styles.tinBody, { backgroundColor: ink }]}>
            <View style={styles.label} />
          </View>
        </View>
      );
    case 'tub':
      return (
        <View style={styles.glyph}>
          <View style={[styles.tubLid, { backgroundColor: ink }]} />
          <View style={[styles.tubBody, { backgroundColor: ink }]}>
            <View style={styles.labelWide} />
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { width: 30, height: 38, alignItems: 'center' },
  label: {
    width: 14,
    height: 9,
    marginTop: 12,
    borderRadius: 3,
    backgroundColor: colors.surface,
    opacity: 0.92,
  },
  labelWide: {
    width: 22,
    height: 8,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: colors.surface,
    opacity: 0.92,
  },
  bagHandle: {
    width: 14,
    height: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 3,
    borderBottomWidth: 0,
  },
  bagBody: { width: 28, height: 30, borderRadius: 4, alignItems: 'center' },
  bottleCap: { width: 12, height: 6, borderRadius: 2 },
  bottleBody: {
    width: 22,
    height: 32,
    marginTop: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  tinLid: { width: 26, height: 6, borderRadius: 2 },
  tinBody: { width: 28, height: 30, marginTop: 2, borderRadius: 7, alignItems: 'center' },
  tubLid: { width: 30, height: 7, borderRadius: 3 },
  tubBody: {
    width: 30,
    height: 20,
    marginTop: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
});
