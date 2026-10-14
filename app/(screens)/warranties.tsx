import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, FormField, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { WarrantyDocument } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';
import { shareCsv } from '../../src/lib/export';

const itemTypes = ['All', 'Solar Panel', 'Inverter', 'Battery', 'Structure', 'Wiring/Electrical'] as const;
const daysUntil = (value: string) => Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);

export default function WarrantiesScreen() {
  const router = useRouter();
  const state = useFetch(() => api.getWarranties({ limit: '100' }));
  const items: WarrantyDocument[] = state.data?.warranties ?? [];
  const [query, setQuery] = useState('');
  const [itemType, setItemType] = useState<string>('All');
  const { hasPermission } = useAuth();
  const filtered = useMemo(() => items.filter(item => `${item.itemType} ${(item as any).customerName || ''} ${item.brand || ''} ${item.model || ''} ${item.serialNumber || ''} ${item.customId}`.toLowerCase().includes(query.toLowerCase()) && (itemType === 'All' || item.itemType === itemType)), [items, query, itemType]);
  const expiring = items.filter(item => { const days = daysUntil(item.expiryDate); return days >= 0 && days <= 45; });
  const exportData = async () => { try { await shareCsv('SolarOS_Warranties', filtered.map(item => ({ ID: item.customId, Customer: (item as any).customerName, Item: item.itemType, Brand: item.brand, Serial: item.serialNumber, Expiry: item.expiryDate, Type: item.warrantyType }))); } catch (e: any) { Alert.alert('Export failed', e.message); } };

  return <Screen title="Warranties" subtitle="Equipment coverage and renewal follow-ups" onBack={() => router.back()} action={<View className="flex-row gap-2"><HeaderButton label="Export" onPress={() => void exportData()} />{hasPermission('warranties.create') ? <HeaderButton label="Add" onPress={() => router.push('/warranty-form')} /> : null}</View>} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      {expiring.length > 0 ? <Card className="border-amber-200 bg-amber-50"><View className="flex-row items-start"><View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-200"><ShieldAlert size={19} color="#b45309" /></View><View className="ml-3 flex-1"><Text className="text-sm font-extrabold text-amber-900">{expiring.length} warranty {expiring.length === 1 ? 'is' : 'are'} expiring soon</Text><Text className="mt-1 text-xs leading-5 text-amber-800">Follow up for preventive maintenance, renewal, or extended coverage within the next 45 days.</Text></View></View></Card> : null}
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Active registry" value={String(items.length)} hint="Equipment warranty cards" /></View><View className="flex-1"><StatCard label="Expiring soon" value={String(state.data?.summary?.expiringCount ?? expiring.length)} hint="Within 45 days" accent="text-amber-600" /></View></View>
      <FormField label="Search warranties" value={query} onChangeText={setQuery} placeholder="Customer, item, serial, brand or ID" />
      <View className="mb-3 flex-row flex-wrap gap-2">{itemTypes.map(type => <Pressable key={type} onPress={() => setItemType(type)} className={`rounded-full border px-3 py-1.5 ${itemType === type ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}><Text className={`text-[11px] font-bold ${itemType === type ? 'text-amber-800' : 'text-slate-500'}`}>{type}</Text></Pressable>)}</View>
      {filtered.length === 0 ? <EmptyState message="No warranties match this filter." /> : filtered.map((item) => { const days = daysUntil(item.expiryDate); const expiringSoon = days >= 0 && days <= 45; return <Card key={item.id} className={expiringSoon ? 'border-amber-200' : ''}><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-[10px] font-mono font-bold text-slate-400">{item.customId}</Text><Text className="mt-1 text-sm font-bold text-slate-900">{item.itemType}</Text><Text className="mt-1 text-xs text-slate-500">{[item.brand || 'OEM', item.model || 'Standard'].join(' · ')}</Text></View><View className="items-end"><Badge text={`${item.periodYears} years`} tone="amber" /><View className="mt-2"><Badge text={item.warrantyType} tone="slate" /></View></View></View><View className="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5"><Text className="text-[11px] text-slate-500">Customer</Text><Text className="mt-0.5 text-xs font-bold text-slate-800">{(item as any).customerName || 'Customer'}</Text>{item.serialNumber ? <Text className="mt-2 text-[11px] font-mono text-slate-600">Serial: {item.serialNumber}</Text> : null}</View><View className="mt-3 flex-row items-center justify-between"><View className="flex-row items-center"><ShieldCheck size={15} color={expiringSoon ? '#d97706' : '#059669'} /><Text className={`ml-2 text-xs font-bold ${expiringSoon ? 'text-amber-700' : 'text-emerald-700'}`}>Expires {formatDate(item.expiryDate)}</Text></View><Text className="text-[11px] text-slate-500">{days < 0 ? 'Expired' : `${days} days left`}</Text></View></Card>; })}
    </>}
  </Screen>;
}
