import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { MessageCircle, Phone, Plus, Target } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatINR, timeAgo } from '../../src/lib/formatters';
import { Avatar, Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, ListScreen, ListSkeleton, Row, SearchBar, useOverlay, useTheme } from '../../src/ds';
import { LoadMoreFooter, callNumber, openWhatsApp } from '../../src/components/kit';
import type { Lead } from '../../src/types';
import { LEAD_STAGES } from '../../src/lib/constants';

export default function LeadsScreen() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const { actions } = useOverlay();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const list = usePaged<Lead>(['leads', 'list', q, status], async (page, limit) => {
    const r: any = await api.getLeads({ page: String(page), limit: String(limit), q, status });
    return toPage(r.leads, r, page);
  });
  return (
    <ListScreen<Lead>
      title="Leads" back large={false}
      right={can('leads.manage') ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New lead" onPress={() => router.push('/lead-form')} /> : undefined}
      header={<>
        <SearchBar value={text} onChange={setText} onSearch={setQ} placeholder="Name, phone, city or LEAD no." />
        <Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, ...LEAD_STAGES.map((s) => ({ value: s, label: s === 'Site Survey Scheduled' ? 'Survey' : s === 'Proposal Sent' ? 'Proposal' : s }))]} />
        {list.loading ? <ListSkeleton /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<Target size={44} color={p.tertiary} />} title={q || status !== 'all' ? 'No leads match' : 'No leads yet'} message="Add enquiries from calls, ads and referrals to follow them up." action={can('leads.manage') && !q ? { title: 'Add lead', onPress: () => router.push('/lead-form') } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="leads" />}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={list.items.length} inset={68}>
          <Row icon={<Avatar name={x.prospectName} />} title={x.prospectName}
            subtitle={[x.city, x.proposedCapacityKw ? `${x.proposedCapacityKw} kW` : null, x.monthlyElectricityBill ? `bill ${formatINR(x.monthlyElectricityBill)}` : null, x.leadSource, timeAgo(x.updatedAt)].filter(Boolean).join(' · ')}
            accessory={<Badge text={x.status} />}
            onPress={() => router.push({ pathname: '/lead/[id]', params: { id: x.id } })}
            onLongPress={() => actions({ title: x.prospectName, items: [
              { label: 'Call', icon: <Phone size={20} color={p.accentText} />, onPress: () => callNumber(x.phone) },
              { label: 'WhatsApp', icon: <MessageCircle size={20} color={p.green} />, onPress: () => openWhatsApp(x.phone) },
            ] })} />
        </GroupedItem>
      )}
    />
  );
}

