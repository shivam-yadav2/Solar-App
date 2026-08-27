import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

type UseFetchOptions = {
  queryKey?: readonly unknown[];
  staleTime?: number;
};

/**
 * Small fetch-with-state helper. Every list/detail screen in this app follows
 * the same load → loading/error/data → pull-to-refresh shape, so it lives
 * here once instead of being repeated per screen.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = [], options: UseFetchOptions = {}) {
  const fallbackKey = fn.toString().replace(/\s+/g, ' ');
  const queryKey = useMemo(
    () => options.queryKey ?? ['screen-fetch', fallbackKey, ...deps],
    // The dependency list is the public contract of this compatibility hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.queryKey, fallbackKey, ...deps]
  );

  const query = useQuery<T>({
    queryKey,
    queryFn: fn,
    staleTime: options.staleTime,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Something went wrong' : null,
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    refresh,
    reload: refresh,
  };
}
