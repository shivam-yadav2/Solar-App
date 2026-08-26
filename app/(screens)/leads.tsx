import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';
import { formatINR } from '../../src/lib/formatters';
import { useAuth } from '../../src/context/AuthContext';

export default function LeadsScreen() {
  const router = useRouter(); const { hasPermission } = useAuth(); const state = useFetch(() => api.getLeads()); const items = state.data?.leads ?? [];
  return <Screen title="Leads" subtitle="Pre-sales pipeline and follow-ups" onBack={() => router.back()} action={hasPermission('leads.manage') ? <HeaderButton onPress={() => router.push('/lead-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No leads yet." /> : items.map(item => <Pressable key={item.id} onPress={() => router.push({ pathname: '/lead/[id]', params: { id: item.id } })}><Card><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.prospectName}</Text><Text className="mt-1 text-xs text-slate-500">{item.customId} · {item.phone}</Text></View><Badge text={item.status} tone={item.status === 'Won' ? 'green' : item.status === 'Lost' ? 'rose' : 'amber'} /></View><Text className="mt-3 text-xs text-slate-600">{item.city}, {item.state} · {item.leadSource}</Text>{item.proposedCapacityKw ? <Text className="mt-1 text-xs font-semibold text-emerald-700">{item.proposedCapacityKw} kW · Bill {formatINR(item.monthlyElectricityBill)}</Text> : null}</Card></Pressable>)}
  </Screen>;
}
