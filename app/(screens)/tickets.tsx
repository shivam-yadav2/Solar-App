import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Wrench } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { timeAgo } from '../../src/lib/formatters';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, SearchBar, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

export default function TicketsScreen() {
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('open');
  const list = usePaged<any>(['complaints', 'list', q, status], async (page, limit) => {
    const r: any = await api.getComplaints({ page: String(page), limit: String(limit), q, status });
    return toPage(r.complaints, r, page);
  });
  const canCreate = isCustomer || can('complaints.create');
  return (
    <ListScreen<any>
      title={isCustomer ? 'Service requests' : 'Service tickets'} back large={false}
      right={canCreate ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New ticket" onPress={() => router.push('/ticket-form')} /> : undefined}
      header={<>
        {!isCustomer ? <SearchBar value={text} onChange={setText} onSearch={setQ} placeholder="Ticket no., issue or technician" /> : null}
        <Chips value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open' }, { value: 'done', label: 'Resolved' }, { value: 'all', label: 'All' }]} />
        {list.loading ? <ListSkeleton avatar={false} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<Wrench size={44} color={p.tertiary} />} title={status === 'open' ? 'No open tickets' : 'No tickets'} message={isCustomer ? 'If something is wrong with your system, tell us here.' : undefined} action={canCreate && status === 'open' ? { title: isCustomer ? 'Get help' : 'New ticket', onPress: () => router.push('/ticket-form') } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="tickets" />}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={list.items.length} inset={58}>
          <Row icon={<IconTile icon={<Wrench size={17} color={x.priority === 'High' || x.priority === 'Critical' ? p.red : p.orange} />} tone={x.priority === 'High' || x.priority === 'Critical' ? 'red' : 'orange'} />}
            title={x.subject}
            subtitle={[x.customId, isCustomer ? x.projectName : x.customerName, x.complaintType, x.assignedStaff ? `→ ${x.assignedStaff}` : null, timeAgo(x.updatedAt || x.createdAt)].filter(Boolean).join(' · ')}
            accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}><Badge text={x.status} />{!isCustomer && (x.priority === 'High' || x.priority === 'Critical') ? <Badge text={x.priority} tone="red" /> : null}</View>}
            onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: x.id } })} />
        </GroupedItem>
      )}
    />
  );
}
