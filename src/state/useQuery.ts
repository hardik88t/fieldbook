import { useEffect, useState, useSyncExternalStore } from 'react';

import type { Repositories } from '@/data/repositories';

import { useAppContext } from './AppContext';

export interface Query<T> {
  /** undefined until the first load completes. */
  data: T | undefined;
  error: Error | null;
  /** True until the first load completes. Stays false while later reloads run. */
  loading: boolean;
  /** Re-runs the query now. */
  refresh: () => void;
}

/**
 * Runs `load` against the repositories once the app is ready, and again after any write.
 * `deps` works like useEffect deps: pass the values `load` closes over.
 */
export function useQuery<T>(
  load: (repos: Repositories) => Promise<T>,
  deps: readonly unknown[] = [],
): Query<T> {
  const { services } = useAppContext();
  const repos = services?.repos ?? null;
  const bus = services?.bus ?? null;
  const version = useSyncExternalStore(
    bus ? bus.subscribe : noopSubscribe,
    bus ? bus.getVersion : zero,
    zero,
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [result, setResult] = useState<{ data: T | undefined; error: Error | null }>({
    data: undefined,
    error: null,
  });

  useEffect(() => {
    if (!repos) return undefined;
    let cancelled = false;
    load(repos).then(
      (data) => {
        if (!cancelled) setResult({ data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setResult((previous) => ({
            data: previous.data,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // The caller controls re-runs through deps and the change bus, so `load` is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, version, refreshToken, ...deps]);

  return {
    data: result.data,
    error: result.error,
    loading: result.data === undefined && result.error === null,
    refresh: () => setRefreshToken((token) => token + 1),
  };
}

const noopSubscribe = () => () => undefined;
const zero = () => 0;
