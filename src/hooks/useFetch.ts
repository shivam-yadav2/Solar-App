import { useState, useEffect, useCallback } from 'react';

/**
 * Small fetch-with-state helper. Every list/detail screen in this app follows
 * the same load → loading/error/data → pull-to-refresh shape, so it lives
 * here once instead of being repeated per screen.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const run = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);
      try {
        setData(await fn());
      } catch (err: any) {
        setError(err?.message || 'Something went wrong');
      } finally {
        isRefresh ? setIsRefreshing(false) : setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, isLoading, isRefreshing, refresh: () => run(true), reload: () => run() };
}
