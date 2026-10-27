import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { discom } from '../../src/lib/apis/ops';
import { useApi } from '../../src/lib/query';
import { timeAgo } from '../../src/lib/formatters';
import { Badge, EmptyState, ErrorState, GroupedItem, IconTile, ListScreen, ListSkeleton, Progress, space, T, Tap, useTheme, radius, elevation } from '../../src/ds';

/** Net-metering and subsidy approvals across projects; blocked ones first. */
export default function DiscomScreen() {
  const router = useRouter();
  const p = useTheme();
  const q = useApi(['discom', 'overview'], discom.overview);
  const rows = q.data?.projects || [];
  const blocked = rows.filter((r) => r.blockedStage).length;
  const done = rows.filter((r) => r.approved >= r.total).length;
  return (
    <ListScreen<(typeof rows)[number]>
      title="DISCOM & subsidy" back large={false}
      header={<>
        {rows.length ? (
          <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row' }, elevation(p, 1)]}>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">In progress</T><T variant="title2" num>{rows.length - done}</T></View>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Stuck</T><T variant="title2" num color={blocked ? 'red' : 'label'}>{blocked}</T></View>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Subsidy paid</T><T variant="title2" num color="green">{done}</T></View>
          </View>
        ) : null}
        {q.loading ? <ListSkeleton avatar={false} /> : q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : null}
      </>}
      data={q.loading ? [] : rows}
      keyExtractor={(r) => r.projectId}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      ListEmptyComponent={!q.loading ? <EmptyState icon={<Zap size={44} color={p.tertiary} />} title="No projects yet" /> : null}
      renderItem={({ item: r, index }) => (
        <GroupedItem index={index} count={rows.length} inset={58}>
          <Tap onPress={() => router.push({ pathname: '/project/[id]', params: { id: r.projectId, tab: 'discom' } })} scaleTo={0.985} style={{ flexDirection: 'row', gap: space.m, paddingHorizontal: space.l, paddingVertical: 12 }}>
            <IconTile icon={<Zap size={17} color={r.blockedStage ? p.red : p.orange} />} tone={r.blockedStage ? 'red' : 'orange'} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
                <T variant="headline" style={{ flex: 1 }} numberOfLines={1}>{r.projectName}</T>
                <T variant="footnote" num color="secondary">{r.approved}/{r.total}</T>
              </View>
              <T variant="footnote" color={r.blockedStage ? 'red' : 'secondary'} numberOfLines={2}>
                {r.blockedStage ? `${r.blockedStatus}: ${r.blockedStage}` : r.latestStage ? `${r.latestStatus} · ${r.latestStage} · ${timeAgo(r.latestAt)}` : 'Not started'}
              </T>
              <Progress value={r.approved / r.total} tone={r.approved >= r.total ? 'green' : r.blockedStage ? 'red' : 'accent'} height={4} />
            </View>
            {!r.started ? <Badge text="New" tone="gray" /> : null}
          </Tap>
        </GroupedItem>
      )}
    />
  );
}
