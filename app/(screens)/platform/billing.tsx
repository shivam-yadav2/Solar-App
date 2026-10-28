import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { platform } from '../../../src/lib/apis/platform';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../../src/lib/formatters';
import type { BillingInvoice } from '../../../src/types';
import { Badge, EmptyState, ErrorState, GroupedItem, ListScreen, ListSkeleton, Row, SearchBar, Segmented, StatGrid, StatTile, useTheme } from '../../../src/ds';

export default function PlatformBilling() {
  const router = useRouter(); const p = useTheme(); const { tenantId } = useLocalSearchParams<{ tenantId?: string }>(); const [search, setSearch] = useState(''); const [status, setStatus] = useState('all');
  const state = useFetch(async () => { const [overview, list] = await Promise.all([platform.billingOverview(), platform.billingInvoices(tenantId ? { tenantId } : {})]); return { overview, invoices: list.invoices }; }, [tenantId]);
  const all = state.data?.invoices || []; const items = useMemo(() => all.filter((x) => (!search || `${x.invoiceNumber} ${x.tenantName} ${x.buyer?.name}`.toLowerCase().includes(search.toLowerCase())) && (status === 'all' || x.status === status)), [all, search, status]); const o = state.data?.overview;
  return <ListScreen<BillingInvoice> title="Platform billing" subtitle="Revenue, renewals and collection control" back header={<><StatGrid><StatTile label="MRR" value={o?.mrr || 0} money tone="green" /><StatTile label="Outstanding" value={o?.outstanding || 0} money tone="red" /><StatTile label="Collected · month" value={o?.collectedThisMonth || 0} money tone="blue" /><StatTile label="Paying companies" value={o?.payingCompanies || 0} tone="purple" /></StatGrid><SearchBar value={search} onChange={setSearch} placeholder="Invoice or company" /><Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'issued', label: 'Issued' }, { value: 'overdue', label: 'Overdue' }, { value: 'paid', label: 'Paid' }]} />{state.isLoading ? <ListSkeleton avatar={false} /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}</>} data={state.isLoading || state.error ? [] : items} keyExtractor={(x) => x.id} refreshing={state.isRefreshing} onRefresh={state.refresh} ListEmptyComponent={!state.isLoading && !state.error ? <EmptyState icon={<CreditCard size={44} color={p.tertiary} />} title="No invoices" /> : null} renderItem={({ item, index }) => <GroupedItem index={index} count={items.length}><Row title={item.invoiceNumber} subtitle={`${item.tenantName || item.buyer?.name} · Due ${formatDate(item.dueDate)}`} value={formatINR(item.total - item.amountPaid)} accessory={<Badge text={item.status} />} onPress={() => router.push({ pathname: '/platform/billing/[id]', params: { id: item.id } })} /></GroupedItem>} />;
}
