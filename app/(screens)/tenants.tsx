import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Plus } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import type { Tenant } from '../../src/types';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Avatar, Badge, EmptyState, ErrorState, GroupedItem, IconButton, ListScreen, ListSkeleton, Row, SearchBar, Segmented, StatGrid, StatTile, T, useTheme } from '../../src/ds';

export default function TenantsScreen() {
  const router = useRouter(); const p = useTheme();
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all');
  const state = useFetch(() => api.getSaaSTenants({ search, limit: '250' }), [search]);
  const all: Tenant[] = state.data?.tenants || [];
  const items = useMemo(() => status === 'all' ? all : all.filter((x) => String(x.status).toLowerCase() === status), [all, status]);
  const active = all.filter((x) => x.status === 'active').length;
  const mrr = all.reduce((n, x) => n + Number(x.subscription?.pricePerMonth || 0), 0);
  return <ListScreen<Tenant> title="Companies" subtitle="Subscriptions, access and workspace health" back
    right={<IconButton tinted label="New company" icon={<Plus size={19} color={p.accentText} />} onPress={() => router.push('/tenant-form')} />}
    header={<><StatGrid><StatTile label="Companies" value={all.length} tone="blue" /><StatTile label="Active" value={active} tone="green" /><StatTile label="MRR" value={mrr} format={formatINR} tone="accent" /></StatGrid><SearchBar value={search} onChange={setSearch} placeholder="Name, slug or owner" /><Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'suspended', label: 'Paused' }]} />{state.isLoading ? <ListSkeleton /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}</>}
    data={state.isLoading || state.error ? [] : items} keyExtractor={(x) => x.id} refreshing={state.isRefreshing} onRefresh={state.refresh}
    ListEmptyComponent={!state.isLoading && !state.error ? <EmptyState icon={<Building2 size={44} color={p.tertiary} />} title="No companies found" message="Try another filter or create the first workspace." /> : null}
    renderItem={({ item, index }) => <GroupedItem index={index} count={items.length} inset={68}><Row icon={<Avatar name={item.name} />} title={item.name} subtitle={`${item.slug} · ${item.subscription?.planName || 'No plan'}`} accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}><Badge text={item.status} /><T variant="caption" color="secondary" num>{formatINR(item.subscription?.pricePerMonth || 0)} · {formatNumber(item.stats?.totalCapacityKw || 0)} kW</T></View>} onPress={() => router.push({ pathname: '/tenant/[id]', params: { id: item.id } })} /></GroupedItem>} />;
}
