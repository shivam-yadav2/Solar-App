import React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Database, ReceiptText } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { account } from '../../src/lib/apis/account';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, IconTile, InfoRow, Row, Screen, Section, Spinner, StatGrid, StatTile, T, useTheme } from '../../src/ds';

const bytes = (n?: number | null) => {
  if (!n) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};

export default function BillingScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId?: string }>();
  const p = useTheme();
  const state = useFetch(async () => {
    const core = tenantId ? await api.getTenantBilling(String(tenantId)) : await api.getBilling();
    if (tenantId) return { core, publicInvoices: [] as any[], storage: null as any };
    const [invoiceData, storage] = await Promise.all([
      account.billingInvoices().catch(() => ({ invoices: [] })),
      account.storageUsage().catch(() => null),
    ]);
    return { core, publicInvoices: invoiceData.invoices, storage };
  }, [tenantId]);
  const core: any = state.data?.core || {};
  const sub = core.subscription;
  const invoices = state.data?.publicInvoices?.length ? state.data.publicInvoices : (core.invoices || []);
  const meters = core.meters || [];
  const storage = state.data?.storage;
  return <Screen title="Plan & billing" subtitle="Subscription, usage limits and SolarOS invoices" back refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      {sub ? <>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}><T variant="title3">{sub.planTier || sub.planName || 'SolarOS plan'}</T><T variant="footnote" color="secondary">{formatINR(sub.unitAmount ?? sub.pricePerMonth)} per {sub.billingInterval || sub.billingCycle || 'month'}</T></View>
            <Badge text={sub.status || 'active'} />
          </View>
        </Card>
        <Section header="Current period"><InfoRow label="Starts" value={formatDate(sub.currentPeriodStart)} /><InfoRow label="Renews / ends" value={formatDate(sub.currentPeriodEnd)} /><InfoRow label="Auto renew" value={sub.cancelAtPeriodEnd || sub.autoRenew === false ? 'Off' : 'On'} /></Section>
      </> : <EmptyState title="No gateway subscription" message="This workspace does not have a subscription record yet." />}
      {storage ? <>
        <StatGrid><StatTile label="Storage used" value={storage.usedBytes / 1024 / 1024} suffix=" MB" tone="blue" /><StatTile label="Files" value={storage.files} tone="purple" /></StatGrid>
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Database size={18} color={p.blue} /><T variant="headline">Document storage</T></View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: p.fill, overflow: 'hidden' }}><View style={{ height: 8, backgroundColor: p.blue, width: `${storage.limitBytes ? Math.min(100, storage.usedBytes / storage.limitBytes * 100) : 5}%` }} /></View>
          <T variant="footnote" color="secondary">{bytes(storage.usedBytes)} of {storage.limitBytes ? bytes(storage.limitBytes) : 'unlimited storage'}</T>
        </Card>
      </> : null}
      {meters.length ? <Section header="Usage limits">{meters.map((item: any) => <View key={item.id || item.metricKey} style={{ padding: 16, gap: 7 }}><View style={{ flexDirection: 'row' }}><T variant="body" style={{ flex: 1 }}>{String(item.metricKey).replaceAll('_', ' ')}</T><T variant="body" num weight="600">{item.currentValue} / {item.maxLimit}</T></View><View style={{ height: 7, borderRadius: 4, backgroundColor: p.fill, overflow: 'hidden' }}><View style={{ height: 7, backgroundColor: item.currentValue >= item.maxLimit ? p.red : p.accent, width: `${Math.min(100, item.maxLimit ? item.currentValue / item.maxLimit * 100 : 0)}%` }} /></View></View>)}</Section> : null}
      <Section header="SolarOS invoices">
        {!invoices.length ? <View style={{ padding: 16 }}><T variant="body" color="secondary">No subscription invoices yet.</T></View> : invoices.map((item: any) => <Row key={item.id} icon={<IconTile tone="accent" icon={<ReceiptText size={17} color={p.accentText} />} />} title={item.invoiceNumber} subtitle={`${formatDate(item.issueDate || item.billingDate)} · Due ${formatDate(item.dueDate || item.periodEnd)}`} value={formatINR(item.total ?? item.amountDue)} accessory={<Badge text={item.status} />} onPress={item.publicToken ? () => void Linking.openURL(account.invoicePageUrl(item.publicToken)) : undefined} />)}
      </Section>
      <T variant="footnote" color="secondary" align="center">Billing records are read-only in the mobile app. Contact SolarOS support for plan changes or billing corrections.</T>
    </>}
  </Screen>;
}
