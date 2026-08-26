import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, Loading, Screen } from '../../src/components/ui';

export default function PlatformAuditScreen() {
  const router = useRouter(); const state = useFetch(() => api.getPlatformAuditLog()); const items = state.data?.logs ?? [];
  return <Screen title="Platform Audit" subtitle="Cross-tenant security and admin events" onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No platform events recorded." /> : items.map(item => <Card key={item.id}><Badge text={item.action.replaceAll('_', ' ')} tone={/IMPERSONAT|DELETE|SUSPEND/.test(item.action) ? 'rose' : 'slate'} /><Text className="text-sm font-bold text-slate-900 mt-2">{item.userName}</Text><Text className="text-xs text-slate-500 mt-1">{item.entity}{item.entityCustomId ? ` · ${item.entityCustomId}` : ''}</Text><Text className="text-[10px] text-slate-400 mt-2">{formatDateTime(item.timestamp)}</Text></Card>)}
  </Screen>;
}
