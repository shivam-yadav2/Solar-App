import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, Plus, SlidersHorizontal } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, SearchBar, T, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';
import type { Quotation } from '../../src/types';

export default function QuotationsScreen() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const list = usePaged<Quotation>(['quotations', 'list', q, status], async (page, limit) => {
    const r: any = await api.getQuotations({ page: String(page), limit: String(limit), q, status });
    return toPage(r.quotations, r, page);
  });
  return (
    <ListScreen<Quotation>
      title="Quotations" back large={false}
      right={can('quotations.manage') ? <View style={{ flexDirection: 'row', gap: 6 }}><IconButton icon={<SlidersHorizontal size={18} color={p.label} />} label="Quotation defaults" onPress={() => router.push('/quotation-settings')} /><IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New quotation" onPress={() => router.push('/quotation-form')} /></View> : undefined}
      header={<>
        <SearchBar value={text} onChange={setText} onSearch={setQ} placeholder="Customer, phone or quotation no." />
        <Chips value={status} onChange={setStatus} options={['all', 'Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired'].map((s) => ({ value: s, label: s === 'all' ? 'All' : s }))} />
        {list.loading ? <ListSkeleton avatar={false} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<FileText size={44} color={p.tertiary} />} title="No quotations" message="Make a quotation from a lead or here, and share the PDF on WhatsApp." action={can('quotations.manage') && !q ? { title: 'New quotation', onPress: () => router.push('/quotation-form') } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="quotations" />}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={list.items.length} inset={58}>
          <Row icon={<IconTile icon={<FileText size={17} color={p.blue} />} tone="blue" />}
            title={x.recipientName || x.title}
            subtitle={`${x.quotationNumber} · ${x.systemCapacityKw || '–'} kW · ${formatDate(x.quotationDate || x.createdAt)}`}
            accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}><T variant="subhead" num weight="600">{formatINR(x.totalAmount)}</T><Badge text={x.status} /></View>}
            onPress={() => router.push({ pathname: '/quotation/[id]', params: { id: x.id } })} />
        </GroupedItem>
      )}
    />
  );
}
