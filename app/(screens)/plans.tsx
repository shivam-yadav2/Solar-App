import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';

export default function PlansScreen() {
  const router = useRouter(); const state = useFetch(() => api.getPlans()); const items = state.data?.plans ?? [];
  const remove = (item: any) => Alert.alert('Delete plan?', item.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deletePlan(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not delete plan', e.message); } } }]);
  return <Screen title="Plans" subtitle="Subscription catalog and tenant limits" onBack={() => router.back()} action={<HeaderButton onPress={() => router.push('/plan-form')} />} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No subscription plans configured." /> : items.map(item => <Card key={item.id}>
      <Pressable onPress={() => router.push({ pathname: '/plan-form', params: { id: item.id } })}><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-base font-bold text-slate-900">{item.name}</Text><Text className="text-xs text-slate-500 mt-1">{item.description || item.key}</Text></View><Badge text={item.isActive ? 'Active' : 'Inactive'} tone={item.isActive ? 'green' : 'slate'} /></View>
      <Text className="text-2xl font-bold text-emerald-700 mt-3">{formatINR(item.pricePerMonth)}<Text className="text-xs font-normal text-slate-400"> / {item.billingCycle}</Text></Text>
      <Text className="text-xs text-slate-600 mt-3">{item.maxProjectsLimit} projects · {item.maxUsersLimit} users · {item.trialDays} trial days</Text><Text className="text-[10px] text-slate-400 mt-1">{item.tenantCount ?? 0} tenants assigned</Text></Pressable>
      {!(item.tenantCount ?? 0) ? <Pressable onPress={() => remove(item)} className="mt-3 self-end"><Text className="text-xs font-semibold text-rose-600">Delete</Text></Pressable> : null}
    </Card>)}
  </Screen>;
}
