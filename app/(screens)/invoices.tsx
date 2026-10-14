import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, FormField, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { Invoice } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';
import { shareCsv } from '../../src/lib/export';

const equipmentSerialSummary = (invoice: any) => {
  const panels = Array.isArray(invoice.panelSerialNumbers) ? invoice.panelSerialNumbers.filter(Boolean).join(', ') : '';
  return [panels ? `Panel serials: ${panels}` : '', invoice.inverterSerial ? `Inverter serial: ${invoice.inverterSerial}` : ''].filter(Boolean).join(' · ');
};

export default function InvoicesScreen() {
  const router = useRouter();
  const state = useFetch(() => api.getInvoices({ limit: '100' }));
  const { hasPermission } = useAuth();
  const items: Invoice[] = state.data?.invoices ?? [];
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const filtered = useMemo(() => items.filter(item => `${item.invoiceNumber} ${item.customId} ${item.invoiceType}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All' || item.status === status)), [items, query, status]);
  const exportData = async () => { try { await shareCsv('SolarOS_Invoices', filtered.map(item => ({ Invoice: item.invoiceNumber, Date: item.invoiceDate, Type: item.invoiceType, Amount: item.amount, Tax: item.taxAmount, Status: item.status, Due: item.dueDate }))); } catch (e: any) { Alert.alert('Export failed', e.message); } };

  return <Screen title="Invoices" subtitle="Tax invoices and customer billing" onBack={() => router.back()} action={<View className="flex-row gap-2"><HeaderButton label="Export" onPress={() => void exportData()} />{hasPermission('invoices.create') ? <HeaderButton label="Add" onPress={() => router.push('/invoice-form')} /> : null}</View>} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Total invoiced" value={formatINR(state.data?.summary?.totalInvoiced ?? items.reduce((sum, item) => sum + Number(item.amount || 0), 0))} hint={`GST ${formatINR(state.data?.summary?.totalTax ?? 0)}`} />
      <FormField label="Search invoices" value={query} onChangeText={setQuery} placeholder="Invoice number or ID" />
      <View className="mt-2 flex-row gap-2">{['All', 'Issued', 'Paid', 'Cancelled'].map(item => <Text key={item} onPress={() => setStatus(item)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${status === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>{item}</Text>)}</View>
      {filtered.length === 0 ? <EmptyState message="No invoices match this filter." /> : filtered.map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={`Open invoice ${item.invoiceNumber}`}><Card>
        <View className="flex-row justify-between"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.invoiceNumber}</Text><Text className="mt-1 text-xs text-slate-500">{item.invoiceType} · {formatDate(item.invoiceDate)}</Text></View><View className="items-end"><Badge text={item.status} tone={item.status === 'Paid' ? 'green' : item.status === 'Cancelled' ? 'rose' : 'amber'} /><ChevronRight size={16} color="#94a3b8" className="mt-2" /></View></View>
        {(item as any).projectName ? <Text className="mt-2 text-[11px] text-slate-500">Project: {(item as any).projectName}</Text> : null}
        {equipmentSerialSummary(item) ? <Text className="mt-1 text-[11px] text-slate-500">{equipmentSerialSummary(item)}</Text> : null}
        <Text className="mt-3 text-xl font-bold text-slate-900">{formatINR(item.amount)}</Text>{item.dueDate ? <Text className="mt-1 text-[11px] text-slate-400">Due {formatDate(item.dueDate)}</Text> : null}
      </Card></Pressable>)}
    </>}
  </Screen>;
}
