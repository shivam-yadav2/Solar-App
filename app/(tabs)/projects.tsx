import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Zap } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatINR } from '../../src/lib/formatters';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Progress, SearchBar, space, statusTone, T, Tap, useTheme } from '../../src/ds';
import { HeaderActions, LoadMoreFooter } from '../../src/components/kit';
import { PROJECT_STEPS } from '../../src/components/timeline';
import type { SolarProject } from '../../src/types';

type P = SolarProject & { totalReceived?: number; pendingBalance?: number; paymentStatus?: string };
const FILTERS = [
  { value: 'all', label: 'All' }, { value: 'Booked', label: 'Booked' }, { value: 'Planning', label: 'Planning' }, { value: 'Material Ordered', label: 'Material' },
  { value: 'Installation Scheduled', label: 'Scheduled' }, { value: 'Installation In Progress', label: 'Installing' }, { value: 'Installed', label: 'Installed' },
  { value: 'Inspection Pending', label: 'Inspection' }, { value: 'Completed', label: 'Completed' }, { value: 'On Hold', label: 'On hold' },
];

export default function ProjectsTab() {
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const list = usePaged<P>(['projects', 'list', search, status], async (page, limit) => {
    const r = await api.getProjects({ page: String(page), limit: String(limit), search, status });
    return toPage(r.projects as P[], r as any, page);
  });

  return (
    <ListScreen<P>
      title={isCustomer ? 'My projects' : 'Projects'}
      subtitle={list.total ? `${list.total} projects` : undefined}
      right={<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{can('projects.create') && !isCustomer ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New project" onPress={() => router.push('/project-form')} /> : null}<HeaderActions /></View>}
      header={<>
        {!isCustomer ? <SearchBar value={text} onChange={setText} onSearch={setSearch} placeholder="Project, customer, mobile or brand" /> : null}
        {!isCustomer ? <Chips value={status} onChange={setStatus} options={FILTERS} /> : null}
        {list.loading ? <ListSkeleton avatar={false} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<Zap size={44} color={p.tertiary} />} title={search || status !== 'all' ? 'No projects match' : 'No projects yet'} action={can('projects.create') && !isCustomer && !search ? { title: 'New project', onPress: () => router.push('/project-form') } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="projects" />}
      renderItem={({ item: x, index }) => {
        const step = PROJECT_STEPS.indexOf(x.status);
        const tone = statusTone(x.status);
        return (
          <GroupedItem index={index} count={list.items.length} inset={58}>
            <Tap onPress={() => router.push({ pathname: '/project/[id]', params: { id: x.id } })} scaleTo={0.985} haptics style={{ flexDirection: 'row', gap: space.m, paddingHorizontal: space.l, paddingVertical: 12 }}>
              <IconTile icon={<Zap size={17} color={p[tone === 'accent' ? 'accentText' : tone]} />} tone={tone} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
                  <T variant="headline" numberOfLines={1} style={{ flex: 1 }}>{x.projectName}</T>
                  <Badge text={x.status} />
                </View>
                <T variant="footnote" color="secondary" numberOfLines={1}>{[x.customerName, `${x.capacityKw} kW`, x.city].filter(Boolean).join(' · ')}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: 2 }}>
                  <View style={{ flex: 1 }}><Progress value={step < 0 ? 0 : (step + 1) / PROJECT_STEPS.length} tone={x.status === 'Completed' ? 'green' : 'accent'} height={4} /></View>
                  {Number(x.pendingBalance) > 0 ? <T variant="caption" num color="orange" weight="600">{formatINR(x.pendingBalance)} due</T> : <T variant="caption" color="green" weight="600">Paid</T>}
                </View>
              </View>
            </Tap>
          </GroupedItem>
        );
      }}
    />
  );
}
