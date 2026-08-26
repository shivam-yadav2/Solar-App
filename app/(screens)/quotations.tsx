import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { useAuth } from '../../src/context/AuthContext';

export default function QuotationsScreen() {
  const router = useRouter(); const { hasPermission } = useAuth(); const state = useFetch(() => api.getQuotations()); const items = state.data?.quotations ?? [];
  const status = async (id: string, value: any) => { try { await api.updateQuotationStatus(id, value); await state.reload(); } catch (e: any) { Alert.alert('Could not update quotation', e.message); } };
  const remove = (item: any) => Alert.alert('Delete quotation?', item.quotationNumber, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteQuotation(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not delete quotation', e.message); } } }]);
  return <Screen title="Quotations" subtitle="Solar proposals and acceptance" onBack={() => router.back()} action={hasPermission('quotations.manage') ? <HeaderButton onPress={() => router.push('/quotation-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>{state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No quotations yet." /> : items.map(item => <Card key={item.id}><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.title}</Text><Text className="mt-1 text-xs text-slate-500">{item.quotationNumber} · Valid {formatDate(item.validUntil)}</Text></View><Badge text={item.status} tone={item.status === 'Accepted' ? 'green' : item.status === 'Rejected' || item.status === 'Expired' ? 'rose' : 'amber'} /></View><Text className="mt-3 text-xl font-bold text-emerald-700">{formatINR(item.totalAmount)}</Text><Text className="mt-1 text-xs text-slate-500">{item.systemCapacityKw} kW · {item.items?.length ?? 0} line items</Text>{hasPermission('quotations.manage') ? <View className="mt-3 flex-row flex-wrap gap-3"><Pressable onPress={() => void status(item.id, 'Sent')}><Text className="text-xs font-semibold text-blue-700">Mark Sent</Text></Pressable><Pressable onPress={() => void status(item.id, 'Accepted')}><Text className="text-xs font-semibold text-emerald-700">Accept</Text></Pressable><Pressable onPress={() => remove(item)}><Text className="text-xs font-semibold text-rose-600">Delete</Text></Pressable></View> : null}</Card>)}</Screen>;
}
