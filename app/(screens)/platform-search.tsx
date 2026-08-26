import React, { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Badge, Card, EmptyState, ErrorState, Loading, Screen, SearchField } from '../../src/components/ui';

export default function PlatformSearchScreen() {
  const router = useRouter(); const [query, setQuery] = useState(''); const [debounced, setDebounced] = useState(''); React.useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 350); return () => clearTimeout(timer); }, [query]);
  const state = useFetch(() => debounced ? api.searchPlatform(debounced) : Promise.resolve({ users: [], complaints: [] }), [debounced]); const users = state.data?.users ?? []; const complaints = state.data?.complaints ?? [];
  return <Screen title="Platform Search" subtitle="Search users and tickets across tenants" onBack={() => router.back()}><SearchField value={query} onChangeText={setQuery} placeholder="Search email, user, ticket…" />
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : !debounced ? <EmptyState message="Enter a search term." /> : users.length + complaints.length === 0 ? <EmptyState message={`No results for “${debounced}”.`} /> : <>
      {users.map((item: any) => <Card key={`u-${item.id}`}><Badge text="User" /><Text className="text-sm font-bold text-slate-900 mt-2">{item.username}</Text><Text className="text-xs text-slate-500 mt-1">{item.email}</Text><Text className="text-[10px] text-slate-400 mt-1">{item.tenantName || item.tenantSlug || 'Platform'}</Text></Card>)}
      {complaints.map((item: any) => <Card key={`c-${item.id}`}><Badge text={item.status || 'Ticket'} tone="amber" /><Text className="text-sm font-bold text-slate-900 mt-2">{item.subject}</Text><Text className="text-xs text-slate-500 mt-1">{item.customId} · {item.tenantName || item.tenantSlug || 'Unknown tenant'}</Text></Card>)}
    </>}
  </Screen>;
}
