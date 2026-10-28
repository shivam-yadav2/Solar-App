import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Alert } from 'react-native';
import { Download, FileClock, ShieldAlert } from 'lucide-react-native';
import { api, qs } from '../../src/lib/api';
import { getApiBase } from '../../src/lib/appConfig';
import { authHeaders } from '../../src/lib/apis/account';
import { shareDownload } from '../../src/lib/export';
import { usePaged, toPage } from '../../src/lib/query';
import { humanizeAction } from '../../src/lib/activityLabels';
import { formatDateTime } from '../../src/lib/formatters';
import type { ActivityLog } from '../../src/types';
import { Badge, Chips, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, InfoRow, ListScreen, ListSkeleton, Row, SearchBar, Section, Sheet, T, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

export default function AuditLogsScreen() {
  const p = useTheme();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('all');
  const [selected, setSelected] = useState<ActivityLog | null>(null);
  const exportLog = async () => { try { const headers = authHeaders(); await shareDownload(`${getApiBase()}/activity-logs/export${qs({ q, severity: severity === 'all' ? '' : severity })}`, 'SolarOS-activity-log.csv', 'text/csv', headers.Authorization ? { Authorization: headers.Authorization } : undefined); } catch (e: any) { Alert.alert('Export failed', e.message); } };
  const list = usePaged<ActivityLog>(['audit', q, severity], async (page, limit) => {
    const result = await api.getActivityLogs({ q, severity: severity === 'all' ? '' : severity, page: String(page), limit: String(limit) });
    return toPage(result.logs, result, page);
  });
  return <>
    <ListScreen<ActivityLog>
      title="Audit log" subtitle="Who changed what, when, and from which device" back right={<IconButton label="Export audit log" icon={<Download size={18} color={p.accentText} />} onPress={() => void exportLog()} />}
      header={<><SearchBar value={text} onChange={setText} onSearch={setQ} placeholder="Action, person, record or IP" /><Chips value={severity} onChange={setSeverity} options={['all', 'info', 'notice', 'warning', 'critical'].map((x) => ({ value: x, label: x === 'all' ? 'All' : x[0].toUpperCase() + x.slice(1) }))} />{list.loading ? <ListSkeleton avatar={false} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}</>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing} onRefresh={list.refresh} onEndReached={list.loadMore}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<FileClock size={44} color={p.tertiary} />} title="No activity found" message="Try a different search or severity." /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="events" />}
      renderItem={({ item, index }) => <GroupedItem index={index} count={list.items.length} inset={58}><Row icon={<IconTile tone={item.severity === 'critical' || item.severity === 'warning' ? 'red' : 'gray'} icon={item.severity === 'critical' ? <ShieldAlert size={17} color={p.red} /> : <FileClock size={17} color={p.secondary} />} />} title={humanizeAction(item.action)} subtitle={`${item.userName || 'System'} · ${formatDateTime(item.timestamp)}`} accessory={<Badge text={item.severity || 'info'} />} onPress={() => setSelected(item)} /></GroupedItem>}
    />
    <Sheet visible={!!selected} onClose={() => setSelected(null)} title="Activity details" full>
      {selected ? <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
        <View style={{ gap: 6 }}><Badge text={selected.severity || 'info'} /><T variant="title2">{humanizeAction(selected.action)}</T><T variant="footnote" color="secondary">Immutable audit event · {selected.id}</T></View>
        <Section header="Event"><InfoRow label="Time" value={formatDateTime(selected.timestamp)} /><InfoRow label="User" value={selected.userName} /><InfoRow label="Role" value={selected.userRole} /><InfoRow label="Category" value={selected.category} /><InfoRow label="Record" value={[selected.entity, selected.entityCustomId || selected.entityId].filter(Boolean).join(' · ')} /></Section>
        <Section header="Security context"><InfoRow label="IP address" value={selected.ipAddress} /><InfoRow label="Device" value={(selected as any).device || selected.userAgent} multiline /><InfoRow label="Request ID" value={selected.requestId} /></Section>
        {selected.changes && Object.keys(selected.changes).length ? <Section header="Changes">{Object.entries(selected.changes).map(([key, change]) => <InfoRow key={key} label={key} value={`${shown(change.from)} → ${shown(change.to)}`} multiline />)}</Section> : null}
        {selected.details && Object.keys(selected.details).length ? <Section header="Details">{Object.entries(selected.details).map(([key, value]) => <InfoRow key={key} label={key} value={shown(value)} multiline />)}</Section> : null}
      </ScrollView> : null}
    </Sheet>
  </>;
}

const shown = (value: unknown) => value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
