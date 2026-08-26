import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';
import type { Invoice } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function InvoicesScreen() {
  const router = useRouter(); const state = useFetch(() => api.getInvoices({ limit: '100' }));
  const { hasPermission } = useAuth();
  const items: Invoice[] = state.data?.invoices ?? [];
  return <Screen title="Invoices" subtitle="Tax invoices and customer billing" onBack={() => router.back()} action={hasPermission('invoices.create') ? <HeaderButton onPress={() => router.push('/invoice-form')} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Total Invoiced" value={formatINR(state.data?.summary?.totalInvoiced ?? items.reduce((s, i) => s + Number(i.amount || 0), 0))} hint={`GST ${formatINR(state.data?.summary?.totalTax ?? 0)}`} />
      {items.length === 0 ? <EmptyState message="No invoices yet." /> : items.map((item) => <Card key={item.id}>
        <View className="flex-row justify-between"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.invoiceNumber}</Text><Text className="text-xs text-slate-500 mt-1">{item.invoiceType} · {formatDate(item.invoiceDate)}</Text></View><Badge text={item.status} tone={item.status === 'Paid' ? 'green' : item.status === 'Cancelled' ? 'rose' : 'amber'} /></View>
        <Text className="text-xl font-bold text-slate-900 mt-3">{formatINR(item.amount)}</Text>{item.dueDate ? <Text className="text-[11px] text-slate-400 mt-1">Due {formatDate(item.dueDate)}</Text> : null}
      </Card>)}
    </>}
  </Screen>;
}
