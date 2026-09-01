import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { WarrantyDocument } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';
import { FormField } from '../../src/components/ui';
import { shareCsv } from '../../src/lib/export';

export default function WarrantiesScreen() {
  const router = useRouter(); const state = useFetch(() => api.getWarranties({ limit: '100' })); const items: WarrantyDocument[] = state.data?.warranties ?? []; const [query, setQuery] = useState('');
  const { hasPermission } = useAuth();
  const filtered = useMemo(() => items.filter(item => `${item.itemType} ${item.brand || ''} ${item.model || ''} ${item.serialNumber || ''} ${item.customId}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const exportData = async () => { try { await shareCsv('SolarOS_Warranties', filtered.map(item => ({ ID: item.customId, Item: item.itemType, Brand: item.brand, Serial: item.serialNumber, Expiry: item.expiryDate, Type: item.warrantyType }))); } catch (e: any) { Alert.alert('Export failed', e.message); } };
  return <Screen title="Warranties" subtitle="Equipment coverage and expiries" onBack={() => router.back()} action={<View className="flex-row gap-2"><HeaderButton label="Export" onPress={() => void exportData()} />{hasPermission('warranties.create') ? <HeaderButton label="Add" onPress={() => router.push('/warranty-form')} /> : null}</View>} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Expiring Soon" value={String(state.data?.summary?.expiringCount ?? 0)} hint={`${items.length} warranty cards`} accent="text-amber-600" /><FormField label="Search warranties" value={query} onChangeText={setQuery} placeholder="Item, serial, brand or ID" />
      {filtered.length === 0 ? <EmptyState message="No warranties match this search." /> : filtered.map((item) => <Card key={item.id}>
        <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.itemType}</Text><Text className="text-xs text-slate-500 mt-1">{item.brand || 'Unspecified'} {item.model || ''}</Text></View><Badge text={item.warrantyType} /></View>
        <View className="mt-3 pt-3 border-t border-slate-100"><Text className="text-xs text-slate-600">{item.periodYears} years · Expires {formatDate(item.expiryDate)}</Text>{item.serialNumber ? <Text className="text-[11px] text-slate-400 mt-1">Serial: {item.serialNumber}</Text> : null}</View>
      </Card>)}
    </>}
  </Screen>;
}
