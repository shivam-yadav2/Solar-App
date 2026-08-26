import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, SearchField } from '../../src/components/ui';
import type { Tenant } from '../../src/types';

export default function TenantsScreen() {
  const router = useRouter(); const { switchTenantScope, impersonateTenant } = useAuth(); const [search, setSearch] = useState('');
  const state = useFetch(() => api.getSaaSTenants({ search, limit: '100' }), [search]); const items: Tenant[] = state.data?.tenants ?? [];
  const openTenant = (item: Tenant) => Alert.alert(item.name, 'Choose how to enter this workspace.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Super-admin scope', onPress: async () => { await switchTenantScope(item.id); router.replace('/(tabs)/dashboard'); } }, { text: 'Impersonate tenant admin', onPress: async () => { await impersonateTenant(item.id); router.replace('/(tabs)/dashboard'); } }]);
  return <Screen title="Tenants" subtitle="Companies on the SolarOS platform" onBack={() => router.back()} action={<HeaderButton onPress={() => router.push('/tenant-form')} />} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    <SearchField value={search} onChangeText={setSearch} placeholder="Search tenant name or slug…" />
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No tenants found." /> : items.map(item => <Card key={item.id}>
      <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.name}</Text><Text className="text-xs text-slate-500 mt-1">{item.slug} · {item.adminEmail}</Text></View><Badge text={item.status} tone={item.status === 'active' ? 'green' : item.status === 'suspended' ? 'rose' : 'amber'} /></View>
      <View className="flex-row mt-3 pt-3 border-t border-slate-100"><View className="flex-1"><Text className="text-[10px] text-slate-400">PLAN</Text><Text className="text-xs font-bold">{item.subscription?.planName || '—'}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">MRR</Text><Text className="text-xs font-bold text-emerald-700">{formatINR(item.subscription?.pricePerMonth)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">CAPACITY</Text><Text className="text-xs font-bold">{formatNumber(item.stats?.totalCapacityKw)} kW</Text></View></View><View className="flex-row flex-wrap gap-2 mt-3"><Pressable onPress={() => openTenant(item)} className="flex-1 bg-slate-900 rounded-lg py-2 items-center"><Text className="text-xs font-semibold text-white">Open Workspace</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/billing', params: { tenantId: item.id } })} className="px-4 border border-slate-200 rounded-lg py-2"><Text className="text-xs font-semibold text-slate-700">Billing</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/tenant-form', params: { id: item.id } })} className="px-4 border border-slate-200 rounded-lg py-2"><Text className="text-xs font-semibold text-slate-700">Edit</Text></Pressable></View>
    </Card>)}
  </Screen>;
}
