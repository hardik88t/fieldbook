import {
  addPaise,
  applyBasisPoints,
  asPaise,
  multiplyPaise,
  ZERO_PAISE,
  type Paise,
} from '@/money';
import type { Totals } from './types';

/** GST on the cart, in basis points (500 = 5%). The reference design shows GST 5%. */
export const GST_BASIS_POINTS = 500;

/** Largest quantity a single cart line can hold. */
export const MAX_LINE_QTY = 99;

export interface PricedLine {
  unitPricePaise: Paise;
  qty: number;
}

export function assertValidQty(qty: number): void {
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_LINE_QTY) {
    throw new RangeError(
      `Quantity must be an integer between 0 and ${MAX_LINE_QTY}, received ${qty}`,
    );
  }
}

/** Subtotal, GST and total for priced lines. Lines with qty 0 contribute nothing. */
export function computeTotals(lines: readonly PricedLine[]): Totals {
  const subtotalPaise = addPaise(
    ...lines.map((line) => {
      assertValidQty(line.qty);
      return multiplyPaise(line.unitPricePaise, line.qty);
    }),
  );
  const gstPaise = applyBasisPoints(subtotalPaise, GST_BASIS_POINTS);
  return {
    subtotalPaise,
    gstPaise,
    totalPaise: addPaise(subtotalPaise, gstPaise),
  };
}

export function lineTotal(unitPricePaise: Paise, qty: number): Paise {
  assertValidQty(qty);
  return qty === 0 ? ZERO_PAISE : multiplyPaise(unitPricePaise, qty);
}

export const EMPTY_TOTALS: Totals = {
  subtotalPaise: asPaise(0),
  gstPaise: asPaise(0),
  totalPaise: asPaise(0),
};
