import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { Complaint } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function TicketsScreen() {
  const router = useRouter(); const state = useFetch(() => api.getComplaints({ limit: '100' })); const items: Complaint[] = state.data?.complaints ?? [];
  const { user, hasPermission } = useAuth();
  return <Screen title="Service Tickets" subtitle="Customer complaints and resolutions" onBack={() => router.back()} action={user?.role === 'CUSTOMER' || hasPermission('complaints.create') ? <HeaderButton onPress={() => router.push('/ticket-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Open Tickets" value={String(state.data?.summary?.openTicketsCount ?? items.filter(i => !/resolved|closed/i.test(i.status)).length)} hint={`${items.length} total`} accent="text-rose-600" />
      {items.length === 0 ? <EmptyState message="No service tickets yet." /> : items.map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: item.id } })}><Card>
        <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.subject}</Text><Text className="text-[10px] font-mono text-slate-400 mt-1">{item.customId} · {formatDate(item.createdAt)}</Text></View><Badge text={item.priority} tone={item.priority === 'Critical' || item.priority === 'High' ? 'rose' : 'amber'} /></View>
        <Text className="text-xs text-slate-500 mt-2" numberOfLines={2}>{item.description}</Text><View className="mt-3"><Badge text={item.status} tone={/resolved|closed/i.test(item.status) ? 'green' : 'slate'} /></View>
      </Card></Pressable>)}
    </>}
  </Screen>;
}
