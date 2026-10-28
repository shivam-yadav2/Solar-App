import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Download, Plus, ReceiptText } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { toPage, usePaged } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { shareCsv } from '../../src/lib/export';
import { Badge, Button, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, Section, InfoRow, T, formatMoneyCompact, space, useOverlay, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

export default function InvoicesScreen() {
  const router = useRouter(); const p = useTheme(); const { toast } = useOverlay(); const { user, hasPermission: can } = useAuth();
  const [status, setStatus] = useState('all'); const [type, setType] = useState('All'); const [summary, setSummary] = useState<any>({});
  const list = usePaged<any>(['invoices', 'standalone', status, type], async (page, limit) => { const result: any = await api.getInvoices({ page: String(page), limit: String(limit), status, type }); if (page === 1) setSummary(result.summary || {}); return toPage(result.invoices, result, page); });
  const exportData = async () => { try { await shareCsv('SolarOS_Invoices', list.items.map((item) => ({ Invoice: item.invoiceNumber, Customer: item.customerName, Project: item.projectName, Date: item.invoiceDate, Type: item.invoiceType, Amount: item.amount, Tax: item.taxAmount, Status: item.status, Due: item.dueDate }))); } catch (e: any) { toast(e.message || 'Export failed', 'error'); } };
  return <ListScreen<any>
    title="Invoices" subtitle="GST billing, status and customer documents" back large={false}
    right={can('invoices.create') && user?.role !== 'CUSTOMER' ? <IconButton tinted icon={<Plus size={18} color={p.accentText} />} label="New invoice" onPress={() => router.push('/invoice-form')} /> : undefined}
    header={<>
      {user?.role !== 'CUSTOMER' ? <View style={{ flexDirection: 'row', gap: space.m }}><View style={{ flex: 1 }}><Section><InfoRow label="Invoiced" value={<T variant="headline" num>{formatMoneyCompact(summary.totalInvoiced || 0)}</T>} /></Section></View><View style={{ flex: 1 }}><Section><InfoRow label="GST" value={<T variant="headline" num color="orange">{formatMoneyCompact(summary.totalTax || 0)}</T>} /></Section></View></View> : null}
      <Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All status' }, { value: 'Issued', label: 'Unpaid' }, { value: 'Paid', label: 'Paid' }, { value: 'Cancelled', label: 'Cancelled' }]} />
      <Chips value={type} onChange={setType} options={['All', 'Tax Invoice', 'Proforma', 'Advance Receipt', 'Final Bill'].map((value) => ({ value, label: value }))} />
      <Button title="Export current invoices" kind="gray" icon={<Download size={17} color={p.label} />} onPress={() => void exportData()} full />
      {list.loading ? <ListSkeleton /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
    </>}
    data={list.loading || list.error ? [] : list.items}
    keyExtractor={(item) => item.id}
    refreshing={list.refreshing}
    onRefresh={list.refresh}
    onEndReached={list.loadMore}
    onEndReachedThreshold={0.4}
    ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<ReceiptText size={44} color={p.tertiary} />} title="No invoices match" action={can('invoices.create') && user?.role !== 'CUSTOMER' && status === 'all' && type === 'All' ? { title: 'Create invoice', onPress: () => router.push('/invoice-form') } : undefined} /> : null}
    ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="invoices" />}
    renderItem={({ item, index }) => <GroupedItem index={index} count={list.items.length} inset={58}>
      <Row icon={<IconTile icon={<ReceiptText size={17} color={p.accentText} />} />} title={item.invoiceNumber} subtitle={`${item.customerName || item.projectName} · ${item.projectName || ''} · ${formatDate(item.invoiceDate)} · ${item.invoiceType}`} accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="subhead" num weight="600">{formatINR(item.amount)}</T><Badge text={item.status === 'Issued' ? 'Unpaid' : item.status} tone={item.status === 'Paid' ? 'green' : item.status === 'Cancelled' ? 'gray' : 'orange'} /></View>} onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: item.id } })} />
    </GroupedItem>}
  />;
}
