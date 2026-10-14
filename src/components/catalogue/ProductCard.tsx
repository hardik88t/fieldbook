import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Product } from '@/domain/types';
import { formatINR } from '@/state';
import { colors, radius, space, textStyles } from '@/theme';

import { CartControl } from './CartControl';
import { ProductTile } from './ProductTile';

interface ProductCardProps {
  product: Product;
  qty: number;
  canAdd: boolean;
  busy: boolean;
  onAdd: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
}

/** One catalogue cell: tile, name, pack size, price and the add or stepper control. */
export const ProductCard = memo(function ProductCard({
  product,
  qty,
  canAdd,
  busy,
  onAdd,
  onSetQty,
}: ProductCardProps) {
  const handleAdd = useCallback(() => onAdd(product.id), [onAdd, product.id]);
  const handleChange = useCallback(
    (next: number) => onSetQty(product.id, next),
    [onSetQty, product.id],
  );

  return (
    <View style={styles.card}>
      <ProductTile tone={product.tone} glyph={product.glyph} />
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.pack} numberOfLines={1}>
        {product.pack}
      </Text>
      <Text style={styles.price}>{formatINR(product.pricePaise)}</Text>
      <CartControl
        productName={product.name}
        qty={qty}
        canAdd={canAdd}
        busy={busy}
        onAdd={handleAdd}
        onChange={handleChange}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: space.sm,
    marginBottom: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: {
    ...textStyles.productName,
    minHeight: 36,
    marginTop: space.sm,
    color: colors.ink,
  },
  pack: { ...textStyles.meta, color: colors.inkMuted },
  price: {
    ...textStyles.price,
    marginTop: space.sm,
    marginBottom: space.sm,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
