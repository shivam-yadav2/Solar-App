import React from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Badge, Card, DetailRow, ErrorState, Loading, Screen } from '../../src/components/ui';

export default function SystemHealthScreen() {
  const router = useRouter(); const state = useFetch(() => api.getSystemHealth()); const item = state.data;
  return <Screen title="System Health" subtitle="Live infrastructure checks" onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : item ? <>
      <Card><Badge text={item.database.connected ? 'Connected' : 'Offline'} tone={item.database.connected ? 'green' : 'rose'} /><DetailRow label="Database latency" value={`${item.database.latencyMs} ms`} /><DetailRow label="Pool size" value={String(item.database.poolSize)} /></Card>
      <Card><Badge text={item.cache.connected ? 'Connected' : 'Unavailable'} tone={item.cache.connected ? 'green' : 'amber'} /><DetailRow label="Cache driver" value={item.cache.driver} /><DetailRow label="Keys" value={item.cache.keyCount != null ? String(item.cache.keyCount) : 'Not reported'} /></Card>
      <Card><Badge text="Storage" /><DetailRow label="Driver" value={item.storage.driver} /><DetailRow label="File count" value={item.storage.fileCount != null ? String(item.storage.fileCount) : 'Not reported'} /><DetailRow label="Total bytes" value={item.storage.totalSizeBytes != null ? String(item.storage.totalSizeBytes) : 'Not reported'} /></Card>
    </> : null}
  </Screen>;
}
