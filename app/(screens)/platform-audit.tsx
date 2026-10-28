import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FileClock, ShieldAlert } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import type { ActivityLog } from '../../src/types';
import { Badge, EmptyState, ErrorState, GroupedItem, IconTile, ListScreen, ListSkeleton, Row, SearchBar, Segmented, useTheme } from '../../src/ds';

export default function PlatformAuditScreen() {
  const p = useTheme(); const state = useFetch(() => api.getPlatformAuditLog(500)); const [search, setSearch] = useState(''); const [kind, setKind] = useState('all'); const all: ActivityLog[] = state.data?.logs || [];
  const items = useMemo(() => all.filter((x: any) => { const risky = /IMPERSONATE|DELETE|SUSPEND|SECURITY|PASSWORD|MFA/i.test(x.action); return (!search || `${x.action} ${x.userName} ${x.entity} ${x.entityCustomId}`.toLowerCase().includes(search.toLowerCase())) && (kind === 'all' || (kind === 'security' ? risky : !risky)); }), [all, search, kind]);
  return <ListScreen<ActivityLog> title="Platform activity" subtitle="Cross-company audit and security events" back header={<><SearchBar value={search} onChange={setSearch} placeholder="Action, user, entity or reference" /><Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'security', label: 'Security' }, { value: 'routine', label: 'Routine' }]} />{state.isLoading ? <ListSkeleton avatar={false} /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}</>} data={state.isLoading || state.error ? [] : items} keyExtractor={(x) => x.id} refreshing={state.isRefreshing} onRefresh={state.refresh} ListEmptyComponent={!state.isLoading && !state.error ? <EmptyState icon={<FileClock size={44} color={p.tertiary} />} title="No matching events" /> : null} renderItem={({ item, index }) => { const risky = /IMPERSONATE|DELETE|SUSPEND|SECURITY|PASSWORD|MFA/i.test(item.action); return <GroupedItem index={index} count={items.length} inset={58}><Row icon={<IconTile tone={risky ? 'red' : 'gray'} icon={risky ? <ShieldAlert size={17} color={p.red} /> : <FileClock size={17} color={p.secondary} />} />} title={item.action.replaceAll('_', ' ')} subtitle={`${item.userName || 'System'} · ${item.entity}${item.entityCustomId ? ` · ${item.entityCustomId}` : ''} · ${formatDateTime(item.timestamp)}`} accessory={risky ? <Badge text="Review" tone="red" /> : undefined} /></GroupedItem>; }} />;
}
