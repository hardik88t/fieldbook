import { addDays, daysAgo, localDateKey, startOfLocalDay } from './dates';

describe('localDateKey', () => {
  it('returns the local calendar day as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 9, 4, 23, 59))).toBe('2026-10-04');
    expect(localDateKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('daysAgo', () => {
  const now = new Date(2026, 9, 14, 9, 30);

  it('counts whole local calendar days, not 24-hour periods', () => {
    expect(daysAgo(new Date(2026, 9, 5, 23, 0).toISOString(), now)).toBe(9);
    expect(daysAgo(new Date(2026, 9, 14, 0, 5).toISOString(), now)).toBe(0);
  });
});

describe('addDays', () => {
  it('crosses month boundaries and keeps the local time', () => {
    const next = addDays(new Date(2026, 9, 30, 10, 15), 3);
    expect(localDateKey(next)).toBe('2026-11-02');
    expect(next.getHours()).toBe(10);
  });
});

describe('startOfLocalDay', () => {
  it('returns local midnight of the same day', () => {
    const start = startOfLocalDay(new Date(2026, 9, 14, 17, 45));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(localDateKey(start)).toBe('2026-10-14');
  });
});
