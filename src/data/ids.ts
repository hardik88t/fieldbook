/** Client-generated, sortable-enough identifiers. Order ids double as idempotency keys. */
export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
