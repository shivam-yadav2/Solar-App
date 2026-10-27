import React from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Zap } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { field } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { formatDate } from '../../../src/lib/formatters';
import { Card, ErrorState, IconTile, InfoRow, ListSkeleton, Progress, Row, Screen, Section, space, T, Tap, useTheme, radius } from '../../../src/ds';

function Photo({ fileId }: { fileId: string }) {
  const p = useTheme();
  const url = useQuery({ queryKey: ['file-url', fileId], queryFn: () => api.getFileUrl(fileId), staleTime: 30 * 60_000 });
  return (
    <Tap onPress={() => url.data && Linking.openURL(url.data)} scaleTo={0.97}>
      <Image source={url.data ? { uri: url.data } : undefined} style={{ width: 150, height: 150, borderRadius: radius.m, backgroundColor: p.fill }} />
    </Tap>
  );
}

export default function DprDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const q = useApi(['dpr', 'detail', id], () => field.report(id!), { enabled: !!id });
  const r = q.data?.report;
  const bars = r ? [['Structure & mounting', r.structureMountingProgressPct], ['Panels installed', r.panelInstallationProgressPct], ['Wiring & inverter', r.wiringInverterProgressPct]] as [string, number][] : [];
  return (
    <Screen title="Site report" large={false} back refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !r ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <Section>
            <Row icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={r.projectName || 'Project'} subtitle={`${formatDate(r.reportDate)} · ${r.laborCountOnSite} people on site`} onPress={() => router.push({ pathname: '/project/[id]', params: { id: r.projectId } })} />
          </Section>
          <Card style={{ gap: space.m }}>
            {bars.map(([label, v]) => (
              <View key={label} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T variant="subhead">{label}</T><T variant="subhead" num weight="600">{v}%</T></View>
                <Progress value={Number(v) / 100} tone={Number(v) >= 100 ? 'green' : 'accent'} />
              </View>
            ))}
          </Card>
          <Section header="Work">
            <InfoRow label="Done today" value={r.workCompletedToday} multiline />
            {r.blockersOrDelays ? <InfoRow label="Problems" value={<T variant="body" color="red">{r.blockersOrDelays}</T>} multiline /> : null}
            {r.weatherConditions ? <InfoRow label="Weather" value={r.weatherConditions} /> : null}
          </Section>
          {(r.sitePhotos || []).length ? (
            <View style={{ gap: 6 }}>
              <T variant="footnote" color="secondary" style={{ paddingHorizontal: space.l, textTransform: 'uppercase' }}>Photos</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>{r.sitePhotos.map((f: string) => <Photo key={f} fileId={f} />)}</ScrollView>
            </View>
          ) : null}
          {r.gpsLatitude ? (
            <Section>
              <Row icon={<IconTile icon={<MapPin size={17} color={p.red} />} tone="red" />} title="Where it was sent from" subtitle={`${Number(r.gpsLatitude).toFixed(5)}, ${Number(r.gpsLongitude).toFixed(5)}`} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${r.gpsLatitude},${r.gpsLongitude}`)} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
