import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IndianRupee, Plus, ReceiptText } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { useCanOpen } from '../../src/lib/access';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, SearchBar, Segmented, space, T, useTheme, radius, elevation, formatMoneyCompact } from '../../src/ds';
import { HeaderActions, LoadMoreFooter } from '../../src/components/kit';

type Mode = 'payments' | 'invoices';

export default function PaymentsTab() {
  const router = useRouter();
  const p = useTheme();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const { user, hasPermission: can } = useAuth();
  const canOpen = useCanOpen();
  const isCustomer = user?.role === 'CUSTOMER';
  const showInvoices = isCustomer || canOpen('invoices');
  const [mode, setMode] = useState<Mode>('payments');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [invStatus, setInvStatus] = useState('all');
  const [summary, setSummary] = useState<{ totalCollected?: number; unreconciledCount?: number; totalInvoiced?: number; totalTax?: number }>({});

  const pays = usePaged<any>(['payments', 'list', search, params.customerId], async (page, limit) => {
    const r: any = await api.getPayments({ page: String(page), limit: String(limit), search, ...(params.customerId ? { customerId: params.customerId } : {}) });
    if (page === 1) setSummary((s) => ({ ...s, ...r.summary }));
    return toPage(r.payments, r, page);
  }, 30, { enabled: mode === 'payments' });
  const invs = usePaged<any>(['invoices', 'list', invStatus, params.customerId], async (page, limit) => {
    const r: any = await api.getInvoices({ page: String(page), limit: String(limit), status: invStatus, ...(params.customerId ? { customerId: params.customerId } : {}) });
    if (page === 1) setSummary((s) => ({ ...s, ...r.summary }));
    return toPage(r.invoices, r, page);
  }, 30, { enabled: mode === 'invoices' && showInvoices });
  const list = mode === 'payments' ? pays : invs;

  const add = mode === 'payments' ? (can('payments.create') ? () => router.push('/payment-form') : undefined) : can('invoices.create') ? () => router.push('/invoice-form') : undefined;

  return (
    <ListScreen<any>
      title="Payments"
      right={<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{add && !isCustomer ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label={mode === 'payments' ? 'Record payment' : 'New invoice'} onPress={add} /> : null}<HeaderActions /></View>}
      header={<>
        {showInvoices ? <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'payments', label: 'Payments' }, { value: 'invoices', label: 'Invoices' }]} /> : null}
        {mode === 'payments' && summary.totalCollected !== undefined && !isCustomer ? (
          <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row' }, elevation(p, 1)]}>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Collected</T><T variant="title2" num>{formatMoneyCompact(summary.totalCollected || 0)}</T></View>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">To reconcile</T><T variant="title2" num color={summary.unreconciledCount ? 'orange' : 'label'}>{summary.unreconciledCount || 0}</T></View>
          </View>
        ) : null}
        {mode === 'invoices' && summary.totalInvoiced !== undefined && !isCustomer ? (
          <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row' }, elevation(p, 1)]}>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Invoiced</T><T variant="title2" num>{formatMoneyCompact(summary.totalInvoiced || 0)}</T></View>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">GST</T><T variant="title2" num>{formatMoneyCompact(summary.totalTax || 0)}</T></View>
          </View>
        ) : null}
        {mode === 'payments' && !isCustomer ? <SearchBar value={text} onChange={setText} onSearch={setSearch} placeholder="Customer, project, ref or PAY no." /> : null}
        {mode === 'invoices' ? <Chips value={invStatus} onChange={setInvStatus} options={[{ value: 'all', label: 'All' }, { value: 'Issued', label: 'Unpaid' }, { value: 'Paid', label: 'Paid' }, { value: 'Cancelled', label: 'Cancelled' }]} /> : null}
        {list.loading ? <ListSkeleton /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={mode === 'payments' ? <IndianRupee size={44} color={p.tertiary} /> : <ReceiptText size={44} color={p.tertiary} />} title={mode === 'payments' ? 'No payments' : 'No invoices'} action={add && !isCustomer && !search ? { title: mode === 'payments' ? 'Record payment' : 'New invoice', onPress: add } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun={mode} />}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={list.items.length} inset={58}>
          {mode === 'payments' ? (
            <Row icon={<IconTile icon={<IndianRupee size={17} color={x.status === 'Refunded' || Number(x.amount) < 0 ? p.red : p.green} />} tone={x.status === 'Refunded' || Number(x.amount) < 0 ? 'red' : 'green'} />}
              title={<T variant="body" num weight="600">{formatINR(x.amount)}</T>}
              subtitle={`${isCustomer ? x.projectName : x.customerName} · ${formatDate(x.paymentDate)} · ${x.paymentMethod}`}
              accessory={x.reconciliationStatus && x.reconciliationStatus !== 'Matched' && !isCustomer ? <Badge text="Check" tone="orange" /> : x.status !== 'Successful' ? <Badge text={x.status} /> : undefined}
              onPress={() => router.push({ pathname: '/payment/[id]', params: { id: x.id } })} />
          ) : (
            <Row icon={<IconTile icon={<ReceiptText size={17} color={p.accentText} />} />}
              title={x.invoiceNumber}
              subtitle={`${isCustomer ? x.projectName : x.customerName} · ${formatDate(x.invoiceDate)} · ${x.invoiceType}`}
              accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="subhead" num weight="600">{formatINR(x.amount)}</T><Badge text={x.status === 'Issued' ? 'Unpaid' : x.status} tone={x.status === 'Paid' ? 'green' : x.status === 'Cancelled' ? 'gray' : 'orange'} /></View>}
              onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: x.id } })} />
          )}
        </GroupedItem>
      )}
    />
  );
}
