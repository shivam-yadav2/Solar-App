import { QueryClient } from '@tanstack/react-query';

export const QUERY_STALE_TIME = 2 * 60 * 1000;
export const QUERY_GC_TIME = 15 * 60 * 1000;

/**
 * One cache shared by the entire native app. Data stays in memory only so
 * customer and financial records are not written to unencrypted storage.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      retry: 1,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

