import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, FormField, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { Complaint } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function TicketsScreen() {
  const router = useRouter(); const state = useFetch(() => api.getComplaints({ limit: '100' })); const items: Complaint[] = state.data?.complaints ?? []; const [query, setQuery] = useState(''); const [status, setStatus] = useState('All'); const [priority, setPriority] = useState('All');
  const { user, hasPermission } = useAuth();
  const filtered = useMemo(() => items.filter(item => `${item.subject} ${item.customId} ${item.description}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All' || item.status === status) && (priority === 'All' || item.priority === priority)), [items, query, status, priority]);
  return <Screen title="Service Tickets" subtitle="Customer complaints and resolutions" onBack={() => router.back()} action={user?.role === 'CUSTOMER' || hasPermission('complaints.create') ? <HeaderButton onPress={() => router.push('/ticket-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Open Tickets" value={String(state.data?.summary?.openTicketsCount ?? items.filter(i => !/resolved|closed/i.test(i.status)).length)} hint={`${items.length} total`} accent="text-rose-600" /><FormField label="Search tickets" value={query} onChangeText={setQuery} placeholder="Subject, ticket ID or description" /><View className="mt-2 flex-row flex-wrap gap-2">{['All', 'Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved', 'Closed'].map(item => <Pressable key={item} onPress={() => setStatus(item)} className={`rounded-full border px-3 py-1.5 ${status === item ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}><Text className={`text-[11px] font-bold ${status === item ? 'text-blue-700' : 'text-slate-500'}`}>{item}</Text></Pressable>)}</View><View className="mt-2 flex-row gap-2">{['All', 'Low', 'Medium', 'High', 'Critical'].map(item => <Pressable key={item} onPress={() => setPriority(item)} className={`rounded-full border px-3 py-1.5 ${priority === item ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}><Text className={`text-[11px] font-bold ${priority === item ? 'text-rose-700' : 'text-slate-500'}`}>{item}</Text></Pressable>)}</View>
      {filtered.length === 0 ? <EmptyState message="No service tickets match this filter." /> : filtered.map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: item.id } })}><Card>
        <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.subject}</Text><Text className="text-[10px] font-mono text-slate-400 mt-1">{item.customId} · {formatDate(item.createdAt)}</Text></View><Badge text={item.priority} tone={item.priority === 'Critical' || item.priority === 'High' ? 'rose' : 'amber'} /></View>
        <Text className="text-xs text-slate-500 mt-2" numberOfLines={2}>{item.description}</Text><View className="mt-3"><Badge text={item.status} tone={/resolved|closed/i.test(item.status) ? 'green' : 'slate'} /></View>
      </Card></Pressable>)}
    </>}
  </Screen>;
}
