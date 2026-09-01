import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { Invoice } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';
import { FormField } from '../../src/components/ui';
import { shareCsv } from '../../src/lib/export';

export default function InvoicesScreen() {
  const router = useRouter(); const state = useFetch(() => api.getInvoices({ limit: '100' }));
  const { hasPermission } = useAuth();
  const items: Invoice[] = state.data?.invoices ?? []; const [query, setQuery] = useState(''); const [status, setStatus] = useState('All');
  const filtered = useMemo(() => items.filter(item => `${item.invoiceNumber} ${item.customId} ${item.invoiceType}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All' || item.status === status)), [items, query, status]);
  const exportData = async () => { try { await shareCsv('SolarOS_Invoices', filtered.map(item => ({ Invoice: item.invoiceNumber, Date: item.invoiceDate, Type: item.invoiceType, Amount: item.amount, Tax: item.taxAmount, Status: item.status, Due: item.dueDate }))); } catch (e: any) { Alert.alert('Export failed', e.message); } };
  return <Screen title="Invoices" subtitle="Tax invoices and customer billing" onBack={() => router.back()} action={<View className="flex-row gap-2"><HeaderButton label="Export" onPress={() => void exportData()} />{hasPermission('invoices.create') ? <HeaderButton label="Add" onPress={() => router.push('/invoice-form')} /> : null}</View>} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Total Invoiced" value={formatINR(state.data?.summary?.totalInvoiced ?? items.reduce((s, i) => s + Number(i.amount || 0), 0))} hint={`GST ${formatINR(state.data?.summary?.totalTax ?? 0)}`} /><FormField label="Search invoices" value={query} onChangeText={setQuery} placeholder="Invoice number or ID" /><View className="mt-2 flex-row gap-2">{['All', 'Issued', 'Paid', 'Cancelled'].map(item => <Text key={item} onPress={() => setStatus(item)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${status === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>{item}</Text>)}</View>
      {filtered.length === 0 ? <EmptyState message="No invoices match this filter." /> : filtered.map((item) => <Card key={item.id}>
        <View className="flex-row justify-between"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.invoiceNumber}</Text><Text className="text-xs text-slate-500 mt-1">{item.invoiceType} · {formatDate(item.invoiceDate)}</Text></View><Badge text={item.status} tone={item.status === 'Paid' ? 'green' : item.status === 'Cancelled' ? 'rose' : 'amber'} /></View>
        <Text className="text-xl font-bold text-slate-900 mt-3">{formatINR(item.amount)}</Text>{item.dueDate ? <Text className="text-[11px] text-slate-400 mt-1">Due {formatDate(item.dueDate)}</Text> : null}
      </Card>)}
    </>}
  </Screen>;
}
