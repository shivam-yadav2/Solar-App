import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { IndianRupee, MessageCircle, Pencil, Phone, Plus, Users } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatINR } from '../../src/lib/formatters';
import { Avatar, Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, ListScreen, ListSkeleton, Row, SearchBar, T, useOverlay, useTheme } from '../../src/ds';
import { HeaderActions, LoadMoreFooter, callNumber, openWhatsApp } from '../../src/components/kit';
import { AccountScreen } from '../../src/features/account/AccountScreen';
import type { Customer } from '../../src/types';

type C = Customer & { projectCount?: number; totalDealAmount?: number; amountReceived?: number; pendingAmount?: number };

export default function CustomersTab() {
  const { user } = useAuth();
  if (user?.role === 'CUSTOMER') return <AccountScreen tab />;
  return <CustomersList />;
}

function CustomersList() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const { actions } = useOverlay();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const list = usePaged<C>(['customers', 'list', search, status], async (page, limit) => {
    const r = await api.getCustomers({ page: String(page), limit: String(limit), search, ...(status !== 'all' ? { status } : {}) });
    return toPage(r.customers as C[], r as any, page);
  });

  const menu = (c: C) => actions({
    title: c.name,
    items: [
      c.mobile ? { label: 'Call', icon: <Phone size={20} color={p.accentText} />, onPress: () => callNumber(c.mobile) } : null,
      c.mobile ? { label: 'WhatsApp', icon: <MessageCircle size={20} color={p.green} />, onPress: () => openWhatsApp(c.mobile) } : null,
      can('payments.create') ? { label: 'Record payment', icon: <IndianRupee size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/payment-form', params: { customerId: c.id } }) } : null,
      can('customers.edit') ? { label: 'Edit', icon: <Pencil size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/customer-form', params: { id: c.id } }) } : null,
    ].filter(Boolean) as any,
  });

  return (
    <ListScreen<C>
      title="Customers"
      subtitle={list.total ? `${list.total} customers` : undefined}
      right={<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{can('customers.create') ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New customer" onPress={() => router.push('/customer-form')} /> : null}<HeaderActions /></View>}
      header={<>
        <SearchBar value={text} onChange={setText} onSearch={setSearch} placeholder="Name, mobile, code or city" />
        <Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
        {list.loading ? <ListSkeleton /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(c) => c.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={!list.loading && !list.error ? (
        <EmptyState icon={<Users size={44} color={p.tertiary} />} title={search ? 'No match' : 'No customers yet'} message={search ? `Nothing found for “${search}”.` : 'Add your first customer to start a project.'}
          action={!search && can('customers.create') ? { title: 'Add customer', onPress: () => router.push('/customer-form') } : undefined} />
      ) : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="customers" />}
      renderItem={({ item: c, index }) => (
        <GroupedItem index={index} count={list.items.length} inset={68}>
          <Row
            icon={<Avatar name={c.name} />}
            title={c.name}
            subtitle={[c.customId, c.city, c.projectCount ? `${c.projectCount} project${c.projectCount > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
            accessory={Number(c.pendingAmount) > 0 ? (
              <View style={{ alignItems: 'flex-end' }}>
                <T variant="subhead" num weight="600" color="orange">{formatINR(c.pendingAmount)}</T>
                <T variant="caption2" color="secondary">due</T>
              </View>
            ) : Number(c.totalDealAmount) > 0 ? <Badge text="Paid" tone="green" /> : c.status !== 'Active' ? <Badge text={c.status} /> : null}
            onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })}
            onLongPress={() => menu(c)}
          />
        </GroupedItem>
      )}
    />
  );
}
