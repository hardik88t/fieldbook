/**
 * Normalises text for search: case-insensitive and diacritic-insensitive, with collapsed whitespace.
 * "Jalébi" and "jalebi" match the same query.
 */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True when every whitespace-separated term of the query appears in the haystack. */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = normalizeForSearch(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const normalized = normalizeForSearch(haystack);
  return terms.every((term) => normalized.includes(term));
}
