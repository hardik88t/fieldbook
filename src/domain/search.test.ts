import { matchesQuery, normalizeForSearch } from './search';

describe('normalizeForSearch', () => {
  it('ignores case, diacritics and extra whitespace', () => {
    expect(normalizeForSearch('  Jalébi   MIX ')).toBe('jalebi mix');
    expect(normalizeForSearch('Crème Brûlée')).toBe('creme brulee');
  });
});

describe('matchesQuery', () => {
  it('requires every term to appear, in any order', () => {
    expect(matchesQuery('Basmati Rice Gold 5 kg bag', 'gold rice')).toBe(true);
    expect(matchesQuery('Basmati Rice Gold 5 kg bag', 'rice oil')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesQuery('anything', '   ')).toBe(true);
  });

  it('matches diacritic-free queries against accented names', () => {
    expect(matchesQuery('Besan Jalébi Mix', 'jalebi')).toBe(true);
  });
});
