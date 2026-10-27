import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Plus, ShieldCheck } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate } from '../../src/lib/formatters';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, SearchBar, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

export default function WarrantiesScreen() {
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [expiring, setExpiring] = useState(0);
  const list = usePaged<any>(['warranties', 'list', q, status], async (page, limit) => {
    const r: any = await api.getWarranties({ page: String(page), limit: String(limit), q, status });
    if (page === 1) setExpiring(r.summary?.expiringCount || 0);
    return toPage(r.warranties, r, page);
  });
  return (
    <ListScreen<any>
      title={isCustomer ? 'Warranty cards' : 'Warranties'} back large={false}
      right={can('warranties.create') && !isCustomer ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="Add warranty" onPress={() => router.push('/warranty-form')} /> : undefined}
      header={<>
        {!isCustomer ? <SearchBar value={text} onChange={setText} onSearch={setQ} placeholder="Customer, brand or serial no." /> : null}
        <Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'Active', label: 'Active' }, { value: 'Expiring Soon', label: 'Expiring', count: expiring || undefined }, { value: 'Expired', label: 'Expired' }]} />
        {list.loading ? <ListSkeleton avatar={false} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<ShieldCheck size={44} color={p.tertiary} />} title="No warranty cards" message={isCustomer ? 'Your equipment warranties will appear here after installation.' : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="warranties" />}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={list.items.length} inset={58}>
          <Row icon={<IconTile icon={<ShieldCheck size={17} color={x.warrantyStatus === 'Expired' ? p.gray : x.warrantyStatus === 'Expiring Soon' ? p.orange : p.green} />} tone={x.warrantyStatus === 'Expired' ? 'gray' : x.warrantyStatus === 'Expiring Soon' ? 'orange' : 'green'} />}
            title={`${x.itemType}${x.brand ? ` · ${x.brand}` : ''}`}
            subtitle={[isCustomer ? null : x.customerName, x.serialNumber, `${x.periodYears} yr · until ${formatDate(x.expiryDate)}`].filter(Boolean).join(' · ')}
            accessory={x.warrantyStatus !== 'Active' ? <Badge text={x.warrantyStatus} tone={x.warrantyStatus === 'Expired' ? 'gray' : 'orange'} /> : undefined}
            onPress={() => router.push({ pathname: '/warranty/[id]', params: { id: x.id } })} />
        </GroupedItem>
      )}
    />
  );
}
