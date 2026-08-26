import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { WarrantyDocument } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function WarrantiesScreen() {
  const router = useRouter(); const state = useFetch(() => api.getWarranties({ limit: '100' })); const items: WarrantyDocument[] = state.data?.warranties ?? [];
  const { hasPermission } = useAuth();
  return <Screen title="Warranties" subtitle="Equipment coverage and expiries" onBack={() => router.back()} action={hasPermission('warranties.create') ? <HeaderButton onPress={() => router.push('/warranty-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Expiring Soon" value={String(state.data?.summary?.expiringCount ?? 0)} hint={`${items.length} warranty cards`} accent="text-amber-600" />
      {items.length === 0 ? <EmptyState message="No warranties registered yet." /> : items.map((item) => <Card key={item.id}>
        <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.itemType}</Text><Text className="text-xs text-slate-500 mt-1">{item.brand || 'Unspecified'} {item.model || ''}</Text></View><Badge text={item.warrantyType} /></View>
        <View className="mt-3 pt-3 border-t border-slate-100"><Text className="text-xs text-slate-600">{item.periodYears} years · Expires {formatDate(item.expiryDate)}</Text>{item.serialNumber ? <Text className="text-[11px] text-slate-400 mt-1">Serial: {item.serialNumber}</Text> : null}</View>
      </Card>)}
    </>}
  </Screen>;
}
