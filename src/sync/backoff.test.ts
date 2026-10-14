import { backoffDelayMs, BACKOFF_MAX_MS } from './backoff';

describe('backoffDelayMs', () => {
  it('doubles from 2 seconds: 2s, 4s, 8s, 16s', () => {
    expect([1, 2, 3, 4].map((attempt) => backoffDelayMs(attempt))).toEqual([
      2000, 4000, 8000, 16000,
    ]);
  });

  it('caps at five minutes', () => {
    expect(backoffDelayMs(20)).toBe(BACKOFF_MAX_MS);
    expect(backoffDelayMs(10)).toBe(BACKOFF_MAX_MS);
  });

  it('rejects attempts below one', () => {
    expect(() => backoffDelayMs(0)).toThrow(RangeError);
    expect(() => backoffDelayMs(1.5)).toThrow(RangeError);
  });
});
