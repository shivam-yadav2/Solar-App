import React from 'react';
import { Alert, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Wallet } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useApi } from '../../src/lib/query';
import { formatINR } from '../../src/lib/formatters';
import { Badge, EmptyState, ErrorState, GroupedItem, IconButton, ListScreen, ListSkeleton, Row, T, useOverlay, useTheme } from '../../src/ds';
import type { Plan } from '../../src/types';

export default function PlansScreen() {
  const router = useRouter();
  const p = useTheme();
  const { actions, toast } = useOverlay();
  const q = useApi(['plans', 'all'], api.getPlans);
  const items: (Plan & { tenantCount?: number })[] = q.data?.plans || [];
  const remove = (x: Plan) => {
    const run = async () => { try { await api.deletePlan(x.id); toast('Plan deleted'); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); } };
    if (Platform.OS === 'web') return void run();
    Alert.alert(`Delete ${x.name}?`, 'Companies on this plan keep their current limits.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void run() }]);
  };
  return (
    <ListScreen<Plan & { tenantCount?: number }>
      title="Plans" back large={false}
      right={<IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New plan" onPress={() => router.push('/plan-form')} />}
      header={q.loading ? <ListSkeleton avatar={false} /> : q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : null}
      data={q.loading || q.error ? [] : items}
      keyExtractor={(x) => x.id}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      ListEmptyComponent={!q.loading ? <EmptyState icon={<Wallet size={44} color={p.tertiary} />} title="No plans" action={{ title: 'New plan', onPress: () => router.push('/plan-form') }} /> : null}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={items.length}>
          <Row title={x.name}
            subtitle={`${x.maxProjectsLimit} projects · ${x.maxUsersLimit} users · ${x.trialDays} trial days · ${x.tenantCount ?? 0} companies`}
            accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}><T variant="subhead" num weight="600">{formatINR(x.pricePerMonth)}<T variant="footnote" color="secondary">/{x.billingCycle === 'yearly' ? 'yr' : 'mo'}</T></T>{!x.isActive ? <Badge text="Inactive" tone="gray" /> : null}</View>}
            onPress={() => router.push({ pathname: '/plan-form', params: { id: x.id } })}
            onLongPress={!(x.tenantCount ?? 0) ? () => actions({ title: x.name, items: [{ label: 'Delete plan', destructive: true, onPress: () => remove(x) }] }) : undefined} />
        </GroupedItem>
      )}
    />
  );
}
