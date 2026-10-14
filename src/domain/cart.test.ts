import { asPaise } from '@/money';

import { computeTotals, lineTotal, MAX_LINE_QTY } from './cart';

describe('computeTotals', () => {
  it('reproduces the reference cart: subtotal 5,420, GST 271, total 5,691', () => {
    const totals = computeTotals([
      { unitPricePaise: asPaise(57000), qty: 2 },
      { unitPricePaise: asPaise(42000), qty: 6 },
      { unitPricePaise: asPaise(88000), qty: 2 },
    ]);
    expect(totals.subtotalPaise).toBe(542000);
    expect(totals.gstPaise).toBe(27100);
    expect(totals.totalPaise).toBe(569100);
  });

  it('is all zeros for an empty cart', () => {
    expect(computeTotals([])).toEqual({ subtotalPaise: 0, gstPaise: 0, totalPaise: 0 });
  });

  it('ignores lines with quantity 0', () => {
    const totals = computeTotals([
      { unitPricePaise: asPaise(10000), qty: 0 },
      { unitPricePaise: asPaise(10000), qty: 1 },
    ]);
    expect(totals.subtotalPaise).toBe(10000);
  });

  it('rejects quantities outside 0..99 and non-integers', () => {
    expect(() => computeTotals([{ unitPricePaise: asPaise(100), qty: MAX_LINE_QTY + 1 }])).toThrow(
      RangeError,
    );
    expect(() => computeTotals([{ unitPricePaise: asPaise(100), qty: -1 }])).toThrow(RangeError);
    expect(() => computeTotals([{ unitPricePaise: asPaise(100), qty: 2.5 }])).toThrow(RangeError);
  });
});

describe('lineTotal', () => {
  it('multiplies unit price by quantity in paise', () => {
    expect(lineTotal(asPaise(88000), 2)).toBe(176000);
    expect(lineTotal(asPaise(88000), 0)).toBe(0);
  });
});
