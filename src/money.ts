/**
 * Money helpers. All money in Fieldbook is an integer number of paise (1 INR = 100 paise).
 * Never store or compute money as a floating point rupee value.
 */

export const PAISE_PER_RUPEE = 100;

/** A non-negative or negative integer amount in paise. Created only through the helpers below. */
export type Paise = number & { readonly __brand: 'Paise' };

export function asPaise(value: number): Paise {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Paise must be a safe integer, received ${value}`);
  }
  return value as Paise;
}

export const ZERO_PAISE: Paise = asPaise(0);

/** Converts a rupee amount (for example a seed price like 42.5) to paise, rounding to the nearest paisa. */
export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) {
    throw new RangeError(`Rupee amount must be finite, received ${rupees}`);
  }
  // toPrecision strips binary float noise (1.005 * 100 = 100.49999...) before rounding.
  return asPaise(Math.round(Number((rupees * PAISE_PER_RUPEE).toPrecision(15))));
}

/**
 * Parses user input such as "1,234", "₹ 1,234.5" or "99.99" into paise.
 * Returns null for anything that is not a valid amount with at most two decimal places.
 */
export function parseRupeesInput(input: string): Paise | null {
  const cleaned = input.replace(/₹/g, '').replace(/,/g, '').replace(/\s+/g, '').trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, sign, whole, fraction = ''] = match;
  const paise = Number(whole) * PAISE_PER_RUPEE + Number(fraction.padEnd(2, '0'));
  return asPaise(sign === '-' ? -paise : paise);
}

export function addPaise(...values: Paise[]): Paise {
  let total = 0;
  for (const value of values) total += value;
  return asPaise(total);
}

/** Multiplies a unit price by an integer quantity. */
export function multiplyPaise(unit: Paise, quantity: number): Paise {
  if (!Number.isSafeInteger(quantity)) {
    throw new RangeError(`Quantity must be an integer, received ${quantity}`);
  }
  return asPaise(unit * quantity);
}

/**
 * Applies a rate expressed in basis points (500 = 5%) and rounds half up to the nearest paisa.
 * Amounts are expected to be non-negative.
 */
export function applyBasisPoints(amount: Paise, basisPoints: number): Paise {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new RangeError(`Basis points must be a non-negative integer, received ${basisPoints}`);
  }
  return asPaise(Math.floor((amount * basisPoints + 5000) / 10000));
}

/** Groups digits the Indian way: 1234567 becomes "12,34,567". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${digits.slice(-3)}`;
}

/**
 * Formats paise as an en-IN rupee string with the reference's spacing: "₹ 5,691", "₹ 1,00,000".
 * Whole-rupee amounts show no decimals; any paise are shown to two decimals so nothing is hidden.
 * Implemented by hand (not Intl) so Hermes and older runtimes format identically.
 */
export function formatINR(amount: Paise): string {
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const rupees = Math.floor(absolute / PAISE_PER_RUPEE);
  const remainder = absolute % PAISE_PER_RUPEE;
  const body =
    remainder === 0
      ? groupIndian(String(rupees))
      : `${groupIndian(String(rupees))}.${String(remainder).padStart(2, '0')}`;
  return `${negative ? '-' : ''}₹ ${body}`;
}
