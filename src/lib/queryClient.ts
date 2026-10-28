import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

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
      retry: (failureCount, error) => failureCount < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
      retryDelay: (attempt) => Math.min(500 * (2 ** attempt), 4000),
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});
