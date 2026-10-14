import { StyleSheet, Text, View } from 'react-native';

import { formatINR, type CartLineView } from '@/state';
import { colors, fontSize, fontWeight, space, textStyles } from '@/theme';

import { ProductTile } from './ProductTile';
import { QuantityStepper } from './QuantityStepper';

interface CartLineRowProps {
  line: CartLineView;
  onChangeQty: (productId: string, qty: number) => Promise<void>;
}

/** One cart line: tile, name, pack and unit price, stepper, and the line total. */
export function CartLineRow({ line, onChangeQty }: CartLineRowProps) {
  return (
    <View style={styles.row}>
      <ProductTile tone={line.tone} glyph={line.glyph} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {line.name}
        </Text>
        <Text style={styles.meta}>{`${line.pack} · ${formatINR(line.unitPricePaise)} each`}</Text>
        <View style={styles.stepper}>
          <QuantityStepper
            name={line.name}
            qty={line.qty}
            onChange={(qty) => onChangeQty(line.productId, qty)}
          />
        </View>
      </View>
      <Text style={styles.total}>{formatINR(line.linePaise)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  body: { flex: 1, minWidth: 0 },
  name: { ...textStyles.productName, color: colors.ink },
  meta: { ...textStyles.meta, color: colors.inkMuted, marginTop: space.xxs },
  stepper: { marginTop: space.sm },
  total: {
    ...textStyles.price,
    color: colors.ink,
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.black,
    fontVariant: ['tabular-nums'],
    paddingTop: space.xs,
  },
});
