/** Delay before the next attempt, after `attempt` failed attempts (attempt >= 1). */
export const BACKOFF_BASE_MS = 2_000;
export const BACKOFF_MAX_MS = 5 * 60_000;
/** After this many transient failures an order is parked until the user retries it. */
export const MAX_ATTEMPTS = 8;

/** Exponential: 2s, 4s, 8s, 16s, ... capped at 5 minutes. Deterministic so it can be tested. */
export function backoffDelayMs(
  attempt: number,
  options: { baseMs?: number; maxMs?: number } = {},
): number {
  const baseMs = options.baseMs ?? BACKOFF_BASE_MS;
  const maxMs = options.maxMs ?? BACKOFF_MAX_MS;
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(`attempt must be an integer >= 1, received ${attempt}`);
  }
  return Math.min(maxMs, baseMs * 2 ** (attempt - 1));
}
