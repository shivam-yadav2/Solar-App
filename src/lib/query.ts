import { useInfiniteQuery, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryClient } from './queryClient';

/**
 * Data hooks. Every query has an explicit key whose first part is the
 * resource ("customers", "payments"…). The old useFetch keyed queries by
 * fn.toString(), which Hermes reduces to "[bytecode]" — screens then shared
 * one cache entry and showed each other's data.
 */
export function useApi<T>(key: readonly unknown[], fn: () => Promise<T>, opts: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> = {}) {
  const q = useQuery<T>({ queryKey: key, queryFn: fn, ...opts });
  return {
    ...q,
    data: q.data,
    error: q.error ? (q.error as Error).message || 'Something went wrong' : null,
    loading: q.isPending,
    refreshing: q.isRefetching && !q.isPending,
    refresh: () => q.refetch(),
  };
}

export interface Page<I> { items: I[]; total: number; page: number; totalPages: number }

/** Paged list (load more on scroll). `fetchPage` returns one page from the server. */
export function usePaged<I>(key: readonly unknown[], fetchPage: (page: number, limit: number) => Promise<Page<I>>, limit = 30, opts: { enabled?: boolean } = {}) {
  const q = useInfiniteQuery({
    queryKey: [...key, { limit }],
    queryFn: ({ pageParam }) => fetchPage(pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (last: Page<I>) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: opts.enabled,
  });
  const items = q.data?.pages.flatMap((pg) => pg.items) ?? [];
  return {
    items,
    total: q.data?.pages[0]?.total ?? 0,
    loading: q.isPending,
    error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching && !q.isFetchingNextPage && !q.isPending,
    refresh: () => q.refetch(),
    loadMore: () => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); },
    loadingMore: q.isFetchingNextPage,
    hasMore: !!q.hasNextPage,
  };
}

/** Server list response → Page. */
export const toPage = <I>(items: I[] | undefined, r: { total?: number; page?: number; totalPages?: number }, page: number): Page<I> => ({
  items: items || [],
  total: r.total ?? (items?.length || 0),
  page: r.page ?? page,
  totalPages: r.totalPages ?? 1,
});

// After a change, refresh the lists it affects (not every cached screen).
const RELATED: Record<string, string[]> = {
  customers: ['customers', 'dashboard', 'search'],
  projects: ['projects', 'customers', 'dashboard', 'search', 'discom', 'boq', 'dpr', 'inventory'],
  payments: ['payments', 'invoices', 'customers', 'projects', 'dashboard', 'profit'],
  invoices: ['invoices', 'payments', 'customers', 'projects', 'dashboard'],
  expenses: ['expenses', 'projects', 'dashboard', 'profit'],
  leads: ['leads', 'customers', 'dashboard'],
  quotations: ['quotations', 'leads', 'dashboard'],
  complaints: ['complaints', 'customers', 'projects', 'dashboard'],
  warranties: ['warranties', 'customers', 'projects'],
  documents: ['documents', 'projects', 'customers'],
  inventory: ['inventory', 'boq', 'projects'],
  boq: ['boq', 'inventory', 'projects'],
  discom: ['discom', 'projects'],
  attendance: ['attendance', 'dpr'],
  payroll: ['payroll'],
  users: ['users', 'team'],
  roles: ['roles', 'users'],
  settings: ['settings', 'me'],
  notifications: ['notifications'],
  saas: ['saas'],
  plans: ['plans', 'saas'],
  support: ['support'],
  'recycle-bin': ['recycle-bin', 'customers', 'projects', 'leads', 'quotations'],
  'privacy-requests': ['privacy-requests'],
  security: ['security', 'me'],
  me: ['me'],
};

export function invalidateFor(url: string) {
  const path = url.split('?')[0].split('/').filter(Boolean);
  let seg = path[0] || '';
  if (seg === 'saas' && path[1] === 'support') seg = 'support';
  if (seg === 'projects' && ['boq', 'discom', 'dpr'].includes(path[2])) seg = path[2] === 'dpr' ? 'attendance' : path[2];
  if (seg === 'auth') return;
  const keys = RELATED[seg] || [seg];
  void queryClient.invalidateQueries({ predicate: (q) => keys.includes(String(q.queryKey[0])) });
}
