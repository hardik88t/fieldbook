import {
  applyBasisPoints,
  asPaise,
  addPaise,
  formatINR,
  multiplyPaise,
  parseRupeesInput,
  rupeesToPaise,
} from './money';

describe('formatINR', () => {
  it('formats whole rupees with the reference spacing and no decimals', () => {
    expect(formatINR(asPaise(0))).toBe('₹ 0');
    expect(formatINR(asPaise(57000))).toBe('₹ 570');
    expect(formatINR(asPaise(569100))).toBe('₹ 5,691');
  });

  it('groups digits the Indian way (lakh and crore)', () => {
    expect(formatINR(asPaise(123_456_700))).toBe('₹ 12,34,567');
    expect(formatINR(asPaise(10_000_000))).toBe('₹ 1,00,000');
    expect(formatINR(asPaise(1_000_000_000))).toBe('₹ 1,00,00,000');
  });

  it('shows paise to two decimals only when they are non-zero', () => {
    expect(formatINR(asPaise(123450))).toBe('₹ 1,234.50');
    expect(formatINR(asPaise(505))).toBe('₹ 5.05');
  });

  it('formats negative amounts with a leading minus sign', () => {
    expect(formatINR(asPaise(-15000))).toBe('-₹ 150');
  });
});

describe('rupeesToPaise and parseRupeesInput', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(rupeesToPaise(570)).toBe(57000);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise(1.005)).toBe(101);
  });

  it('rejects non-finite rupee amounts', () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(RangeError);
    expect(() => rupeesToPaise(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('parses typed amounts, tolerating rupee signs and separators', () => {
    expect(parseRupeesInput('1,234.5')).toBe(123450);
    expect(parseRupeesInput('₹ 99')).toBe(9900);
    expect(parseRupeesInput('0.05')).toBe(5);
  });

  it('returns null for invalid input instead of guessing', () => {
    expect(parseRupeesInput('')).toBeNull();
    expect(parseRupeesInput('abc')).toBeNull();
    expect(parseRupeesInput('1.234')).toBeNull();
  });
});

describe('paise arithmetic', () => {
  it('only accepts safe integers as paise', () => {
    expect(() => asPaise(1.5)).toThrow(RangeError);
    expect(() => asPaise(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });

  it('adds and multiplies integers', () => {
    expect(addPaise(asPaise(100), asPaise(250))).toBe(350);
    expect(multiplyPaise(asPaise(42000), 6)).toBe(252000);
  });

  it('rejects fractional quantities', () => {
    expect(() => multiplyPaise(asPaise(100), 1.5)).toThrow(RangeError);
  });

  it('applies GST basis points and rounds half up to the paisa', () => {
    expect(applyBasisPoints(asPaise(542000), 500)).toBe(27100);
    expect(applyBasisPoints(asPaise(10), 500)).toBe(1);
    expect(applyBasisPoints(asPaise(9), 500)).toBe(0);
  });
});
